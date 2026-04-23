import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { csrfGate } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { takeBurst } from "@/lib/rate-limit";

const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{2,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_MIN = 8;

// Strip zero-width, RTL-override, and similar invisible / bidi-trick
// characters before username pattern validation. Prevents spoofing users
// with visually-identical names in the admin table / leaderboards.
const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;
function sanitizeUsername(raw: string): string {
  return raw.normalize("NFKC").replace(INVISIBLE_RE, "").trim();
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "anon"
  );
}

export async function POST(req: Request) {
  const csrf = csrfGate(req);
  if (csrf) return csrf;

  // Per-IP rate limit: max 5 registrations / hour to slow mass sign-ups.
  const ip = clientIp(req);
  if (!takeBurst(`register:${ip}`, 60 * 60 * 1000, 5)) {
    return NextResponse.json(
      { error: "註冊次數過多,請稍後再試" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username: rawUsername, email, password } = (body as Record<string, unknown>) ?? {};

  if (typeof rawUsername !== "string") {
    return NextResponse.json(
      { error: "使用者名稱需 2-16 字(中/英/數字/底線)" },
      { status: 400 },
    );
  }
  const username = sanitizeUsername(rawUsername);
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "使用者名稱需 2-16 字(中/英/數字/底線)" },
      { status: 400 },
    );
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email 格式錯誤" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < PW_MIN) {
    return NextResponse.json(
      { error: `密碼至少 ${PW_MIN} 字元` },
      { status: 400 },
    );
  }
  // Reject common leaked passwords (top-10 offenders) so attackers can't
  // spray-register accounts with "12345678" type inputs.
  const TRIVIAL = new Set([
    "12345678",
    "password",
    "qwerty123",
    "11111111",
    "00000000",
    "abcdefgh",
    "password1",
    "1234567890",
  ]);
  if (TRIVIAL.has(password.toLowerCase())) {
    return NextResponse.json(
      { error: "此密碼太常見,請換一組" },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username }],
    },
  });
  if (existing) {
    // Enumeration-resistant: don't disclose WHICH field is taken — returning
    // specific errors lets attackers probe whether an email/username exists.
    return NextResponse.json(
      { error: "使用者名稱或 Email 已被使用" },
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
