"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { t } from "@/lib/i18n";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

// i18n is scaffolded for when translations are complete; for now everything
// uses the zh locale and the language toggle is hidden from the UI.
const LOCALE = "zh" as const;

const VOLUME_KEY = "chronicles.volume";
const MUTED_KEY = "chronicles.muted";
const BGM_ENABLED_KEY = "chronicles.bgm_enabled";

interface Props {
  user: {
    id: string;
    username: string;
    email: string;
    isGuest: boolean;
    createdAt: string;
  };
}

export function SettingsClient({ user }: Props) {
  const { push } = useToast();
  const locale = LOCALE;
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    if (!isNaN(v) && v >= 0 && v <= 100) setVolume(v);
    setMuted(localStorage.getItem(MUTED_KEY) === "1");
    const e = localStorage.getItem(BGM_ENABLED_KEY);
    setBgmEnabled(e === null ? true : e === "1");
  }, []);

  const onVolumeChange = (v: number) => {
    setVolume(v);
    localStorage.setItem(VOLUME_KEY, String(v));
    window.dispatchEvent(new CustomEvent("chronicles:volume", { detail: { volume: v } }));
  };

  const onMutedChange = (m: boolean) => {
    setMuted(m);
    localStorage.setItem(MUTED_KEY, m ? "1" : "0");
    window.dispatchEvent(new CustomEvent("chronicles:muted", { detail: { muted: m } }));
  };

  const onBgmChange = (enabled: boolean) => {
    setBgmEnabled(enabled);
    localStorage.setItem(BGM_ENABLED_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent("chronicles:bgm", { detail: { enabled } }));
  };

  const onClearLocal = () => {
    if (!confirm(t("settings.clearConfirm", locale))) return;
    const keys = [
      VOLUME_KEY,
      MUTED_KEY,
      BGM_ENABLED_KEY,
      "chronicles.locale",
      "chronicles.deviceId",
    ];
    for (const k of keys) localStorage.removeItem(k);
    push("本機資料已清除", "success");
    setVolume(70);
    setMuted(false);
    setBgmEnabled(true);
  };

  const onBind = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBinding(true);
    const data = new FormData(e.currentTarget);
    const r = await fetch("/api/bind-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: data.get("username"),
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    const body = await r.json().catch(() => ({}));
    setBinding(false);
    if (!r.ok) {
      push(body?.error ?? "綁定失敗", "danger");
      return;
    }
    push("帳號綁定成功,請重新登入", "success");
    setTimeout(() => signOut({ callbackUrl: "/login" }), 1200);
  };

  return (
    <div className="space-y-6">
      {/* Account */}
      <section className="rounded-xl border border-parchment/10 bg-veil/40 p-5">
        <h2 className="text-xs text-parchment/50 tracking-widest mb-3 font-[family-name:var(--font-cinzel)]">
          {t("settings.account", locale)}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="使用者名稱" value={user.username} />
          <Info label="Email" value={user.isGuest ? "—" : user.email} />
          <Info
            label="類型"
            value={user.isGuest ? t("settings.guest", locale) : "正式帳號"}
            tint={user.isGuest ? "text-warning" : "text-success"}
          />
          <Info
            label="建立於"
            value={user.createdAt.slice(0, 10)}
          />
        </div>
      </section>

      {/* Bind (guest only) */}
      {user.isGuest && (
        <section className="rounded-xl border border-gold/40 bg-gold/5 p-5">
          <h2 className="display-serif text-lg text-sacred mb-1">
            {t("settings.bindAccount", locale)}
          </h2>
          <p className="text-xs text-parchment/60 mb-4">
            {t("settings.bindHint", locale)}
          </p>
          <form onSubmit={onBind} className="space-y-3">
            <Input name="username" placeholder="使用者名稱" required minLength={2} maxLength={16} />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="密碼(至少 8 字)" required minLength={8} />
            <Button type="submit" variant="primary" size="md" className="w-full" disabled={binding}>
              {binding ? "綁定中…" : "綁定帳號"}
            </Button>
          </form>
        </section>
      )}

      {/* Audio */}
      <section className="rounded-xl border border-parchment/10 bg-veil/40 p-5">
        <h2 className="text-xs text-parchment/50 tracking-widest mb-3 font-[family-name:var(--font-cinzel)]">
          音訊
        </h2>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-parchment">
            {t("settings.volume", locale)}
          </label>
          <span className="font-[family-name:var(--font-mono)] text-parchment/70 text-sm tabular-nums w-12 text-right">
            {muted ? "靜音" : `${volume}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-full accent-gold"
          disabled={muted}
        />
        <label className="flex items-center gap-2 mt-4 text-sm text-parchment/70 cursor-pointer">
          <input
            type="checkbox"
            checked={muted}
            onChange={(e) => onMutedChange(e.target.checked)}
            className="accent-gold"
          />
          全部靜音
        </label>
        <label className="flex items-center gap-2 mt-2 text-sm text-parchment/70 cursor-pointer">
          <input
            type="checkbox"
            checked={bgmEnabled}
            onChange={(e) => onBgmChange(e.target.checked)}
            className="accent-gold"
          />
          播放背景音樂(BGM)
        </label>
        <p className="text-[11px] text-parchment/40 mt-3">
          進入時代會自動切換不同 BGM,首次互動後(點一下任意處)自動啟動。
        </p>
      </section>

      {/* Tutorial replay — lets returning players brush up on the basics
          without resetting any progress (the API endpoint is idempotent). */}
      <section className="rounded-xl border border-parchment/10 bg-veil/40 p-5">
        <h2 className="text-xs text-parchment/50 tracking-widest mb-3 font-[family-name:var(--font-cinzel)]">
          教學
        </h2>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-parchment mb-1">重看新手教學</div>
            <p className="text-[11px] text-parchment/50 leading-relaxed">
              重新體驗一場練習戰 — 不會影響任何資源、進度或既有獎勵。
            </p>
          </div>
          <Link
            href="/welcome/tutorial?replay=1"
            className="shrink-0 px-4 py-2 rounded-lg border border-gold/50 text-gold hover:bg-gold/10 text-xs tracking-widest min-h-[36px] flex items-center"
          >
            🎓 重看
          </Link>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-blood/30 bg-blood/5 p-5 space-y-3">
        <h2 className="text-xs text-blood/80 tracking-widest mb-3 font-[family-name:var(--font-cinzel)]">
          危險區
        </h2>
        <Button
          variant="ghost"
          size="md"
          className="w-full"
          onClick={onClearLocal}
        >
          {t("settings.clearLocal", locale)}
        </Button>
        <Button
          variant="danger"
          size="md"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          {t("settings.logout", locale)}
        </Button>
      </section>
    </div>
  );
}

function Info({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div>
      <div className="text-[10px] text-parchment/50 tracking-wider">{label}</div>
      <div className={`text-sm ${tint ?? "text-parchment"}`}>{value}</div>
    </div>
  );
}
