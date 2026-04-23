/**
 * Client-side signature that mirrors lib/battle/ticket.ts signResult().
 *
 * Algorithm (server and client identical):
 *   canonical = ticket + "|" + won("0"|"1") + "|" + turns + "|" +
 *               playerHp + "|" + enemyHp + "|" + sorted(plays).join(",")
 *   key       = SHA-256(ticket)
 *   signature = HMAC-SHA256(canonical, key)  → base64url
 *
 * The ticket itself is HMAC'd server-side with NEXTAUTH_SECRET — so forging
 * a ticket needs the secret. Once issued, the signature algorithm is known
 * to both sides. This isn't cryptographically unforgeable (any attacker
 * reading the JS can replicate), but it stops naive "POST { won: true }"
 * attacks and forces cheat tools to implement the canonicalisation, which
 * we can rotate to invalidate tools.
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

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signBattleResult(p: ResultPayload): Promise<string> {
  const enc = new TextEncoder();
  // key = SHA-256(ticket)
  const keyBuf = await crypto.subtle.digest("SHA-256", enc.encode(p.ticket));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(canonicalise(p)),
  );
  return b64url(new Uint8Array(sig));
}
