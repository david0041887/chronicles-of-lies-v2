import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{2,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, email, password } = (body as Record<string, unknown>) ?? {};

  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "使用者名稱需 2-16 字(中/英/數字/底線)" },
      { status: 400 },
    );
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email 格式錯誤" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "密碼至少 6 字元" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username }],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.email === normalizedEmail ? "Email 已被使用" : "使用者名稱已被使用" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email: normalizedEmail,
      passwordHash,
    },
    select: { id: true, username: true, email: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
