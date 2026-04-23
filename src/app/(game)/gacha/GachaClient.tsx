"use client";

import { CardTile } from "@/components/game/CardTile";
import { SummonAnimation } from "@/components/fx/SummonAnimation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ERAS } from "@/lib/constants/eras";
import { PITY_SR, PITY_SSR, PITY_UR } from "@/lib/gacha";
import { POOLS, type PoolId } from "@/lib/gacha-pools";
import type { Rarity } from "@prisma/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { pullGacha, type CardWithImage } from "./actions";

interface FeaturedUr {
  id: string;
  name: string;
  eraId: string;
  hasImage: boolean;
}

interface Props {
  initialCrystals: number;
  initialFaith: number;
  initialFreePulls: number;
  initialPitySR: number;
  initialPitySSR: number;
  initialPityUR: number;
  initialTotalPulls: number;
  featuredUr: FeaturedUr | null;
  featuredRotationMs: number;
}

const RANK: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };

function highestRarity(cards: CardWithImage[]): Rarity {
  return cards.reduce<Rarity>(
    (best, c) => (RANK[c.rarity] > RANK[best] ? c.rarity : best),
    "R",
  );
}

const TAB_ORDER: PoolId[] = ["standard", "featured", "era", "basic"];

export function GachaClient({
  initialCrystals,
  initialFaith,
  initialFreePulls,
  initialPitySR,
  initialPitySSR,
  initialPityUR,
  initialTotalPulls,
  featuredUr,
  featuredRotationMs,
}: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [crystals, setCrystals] = useState(initialCrystals);
  const [faith, setFaith] = useState(initialFaith);
  const [freePulls, setFreePulls] = useState(initialFreePulls);
  const [pitySR, setPitySR] = useState(initialPitySR);
  const [pitySSR, setPitySSR] = useState(initialPitySSR);
  const [pityUR, setPityUR] = useState(initialPityUR);
  const [totalPulls, setTotalPulls] = useState(initialTotalPulls);
  const [pendingResult, setPendingResult] = useState<CardWithImage[] | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [result, setResult] = useState<CardWithImage[] | null>(null);
  const [resultPool, setResultPool] = useState<PoolId>("standard");
  const [activePool, setActivePool] = useState<PoolId>("standard");
  const [eraChoice, setEraChoice] = useState<string>(ERAS[0].id);

  const rotationHours = Math.floor(featuredRotationMs / 3600000);
  const rotationMinutes = Math.floor((featuredRotationMs % 3600000) / 60000);

  const config = POOLS[activePool];

  const doPull = (count: 1 | 10) => {
    const poolId = activePool;
    startTransition(async () => {
      const res = await pullGacha({
        pool: poolId,
        count,
        eraId: poolId === "era" ? eraChoice : undefined,
      });
      if (!res.ok) {
        push(res.error, "danger");
        return;
      }
      setCrystals(res.data.crystalsLeft);
      setFaith(res.data.faithLeft);
      setFreePulls(res.data.freePullsLeft);
      setPitySR(res.data.pitySR);
      setPitySSR(res.data.pitySSR);
      setPityUR(res.data.pityUR);
      setTotalPulls(res.data.totalPulls);
      setPendingResult(res.data.cards);
      setResultPool(res.data.poolId);
      setShowAnimation(true);
      const best = highestRarity(res.data.cards);
      if (best === "SSR" || best === "UR") {
        setTimeout(() => {
          const hit = res.data.cards.find((c) => c.rarity === best);
          if (hit) {
            const isFeatured =
              res.data.featuredUrId && hit.id === res.data.featuredUrId;
            push(
              `${isFeatured ? "🌟 本週主角" : "✨"} ${best} — ${hit.name}!`,
              "success",
            );
          }
        }, 1800);
      }
      router.refresh();
    });
  };

  // Per-pool affordability
  const canFreeStandard =
    activePool === "standard" && freePulls >= 1 ? true : false;
  const canTenFreeStandard =
    activePool === "standard" && freePulls >= 10 ? true : false;
  const balance = config.currency === "crystals" ? crystals : faith;
  const singleCost = canFreeStandard ? 0 : config.costSingle;
  const tenCost = canTenFreeStandard ? 0 : config.costTen;
  const singleDisabled =
    pending ||
    showAnimation ||
    (!canFreeStandard && balance < config.costSingle);
  const tenDisabled =
    pending ||
    showAnimation ||
    (!canTenFreeStandard && balance < config.costTen);

  const currencyEmoji = config.currency === "crystals" ? "💎" : "🕯️";
  const currencyLabel = config.currency === "crystals" ? "水晶" : "信念幣";

  return (
    <>
      <SummonAnimation
        active={showAnimation}
        highestRarity={pendingResult ? highestRarity(pendingResult) : "R"}
        onComplete={() => {
          setShowAnimation(false);
          setResult(pendingResult);
          setPendingResult(null);
        }}
      />

      {/* Top resource row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        <Stat label="🎁 免費抽" value={freePulls} tint={freePulls > 0 ? "text-gold" : "text-parchment/50"} />
        <Stat label="💎 水晶" value={crystals} tint="text-rarity-super" />
        <Stat label="🕯️ 信念幣" value={faith} tint="text-weavers" />
        <Stat label="保底 SR" value={`${Math.max(0, PITY_SR - pitySR)}`} />
        <Stat label="保底 SSR" value={`${Math.max(0, PITY_SSR - pitySSR)}`} />
        <Stat label="保底 UR" value={`${Math.max(0, PITY_UR - pityUR)}`} />
      </div>

      {/* Pool tabs */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {TAB_ORDER.map((id) => {
          const p = POOLS[id];
          const active = activePool === id;
          return (
            <button
              key={id}
              onClick={() => setActivePool(id)}
              className={`relative p-3 rounded-xl border text-left transition-all overflow-hidden ${
                active
                  ? "border-gold/70 bg-gold/10 shadow-[0_0_20px_rgba(212,168,75,0.15)]"
                  : "border-parchment/10 bg-veil/30 hover:border-parchment/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{p.emoji}</span>
                <div className="min-w-0">
                  <div
                    className={`display-serif text-sm ${active ? "text-gold" : "text-parchment"}`}
                  >
                    {p.name}
                  </div>
                  <div className="text-[10px] text-parchment/50">
                    {p.currency === "crystals" ? "💎" : "🕯️"} {p.costSingle} / {p.costTen}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active pool details */}
      <div className="mb-5 p-5 rounded-2xl border border-parchment/15 bg-veil/30">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="display-serif text-xl text-sacred">
              {config.emoji} {config.name}
            </h2>
            <p className="text-xs text-parchment/60 mt-1">{config.subtitle}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-parchment/40 tracking-widest">餘額</div>
            <div className={`text-sm tabular-nums ${config.currency === "crystals" ? "text-rarity-super" : "text-weavers"}`}>
              {currencyEmoji} {balance.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-[11px] text-parchment/50 tracking-wide">
          機率:{config.rateHint}
        </div>

        {/* Featured pool: show the weekly UR */}
        {activePool === "featured" && featuredUr && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-gold/10 border border-gold/40">
            <span className="text-3xl">🌟</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-gold tracking-[0.3em] uppercase">
                Featured · 本週主角
              </div>
              <div className="display-serif text-base text-parchment truncate">
                {featuredUr.name}
              </div>
              <div className="text-[10px] text-parchment/40 mt-0.5">
                {rotationHours}h {rotationMinutes}m 後輪替
              </div>
            </div>
          </div>
        )}

        {/* Era pool: era selector */}
        {activePool === "era" && (
          <div className="mt-4">
            <div className="text-[11px] text-parchment/50 tracking-wider mb-2">
              選擇目標時代
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {ERAS.map((era) => {
                const active = eraChoice === era.id;
                return (
                  <button
                    key={era.id}
                    onClick={() => setEraChoice(era.id)}
                    className={`p-2 rounded-lg border text-xs transition-all ${
                      active
                        ? "border-gold/70 bg-gold/10 text-gold"
                        : "border-parchment/10 bg-veil/20 text-parchment/70 hover:border-parchment/30"
                    }`}
                    style={
                      active ? { boxShadow: `inset 0 0 18px ${era.palette.main}33` } : undefined
                    }
                  >
                    <div className="text-xl mb-0.5">{era.emoji}</div>
                    <div className="truncate">{era.name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Basic pool: how to earn faith */}
        {activePool === "basic" && (
          <div className="mt-4 text-[11px] text-parchment/60 leading-relaxed">
            💡 信念幣透過戰鬥勝利、主線推進與每日任務累積。
          </div>
        )}
      </div>

      {/* Pull buttons */}
      <div className="grid sm:grid-cols-2 gap-4">
        <PullPanel
          title="單抽"
          desc={
            canFreeStandard
              ? "使用免費抽卡 ×1"
              : `從帷幕召喚一名存在。`
          }
          costLabel={
            canFreeStandard ? "🎁 免費" : `${currencyEmoji} ${singleCost.toLocaleString()}`
          }
          free={canFreeStandard}
          disabled={singleDisabled}
          onPull={() => doPull(1)}
        />
        <PullPanel
          title="十連抽"
          desc={
            canTenFreeStandard
              ? "使用免費抽卡 ×10"
              : "必出 2 張 SR 以上,含 10% 折扣。"
          }
          costLabel={
            canTenFreeStandard ? "🎁 免費" : `${currencyEmoji} ${tenCost.toLocaleString()}`
          }
          free={canTenFreeStandard}
          variant="sacred"
          disabled={tenDisabled}
          onPull={() => doPull(10)}
        />
      </div>

      {/* Result modal */}
      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title={
          result
            ? `${POOLS[resultPool].emoji} ${POOLS[resultPool].name} · ${result.length === 10 ? "十連" : "召喚"}結果`
            : undefined
        }
        className="max-w-3xl"
      >
        {result && (
          <ResultContent
            result={result}
            poolId={resultPool}
            onClose={() => setResult(null)}
          />
        )}
      </Modal>
    </>
  );
}

function ResultContent({
  result,
  poolId,
  onClose,
}: {
  result: CardWithImage[];
  poolId: PoolId;
  onClose: () => void;
}) {
  const summary = useMemo(() => {
    return {
      UR: result.filter((c) => c.rarity === "UR").length,
      SSR: result.filter((c) => c.rarity === "SSR").length,
      SR: result.filter((c) => c.rarity === "SR").length,
      R: result.filter((c) => c.rarity === "R").length,
    };
  }, [result]);
  const best = highestRarity(result);
  const hasJackpot = best === "UR" || best === "SSR";

  return (
    <>
      <div
        className={`grid gap-3 ${
          result.length === 10 ? "grid-cols-5" : "grid-cols-1 place-items-center"
        }`}
      >
        {result.map((c, i) => (
          <motion.div
            key={`${c.id}-${i}`}
            className="flex justify-center"
            initial={{ rotateY: 180, opacity: 0, scale: 0.75 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            transition={{
              delay: i * 0.05,
              duration: 0.35,
              ease: [0.22, 0.97, 0.32, 1.08],
            }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <CardTile card={c} size={result.length === 10 ? "sm" : "md"} tilt />
          </motion.div>
        ))}
      </div>
      <div className="mt-6 flex justify-between items-center flex-wrap gap-3">
        <div className="text-xs text-parchment/60 space-x-3">
          {summary.UR > 0 && <span className="text-gold">UR × {summary.UR}</span>}
          {summary.SSR > 0 && <span className="text-rarity-super">SSR × {summary.SSR}</span>}
          <span>SR × {summary.SR}</span>
          <span>R × {summary.R}</span>
          <span className="text-parchment/30">
            · 來自 {POOLS[poolId].name}
          </span>
        </div>
        <Button
          variant={hasJackpot ? "primary" : "ghost"}
          size="sm"
          onClick={onClose}
        >
          收下
        </Button>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tint = "text-parchment",
}: {
  label: string;
  value: number | string;
  tint?: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-parchment/10 bg-veil/40">
      <div className="text-xs text-parchment/50 tracking-wider">{label}</div>
      <div
        className={`font-[family-name:var(--font-mono)] text-lg tabular-nums ${tint}`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function PullPanel({
  title,
  desc,
  costLabel,
  free,
  variant = "primary",
  disabled,
  onPull,
}: {
  title: string;
  desc: string;
  costLabel: string;
  free?: boolean;
  variant?: "primary" | "sacred";
  disabled: boolean;
  onPull: () => void;
}) {
  return (
    <div
      className={`p-6 rounded-xl border flex flex-col ${
        free ? "border-gold/50 bg-gold/5" : "border-parchment/10 bg-veil/40"
      }`}
    >
      <h3 className="display-serif text-2xl text-sacred mb-1">{title}</h3>
      <p className="text-sm text-parchment/60 mb-4 flex-1">{desc}</p>
      <Button variant={variant} size="lg" disabled={disabled} onClick={onPull}>
        {costLabel}
      </Button>
    </div>
  );
}
