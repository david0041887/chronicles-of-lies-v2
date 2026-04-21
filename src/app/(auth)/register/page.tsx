"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const username = (data.get("username") as string).trim();
    const email = (data.get("email") as string).trim().toLowerCase();
    const password = data.get("password") as string;

    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const body = await r.json().catch(() => ({}));

    if (!r.ok) {
      setLoading(false);
      push(body?.error ?? "註冊失敗", "danger");
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (signInRes?.error) {
      push("註冊成功,但自動登入失敗。請手動登入。", "warning");
      router.push("/login");
      return;
    }
    push("編織者帳號建立完成", "success");
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="block text-center font-[family-name:var(--font-cinzel)] text-gold/70 tracking-[0.35em] text-xs uppercase mb-4"
        >
          Chronicles of Lies
        </Link>
        <h1 className="display-serif text-3xl text-sacred text-center mb-2">註冊</h1>
        <p className="text-parchment/60 text-center mb-8 text-sm">
          新生編織者,寫下你的第一道謊言。
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-parchment/70 mb-1 tracking-wider">
              使用者名稱
            </label>
            <Input
              name="username"
              type="text"
              required
              minLength={2}
              maxLength={16}
              placeholder="中英數字 2-16 字"
            />
          </div>
          <div>
            <label className="block text-xs text-parchment/70 mb-1 tracking-wider">
              Email
            </label>
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-xs text-parchment/70 mb-1 tracking-wider">
              密碼
            </label>
            <Input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="至少 6 字"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "正在編織…" : "加入議會"}
          </Button>
        </form>

        <p className="text-center text-sm text-parchment/60 mt-6">
          已有帳號?{" "}
          <Link href="/login" className="text-gold hover:underline">
            登入
          </Link>
        </p>
      </div>
    </div>
  );
}
