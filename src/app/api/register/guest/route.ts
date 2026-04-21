import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({ email, password }, { status: 201 });
}
