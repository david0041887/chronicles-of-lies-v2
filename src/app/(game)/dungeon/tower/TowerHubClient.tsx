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

interface ShopOffer {
  id: string;
  cost: number;
  title: string;
  desc: string;
  emoji: string;
  rewards: { essence?: number; crystals?: number; faith?: number };
}

const TINT_CLS: Record<string, string> = {
  info: "border-info/40 text-info",
  gold: "border-gold/40 text-gold",
  danger: "border-blood/40 text-blood",
};

export function TowerHubClient({
  run,
  nextFloor,
  shopOffers,
}: {
  run: RunSummary;
  nextFloor: NextFloor;
  shopOffers: ShopOffer[];
}) {
  const { push } = useToast();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [busy, setBusy] = useState(false);
  // Mirror the server-side token balance locally so redeeming reflects
  // immediately without a router refresh. Initialised from the SSR run
  // and bumped on each successful redeem response.
  const [liveTokens, setLiveTokens] = useState<number>(run.towerTokens);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  // Wing progress: floors cleared within the current wing. The naive
  // `level % floorsPerWing` returns 0 right after clearing a wing boss
  // (level=5 → 5%5=0), which would falsely show the bar empty just as
  // it should celebrate a full wing. Special-case that boundary so the
  // bar fills completely on a wing-boss clear, then resets to 0 only
  // when the next floor (the new wing's first) actually starts.
  const wingProgress =
    run.currentLevel === 0
      ? 0
      : run.currentLevel % run.floorsPerWing === 0
        ? run.floorsPerWing
        : run.currentLevel % run.floorsPerWing;
  const isFirstClear = nextFloor.floor > run.highestLevel;

  const onRedeem = async (offerId: string, cost: number) => {
    if (liveTokens < cost) {
      push("塔幣不足", "warning");
      return;
    }
    setRedeeming(offerId);
    try {
      const r = await fetch("/api/dungeon/tower/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });
      const body = await r.json();
      if (!r.ok || !body?.ok) {
        push(body?.error ?? "兌換失敗", "danger");
        return;
      }
      setLiveTokens(body.remainingTokens);
      const parts: string[] = [];
      if (body.rewards.essence) parts.push(`✨ ${body.rewards.essence}`);
      if (body.rewards.crystals) parts.push(`💎 ${body.rewards.crystals}`);
      if (body.rewards.faith) parts.push(`🕯️ ${body.rewards.faith}`);
      push(`兌換成功 ${parts.join(" + ")}`, "success");
    } catch {
      push("兌換失敗(無連線)", "danger");
    } finally {
      setRedeeming(null);
    }
  };

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

        {liveTokens > 0 && (
          <div className="text-[11px] text-gold/80 tracking-wide">
            🪙 持有塔幣 ×{liveTokens}
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

      {/* Tower-token exchange. Hidden until the player has at least one
          token so a brand-new player isn't shown an empty shop. */}
      {liveTokens > 0 && shopOffers.length > 0 && (
        <>
          <h3 className="display-serif text-xs text-parchment/60 tracking-[0.3em] uppercase mb-3 mt-2 font-[family-name:var(--font-cinzel)]">
            塔幣兌換
          </h3>
          <section className="rounded-2xl border border-gold/30 bg-veil/40 p-4 mb-6">
            <div className="text-[11px] text-parchment/60 mb-3 leading-relaxed">
              用守關獲得的塔幣兌換素材。塔幣保留至下次撤離後也不會消失。
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {shopOffers.map((offer) => {
                const canAfford = liveTokens >= offer.cost;
                const isThisRedeeming = redeeming === offer.id;
                const rewardParts: string[] = [];
                if (offer.rewards.essence) rewardParts.push(`✨ ${offer.rewards.essence}`);
                if (offer.rewards.crystals) rewardParts.push(`💎 ${offer.rewards.crystals}`);
                if (offer.rewards.faith) rewardParts.push(`🕯️ ${offer.rewards.faith}`);
                return (
                  <button
                    key={offer.id}
                    onClick={() => onRedeem(offer.id, offer.cost)}
                    disabled={!canAfford || isThisRedeeming || redeeming !== null}
                    className={
                      "text-left rounded-lg border p-3 transition-all min-h-[64px] " +
                      (canAfford
                        ? "border-gold/40 bg-black/30 hover:bg-gold/10 hover:-translate-y-0.5"
                        : "border-parchment/10 bg-black/20 opacity-50 cursor-not-allowed")
                    }
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm text-parchment flex items-center gap-1.5">
                        <span aria-hidden>{offer.emoji}</span>
                        <span>{offer.title}</span>
                      </span>
                      <span className="text-[11px] text-gold tabular-nums shrink-0">
                        🪙 ×{offer.cost}
                      </span>
                    </div>
                    <div className="text-[10px] text-parchment/55 leading-snug mb-1.5">
                      {offer.desc}
                    </div>
                    <div className="text-[11px] text-parchment/85 tabular-nums">
                      {isThisRedeeming ? "兌換中…" : `→ ${rewardParts.join(" + ")}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

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
