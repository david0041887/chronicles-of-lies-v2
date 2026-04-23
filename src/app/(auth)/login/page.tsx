"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

const DEVICE_ID_KEY = "chronicles.deviceId";

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/home";
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const email = (data.get("email") as string).trim().toLowerCase();
    const password = data.get("password") as string;

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      push("帳號或密碼錯誤", "danger");
      return;
    }
    push("召喚成功,歡迎回到帷幕", "success");
    router.push(from);
    router.refresh();
  }

  async function onGuest() {
    setGuestLoading(true);
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) {
      setGuestLoading(false);
      push("無法建立裝置識別", "danger");
      return;
    }
    const r = await fetch("/api/register/guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    if (!r.ok) {
      setGuestLoading(false);
      push("訪客登入失敗", "danger");
      return;
    }
    const { email, password } = (await r.json()) as {
      email: string;
      password: string;
    };
    const res = await signIn("credentials", { email, password, redirect: false });
    setGuestLoading(false);
    if (res?.error) {
      push("自動登入失敗", "danger");
      return;
    }
    push("歡迎,訪客編織者", "success");
    router.push(from);
    router.refresh();
  }

  const onForgot = () => {
    push("密碼重設功能開發中 — 可聯絡管理員或使用訪客帳號", "info");
  };

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="block text-center font-[family-name:var(--font-cinzel)] text-gold/70 tracking-[0.35em] text-xs uppercase mb-4"
      >
        Chronicles of Lies
      </Link>
      <h1 className="display-serif text-3xl text-sacred text-center mb-2">
        登入
      </h1>
      <p className="text-parchment/60 text-center mb-6 text-sm">
        歡迎回來,編織者。
      </p>

      {/* Quick-start guest entry — highest-friction-kill button. */}
      <Button
        size="lg"
        variant="primary"
        className="w-full"
        onClick={onGuest}
        disabled={loading || guestLoading}
      >
        {guestLoading ? "建立訪客身分中…" : "🎭 訪客直接進入遊戲"}
      </Button>
      <p className="text-center text-[11px] text-parchment/50 mt-2">
        免註冊,進度綁定此裝置,之後可在設定頁綁定正式帳號
      </p>

      <div className="my-5 flex items-center gap-3 text-xs text-parchment/30 tracking-widest">
        <span className="flex-1 h-px bg-parchment/10" />
        或以正式帳號登入
        <span className="flex-1 h-px bg-parchment/10" />
      </div>

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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-parchment/70 tracking-wider">
              密碼
            </label>
            <button
              type="button"
              onClick={onForgot}
              className="text-[11px] text-parchment/50 hover:text-gold tracking-wider"
            >
              忘記密碼?
            </button>
          </div>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="輸入密碼"
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 -translate-y-1/2 right-2 px-2 py-1 text-[10px] text-parchment/60 hover:text-gold tracking-widest"
              aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
            >
              {showPassword ? "隱藏" : "顯示"}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          size="lg"
          variant="ghost"
          className="w-full"
          disabled={loading || guestLoading}
        >
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
