import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{2,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Bind a guest user to a real email / password / username.
 * Only available to users with isGuest=true.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, email, password } = (body as Record<string, unknown>) ?? {};

  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "使用者名稱需 2-16 字" },
      { status: 400 },
    );
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email 格式錯誤" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "密碼至少 6 字" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!me.isGuest) {
    return NextResponse.json(
      { error: "帳號已綁定" },
      { status: 409 },
    );
  }

  const conflict = await prisma.user.findFirst({
    where: {
      id: { not: me.id },
      OR: [{ email: normalizedEmail }, { username }],
    },
  });
  if (conflict) {
    return NextResponse.json(
      {
        error:
          conflict.email === normalizedEmail
            ? "Email 已被使用"
            : "使用者名稱已被使用",
      },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: me.id },
    data: {
      username,
      email: normalizedEmail,
      passwordHash,
      isGuest: false,
    },
  });

  return NextResponse.json({ ok: true });
}
