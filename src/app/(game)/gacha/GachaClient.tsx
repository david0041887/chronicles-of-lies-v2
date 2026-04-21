"use client";

import { CardTile } from "@/components/game/CardTile";
import { SummonAnimation } from "@/components/fx/SummonAnimation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Rarity } from "@prisma/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pullGacha, type CardWithImage } from "./actions";

interface Props {
  initialCrystals: number;
  initialPitySR: number;
  initialPitySSR: number;
  initialTotalPulls: number;
  costSingle: number;
  costTen: number;
}

function highestRarity(cards: CardWithImage[]): Rarity {
  const order: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };
  return cards.reduce<Rarity>(
    (best, c) => (order[c.rarity] > order[best] ? c.rarity : best),
    "R",
  );
}

export function GachaClient({
  initialCrystals,
  initialPitySR,
  initialPitySSR,
  initialTotalPulls,
  costSingle,
  costTen,
}: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [crystals, setCrystals] = useState(initialCrystals);
  const [pitySR, setPitySR] = useState(initialPitySR);
  const [pitySSR, setPitySSR] = useState(initialPitySSR);
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
      setPitySR(res.data.pitySR);
      setPitySSR(res.data.pitySSR);
      setTotalPulls(res.data.totalPulls);
      setPendingResult(res.data.cards);
      setShowAnimation(true);
      const best = highestRarity(res.data.cards);
      if (best === "SSR" || best === "UR") {
        // Delay toast until after animation
        setTimeout(() => {
          const hit = res.data.cards.find((c) => c.rarity === best);
          if (hit) push(`✨ ${best} — ${hit.name}!`, "success");
        }, 2500);
      }
      router.refresh();
    });
  };

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

      {/* Stats HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="💎 水晶" value={crystals} tint="text-rarity-super" />
        <Stat label="總抽數" value={totalPulls} />
        <Stat label="距保底 SR" value={`${Math.max(0, 50 - pitySR)}`} />
        <Stat label="距保底 SSR" value={`${Math.max(0, 90 - pitySSR)}`} />
      </div>

      {/* Pull buttons */}
      <div className="grid sm:grid-cols-2 gap-4">
        <PullPanel
          title="單抽"
          desc="從帷幕召喚一名存在。"
          cost={costSingle}
          disabled={pending || showAnimation || crystals < costSingle}
          onPull={() => doPull(1)}
        />
        <PullPanel
          title="十連抽"
          desc="十次召喚,保底至少一張 SR。"
          cost={costTen}
          variant="sacred"
          disabled={pending || showAnimation || crystals < costTen}
          onPull={() => doPull(10)}
        />
      </div>

      {/* Result modal */}
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
                  initial={{ rotateY: 180, opacity: 0, scale: 0.8 }}
                  animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                  transition={{
                    delay: i * 0.08,
                    duration: 0.45,
                    ease: [0.68, -0.55, 0.27, 1.55],
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <CardTile card={c} size={result.length === 10 ? "sm" : "md"} tilt />
                </motion.div>
              ))}
            </div>
            <div className="mt-6 flex justify-between items-center">
              <div className="text-xs text-parchment/50 space-x-3">
                <span>
                  SSR × {result.filter((c) => c.rarity === "SSR").length}
                </span>
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
  variant = "primary",
  disabled,
  onPull,
}: {
  title: string;
  desc: string;
  cost: number;
  variant?: "primary" | "sacred";
  disabled: boolean;
  onPull: () => void;
}) {
  return (
    <div className="p-6 rounded-xl border border-parchment/10 bg-veil/40 flex flex-col">
      <h3 className="display-serif text-2xl text-sacred mb-1">{title}</h3>
      <p className="text-sm text-parchment/60 mb-4 flex-1">{desc}</p>
      <Button variant={variant} size="lg" disabled={disabled} onClick={onPull}>
        {disabled && cost > 0 ? "水晶不足" : `💎 ${cost.toLocaleString()}`}
      </Button>
    </div>
  );
}
