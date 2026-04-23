import crypto from "crypto";

/**
 * Battle session ticket — HMAC-signed token that proves the bearer actually
 * loaded /battle/[stageId] as the named user. Required on /api/battle/complete
 * so a client can't POST arbitrary `won: true` without first having the server
 * render the battle page for them.
 *
 * Token format: base64url({ userId, stageId, exp }).base64url(sig)
 * Signature: HMAC-SHA256(payload, NEXTAUTH_SECRET)
 * TTL: 30 minutes from issuance.
 */

// 2 hours gives plenty of slack for players who pause mid-battle or go
// grab a drink — still short enough that leaked tickets aren't long-lived.
const TTL_MS = 2 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET missing — cannot sign battle ticket");
  return s;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4);
  const padded = pad < 4 ? s + "=".repeat(pad) : s;
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export interface BattleTicket {
  userId: string;
  stageId: string;
  exp: number; // epoch ms
}

export function signTicket(userId: string, stageId: string): string {
  const payload: BattleTicket = {
    userId,
    stageId,
    exp: Date.now() + TTL_MS,
  };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(
    crypto.createHmac("sha256", getSecret()).update(payloadB64).digest(),
  );
  return `${payloadB64}.${sig}`;
}

export function verifyTicket(
  token: string,
  expect: { userId: string; stageId: string },
): { ok: true; exp: number } | { ok: false; error: string } {
  if (!token || typeof token !== "string") {
    return { ok: false, error: "ticket missing" };
  }
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "ticket malformed" };
  const [payloadB64, sig] = parts;

  // Verify signature first (constant-time where possible).
  const expected = b64url(
    crypto.createHmac("sha256", getSecret()).update(payloadB64).digest(),
  );
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return { ok: false, error: "ticket signature invalid" };
  }

  let payload: BattleTicket;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as BattleTicket;
  } catch {
    return { ok: false, error: "ticket payload unreadable" };
  }
  if (payload.userId !== expect.userId) {
    return { ok: false, error: "ticket user mismatch" };
  }
  if (payload.stageId !== expect.stageId) {
    return { ok: false, error: "ticket stage mismatch" };
  }
  if (payload.exp < Date.now()) {
    return { ok: false, error: "ticket expired" };
  }
  return { ok: true, exp: payload.exp };
}

/**
 * Derive a stable "result signature" over the battle outcome. Client and
 * server must agree on the exact canonical string so tampering with any
 * reported field (won / turns / HP / plays) breaks the signature.
 *
 * Server stores only NEXTAUTH_SECRET + the original ticket's payload, both
 * tied to a single battle session. Key = HMAC(ticket, SECRET) — derived so
 * two parallel battles can't share a signature.
 */
interface ResultPayload {
  ticket: string;
  won: boolean;
  turnsElapsed: number;
  playerHpEnd: number;
  enemyHpEnd: number;
  playerPlays: string[];
}

function canonicalise(p: ResultPayload): string {
  // Sort plays for order-independence (the server already treats the list
  // as a multiset for mission progress), and round numerics to integers so
  // floating-point serialisation quirks don't break the signature.
  const plays = [...p.playerPlays].sort().join(",");
  return [
    p.ticket,
    p.won ? "1" : "0",
    Math.floor(p.turnsElapsed),
    Math.floor(p.playerHpEnd),
    Math.floor(p.enemyHpEnd),
    plays,
  ].join("|");
}

// Key derivation uses plain SHA-256 of the ticket so the browser can mirror
// it with SubtleCrypto (which has no HMAC-with-secret shortcut on the
// client without the actual secret). The ticket itself already carries a
// SECRET-bound signature — the result signature is a speed-bump that
// forces attackers to implement the algorithm, not a cryptographic
// guarantee against someone who can open DevTools.
function derivedKey(ticket: string): Buffer {
  return crypto.createHash("sha256").update(ticket).digest();
}

export function signResult(p: ResultPayload): string {
  const key = derivedKey(p.ticket);
  return b64url(crypto.createHmac("sha256", key).update(canonicalise(p)).digest());
}

export function verifyResult(p: ResultPayload, sig: string): boolean {
  if (!sig || typeof sig !== "string") return false;
  const expected = signResult(p);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
