"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { useState } from "react";

interface RunSummary {
  currentLevel: number;
  highestLevel: number;
  totalClears: number;
  towerTokens: number;
  floorsPerWing: number;
}

interface NextFloor {
  floor: number;
  tierLabel: string;
  enemyName: string;
  eraName: string;
  eraEmoji: string;
  eraTint: string;
  enemyHp: number;
  isWingBoss: boolean;
  modBadges: { label: string; tint: string }[];
  reward: {
    essence: number;
    towerTokens: number;
    crystals: number;
    firstClearEssence: number;
  };
}

const TINT_CLS: Record<string, string> = {
  info: "border-info/40 text-info",
  gold: "border-gold/40 text-gold",
  danger: "border-blood/40 text-blood",
};

export function TowerHubClient({
  run,
  nextFloor,
}: {
  run: RunSummary;
  nextFloor: NextFloor;
}) {
  const { push } = useToast();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [busy, setBusy] = useState(false);

  // Wing progress: floors cleared within the current wing.
  const inWing = run.currentLevel % run.floorsPerWing;
  const wingProgress = run.currentLevel > 0 ? inWing : 0;
  const isFirstClear = nextFloor.floor > run.highestLevel;

  const onAbandon = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/dungeon/tower/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await r.json();
      if (!r.ok || !body?.ok) {
        push(body?.error ?? "撤離失敗", "danger");
      } else {
        push("已撤離塔樓 — 紀錄保留", "success");
        // Reload so SSR picks up the reset state.
        window.location.reload();
      }
    } catch {
      push("撤離失敗(無連線)", "danger");
    } finally {
      setBusy(false);
      setConfirmAbandon(false);
    }
  };

  return (
    <>
      {/* Run state card */}
      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-veil/80 to-[#180826]/80 p-6 mb-6 backdrop-blur">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-parchment/60 tracking-widest font-[family-name:var(--font-cinzel)]">
            目前層數
          </span>
          <span className="text-xs text-parchment/40 tracking-wide tabular-nums">
            最高 {run.highestLevel} 層 · 累計通過 {run.totalClears} 次
          </span>
        </div>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="display-serif text-5xl text-gold tabular-nums leading-none">
            {run.currentLevel}
          </span>
          <span className="text-parchment/50 text-sm">/ ∞</span>
        </div>

        {/* Wing progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {Array.from({ length: run.floorsPerWing }).map((_, i) => {
            const filled = i < wingProgress;
            return (
              <span
                key={i}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  filled
                    ? "bg-gradient-to-r from-gold/70 to-gold"
                    : "bg-parchment/15"
                }`}
              />
            );
          })}
          <span className="ml-2 text-[10px] text-parchment/40 tracking-widest tabular-nums">
            {wingProgress}/{run.floorsPerWing}
          </span>
        </div>

        {run.towerTokens > 0 && (
          <div className="text-[11px] text-gold/80 tracking-wide">
            🪙 持有塔幣 ×{run.towerTokens}
          </div>
        )}
      </section>

      {/* Next floor preview */}
      <h3 className="display-serif text-xs text-parchment/60 tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-cinzel)]">
        下一層預告
      </h3>
      <section
        className={`rounded-2xl border-2 p-5 mb-6 backdrop-blur relative overflow-hidden ${
          nextFloor.isWingBoss
            ? "border-blood/50 bg-blood/10"
            : "border-parchment/15 bg-veil/40"
        }`}
        style={{
          background: nextFloor.isWingBoss
            ? `linear-gradient(135deg, ${nextFloor.eraTint}22, transparent 60%), rgba(190,40,40,0.08)`
            : `linear-gradient(135deg, ${nextFloor.eraTint}18, transparent 60%)`,
        }}
      >
        <div className="flex items-start gap-4 mb-4">
          <span className="text-3xl shrink-0" aria-hidden>
            {nextFloor.eraEmoji}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span
                className={`text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-cinzel)] ${
                  nextFloor.isWingBoss ? "text-blood" : "text-parchment/60"
                }`}
              >
                第 {nextFloor.floor} 層 · {nextFloor.tierLabel}
              </span>
              {isFirstClear && (
                <span className="text-[10px] text-gold tracking-widest font-bold">
                  🌟 首通
                </span>
              )}
            </div>
            <div className="display-serif text-xl text-parchment truncate">
              {nextFloor.enemyName}
            </div>
            <div className="text-[11px] text-parchment/50 mt-0.5 tabular-nums">
              {nextFloor.eraName} · 信徒 {nextFloor.enemyHp}
            </div>
          </div>
        </div>

        {nextFloor.modBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {nextFloor.modBadges.map((b, i) => (
              <span
                key={i}
                className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded border bg-black/30 backdrop-blur ${
                  TINT_CLS[b.tint] ?? TINT_CLS.gold
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-lg bg-black/30 border border-parchment/10 px-3 py-2 mb-4">
          <div className="text-[10px] text-parchment/50 tracking-widest mb-1.5">
            獎勵
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <RewardChip emoji="🌟" value={nextFloor.reward.essence} label="精華" />
            {nextFloor.reward.towerTokens > 0 && (
              <RewardChip
                emoji="🪙"
                value={nextFloor.reward.towerTokens}
                label="塔幣"
                highlight
              />
            )}
            <RewardChip emoji="💎" value={nextFloor.reward.crystals} label="水晶" />
            {isFirstClear && (
              <RewardChip
                emoji="✨"
                value={nextFloor.reward.firstClearEssence}
                label="首通額外精華"
                highlight
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => setConfirmAbandon(true)}
            disabled={run.currentLevel === 0 || busy}
            className="text-[11px] text-parchment/50 hover:text-parchment/80 tracking-widest min-h-[40px] px-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            撤離塔樓
          </button>
          <Link
            href={`/dungeon/tower/battle/${nextFloor.floor}`}
            className="px-5 py-2.5 rounded-lg bg-gold text-veil font-semibold text-sm shadow-[0_4px_14px_rgba(212,168,75,0.4)] min-h-[44px] flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
          >
            ⚔️ 開始戰鬥 →
          </Link>
        </div>
      </section>

      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="撤離塔樓?"
        className="max-w-xs"
      >
        <p className="text-parchment/70 text-sm mb-4 leading-relaxed">
          目前層數會歸零,下次進入從第 1 層開始。最高紀錄
          {" "}
          <span className="text-gold tabular-nums">{run.highestLevel}</span>
          {" "}
          層與已獲得的素材會保留。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmAbandon(false)} disabled={busy}>
            取消
          </Button>
          <Button variant="danger" size="sm" onClick={onAbandon} disabled={busy}>
            {busy ? "撤離中…" : "確認撤離"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function RewardChip({
  emoji,
  value,
  label,
  highlight,
}: {
  emoji: string;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${
        highlight ? "text-gold" : "text-parchment/85"
      }`}
      title={label}
    >
      <span aria-hidden className="text-sm leading-none">
        {emoji}
      </span>
      <span className="font-[family-name:var(--font-mono)] tabular-nums">
        +{value}
      </span>
      <span className="text-[10px] text-parchment/50">{label}</span>
    </div>
  );
}
