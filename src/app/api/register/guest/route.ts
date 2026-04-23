import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { csrfGate } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { takeBurst } from "@/lib/rate-limit";

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "anon"
  );
}

/**
 * Guest registration / login.
 * Accepts { deviceId }, returns { email, password } for Credentials sign-in.
 *
 * - If deviceId already maps to a guest user → return existing credentials
 * - Otherwise create a new guest user
 *
 * Clients should persist deviceId in localStorage so the same user
 * is returned on subsequent calls from the same browser.
 */
export async function POST(req: Request) {
  const csrf = csrfGate(req);
  if (csrf) return csrf;

  // Per-IP rate limit: 10 new guest accounts / hour (existing-device
  // lookups still pass through — we allow an unbounded return-visit rate).
  const ip = clientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deviceId } = (body as Record<string, unknown>) ?? {};
  if (typeof deviceId !== "string" || deviceId.length < 16 || deviceId.length > 128) {
    return NextResponse.json(
      { error: "Invalid deviceId" },
      { status: 400 },
    );
  }

  const email = `guest-${deviceId.slice(0, 24)}@guest.local`;
  const password = `device:${deviceId}`;

  const existing = await prisma.user.findUnique({ where: { deviceId } });
  if (existing) {
    return NextResponse.json({ email: existing.email, password }, { status: 200 });
  }

  // Only throttle NEW guest creations.
  if (!takeBurst(`guestReg:${ip}`, 60 * 60 * 1000, 10)) {
    return NextResponse.json(
      { error: "訪客建立太頻繁,請稍後再試" },
      { status: 429 },
    );
  }

  // Generate a unique-ish username
  const suffix = deviceId.slice(0, 6);
  let username = `訪客_${suffix}`;
  let n = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    n++;
    username = `訪客_${suffix}_${n}`;
    if (n > 10) break;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        deviceId,
        isGuest: true,
        title: "無名編織者",
        crystals: 300,
      },
    });
  } catch (err) {
    // Race: another concurrent request for the same deviceId won the
    // insert between our findUnique and create. Fall back to returning
    // the now-existing user.
    const raced = await prisma.user.findUnique({ where: { deviceId } });
    if (raced) {
      return NextResponse.json({ email: raced.email, password }, { status: 200 });
    }
    throw err;
  }

  return NextResponse.json({ email, password }, { status: 201 });
}
