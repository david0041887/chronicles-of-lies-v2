"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/home";
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const email = (data.get("email") as string).trim().toLowerCase();
    const password = data.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      push("帳號或密碼錯誤", "danger");
      return;
    }
    push("召喚成功,歡迎回到帷幕", "success");
    router.push(from);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="block text-center font-[family-name:var(--font-cinzel)] text-gold/70 tracking-[0.35em] text-xs uppercase mb-4"
      >
        Chronicles of Lies
      </Link>
      <h1 className="display-serif text-3xl text-sacred text-center mb-2">登入</h1>
      <p className="text-parchment/60 text-center mb-8 text-sm">
        歡迎回來,編織者。
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete="current-password"
            placeholder="至少 6 字"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "召喚中…" : "進入帷幕"}
        </Button>
      </form>

      <p className="text-center text-sm text-parchment/60 mt-6">
        還沒有帳號?{" "}
        <Link href="/register" className="text-gold hover:underline">
          加入編織者議會
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[90vh] flex items-center justify-center px-6">
      <Suspense fallback={<div className="text-parchment/40">載入中…</div>}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
