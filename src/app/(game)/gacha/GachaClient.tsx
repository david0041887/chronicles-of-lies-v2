"use client";

import { CardTile } from "@/components/game/CardTile";
import { SummonAnimation } from "@/components/fx/SummonAnimation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PITY_SR, PITY_SSR, PITY_UR } from "@/lib/gacha";
import type { Rarity } from "@prisma/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pullGacha, type CardWithImage } from "./actions";

interface Props {
  initialCrystals: number;
  initialFreePulls: number;
  initialPitySR: number;
  initialPitySSR: number;
  initialPityUR: number;
  initialTotalPulls: number;
  costSingle: number;
  costTen: number;
}

const RANK: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };

function highestRarity(cards: CardWithImage[]): Rarity {
  return cards.reduce<Rarity>(
    (best, c) => (RANK[c.rarity] > RANK[best] ? c.rarity : best),
    "R",
  );
}

export function GachaClient({
  initialCrystals,
  initialFreePulls,
  initialPitySR,
  initialPitySSR,
  initialPityUR,
  initialTotalPulls,
  costSingle,
  costTen,
}: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [crystals, setCrystals] = useState(initialCrystals);
  const [freePulls, setFreePulls] = useState(initialFreePulls);
  const [pitySR, setPitySR] = useState(initialPitySR);
  const [pitySSR, setPitySSR] = useState(initialPitySSR);
  const [pityUR, setPityUR] = useState(initialPityUR);
  const [totalPulls, setTotalPulls] = useState(initialTotalPulls);
  const [pendingResult, setPendingResult] = useState<CardWithImage[] | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [result, setResult] = useState<CardWithImage[] | null>(null);

  const doPull = (count: 1 | 10) => {
    startTransition(async () => {
      const res = await pullGacha(count);
      if (!res.ok) {
        push(res.error, "danger");
        return;
      }
      setCrystals(res.data.crystalsLeft);
      setFreePulls(res.data.freePullsLeft);
      setPitySR(res.data.pitySR);
      setPitySSR(res.data.pitySSR);
      setPityUR(res.data.pityUR);
      setTotalPulls(res.data.totalPulls);
      setPendingResult(res.data.cards);
      setShowAnimation(true);
      const best = highestRarity(res.data.cards);
      if (best === "SSR" || best === "UR") {
        setTimeout(() => {
          const hit = res.data.cards.find((c) => c.rarity === best);
          if (hit) push(`✨ ${best} — ${hit.name}!`, "success");
        }, 1800);
      }
      router.refresh();
    });
  };

  const canSingleFree = freePulls >= 1;
  const canTenFree = freePulls >= 10;

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

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        <Stat
          label="🎁 免費抽"
          value={freePulls}
          tint={freePulls > 0 ? "text-gold" : "text-parchment/50"}
        />
        <Stat label="💎 水晶" value={crystals} tint="text-rarity-super" />
        <Stat label="總抽數" value={totalPulls} />
        <Stat label="保底 SR" value={`${Math.max(0, PITY_SR - pitySR)}`} />
        <Stat label="保底 SSR" value={`${Math.max(0, PITY_SSR - pitySSR)}`} />
        <Stat label="保底 UR" value={`${Math.max(0, PITY_UR - pityUR)}`} />
      </div>

      {freePulls > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-gold/40 bg-gold/5 text-xs text-gold tracking-wider">
          ⭐ 您有 {freePulls} 次免費抽卡,抽卡時會優先扣除
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <PullPanel
          title="單抽"
          desc={canSingleFree ? "使用免費抽卡 ×1" : "從帷幕召喚一名存在。"}
          cost={canSingleFree ? 0 : costSingle}
          free={canSingleFree}
          disabled={pending || showAnimation || (!canSingleFree && crystals < costSingle)}
          onPull={() => doPull(1)}
        />
        <PullPanel
          title="十連抽"
          desc={canTenFree ? "使用免費抽卡 ×10" : "必出 2 張 SR 以上,SSR 機率加成。"}
          cost={canTenFree ? 0 : costTen}
          free={canTenFree}
          variant="sacred"
          disabled={pending || showAnimation || (!canTenFree && crystals < costTen)}
          onPull={() => doPull(10)}
        />
      </div>

      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title={result && result.length === 10 ? "十連召喚結果" : "召喚完成"}
        className="max-w-3xl"
      >
        {result && (
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
            <div className="mt-6 flex justify-between items-center">
              <div className="text-xs text-parchment/50 space-x-3">
                <span>UR × {result.filter((c) => c.rarity === "UR").length}</span>
                <span>SSR × {result.filter((c) => c.rarity === "SSR").length}</span>
                <span>SR × {result.filter((c) => c.rarity === "SR").length}</span>
                <span>R × {result.filter((c) => c.rarity === "R").length}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResult(null)}
              >
                收下
              </Button>
            </div>
          </>
        )}
      </Modal>
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
  cost,
  free,
  variant = "primary",
  disabled,
  onPull,
}: {
  title: string;
  desc: string;
  cost: number;
  free?: boolean;
  variant?: "primary" | "sacred";
  disabled: boolean;
  onPull: () => void;
}) {
  const label = free
    ? "🎁 免費"
    : disabled && cost > 0
      ? "水晶不足"
      : `💎 ${cost.toLocaleString()}`;
  return (
    <div
      className={`p-6 rounded-xl border flex flex-col ${
        free ? "border-gold/50 bg-gold/5" : "border-parchment/10 bg-veil/40"
      }`}
    >
      <h3 className="display-serif text-2xl text-sacred mb-1">{title}</h3>
      <p className="text-sm text-parchment/60 mb-4 flex-1">{desc}</p>
      <Button variant={variant} size="lg" disabled={disabled} onClick={onPull}>
        {label}
      </Button>
    </div>
  );
}
