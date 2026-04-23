"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

// Rough password strength heuristic: 0 (empty) → 4 (very strong).
function scorePassword(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
}
const PW_HINT: Record<number, { label: string; tone: string }> = {
  0: { label: "請輸入密碼", tone: "text-parchment/40" },
  1: { label: "太弱 — 試試更長的組合", tone: "text-blood/80" },
  2: { label: "普通 — 可以接受", tone: "text-warning" },
  3: { label: "良好", tone: "text-success/80" },
  4: { label: "非常強", tone: "text-success" },
};

export default function RegisterPage() {
  const router = useRouter();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const pwScore = scorePassword(password);
  const pwHint = PW_HINT[pwScore];
  const confirmMismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) {
      push("兩次密碼不一致", "warning");
      return;
    }
    if (password.length < 8) {
      push("密碼至少 8 字元", "warning");
      return;
    }
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const username = (data.get("username") as string).trim();
    const email = (data.get("email") as string).trim().toLowerCase();

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
              autoComplete="username"
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
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="至少 8 字"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby="pw-hint"
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
            {/* Strength bar */}
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= pwScore
                      ? pwScore <= 1
                        ? "bg-blood/70"
                        : pwScore === 2
                          ? "bg-warning"
                          : "bg-success"
                      : "bg-parchment/10"
                  }`}
                />
              ))}
              <span
                id="pw-hint"
                className={`text-[10px] tracking-wider ${pwHint.tone} shrink-0`}
              >
                {pwHint.label}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-parchment/70 mb-1 tracking-wider">
              再輸入一次密碼
            </label>
            <Input
              name="confirm"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="重複上方密碼以確認"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={confirmMismatch}
              aria-describedby="confirm-hint"
              className={confirmMismatch ? "border-blood/60" : ""}
            />
            <div
              id="confirm-hint"
              className={`mt-1 text-[10px] tracking-wider ${
                confirmMismatch
                  ? "text-blood/80"
                  : confirm.length > 0 && confirm === password
                    ? "text-success/80"
                    : "text-parchment/40"
              }`}
            >
              {confirmMismatch
                ? "兩次輸入不一致"
                : confirm.length > 0 && confirm === password
                  ? "✓ 兩次輸入相同"
                  : "避免打字錯誤,請再輸入一次"}
            </div>
          </div>
          <label className="flex items-start gap-2 text-[11px] text-parchment/60 cursor-pointer">
            <input type="checkbox" required className="accent-gold mt-0.5" />
            <span>
              我已閱讀並同意{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                服務條款
              </Link>{" "}
              與{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline"
              >
                隱私政策
              </Link>
            </span>
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={loading || confirmMismatch || password.length < 8}>
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
