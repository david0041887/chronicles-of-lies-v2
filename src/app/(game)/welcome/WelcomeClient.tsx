"use client";

import { CardTile } from "@/components/game/CardTile";
import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { Rarity } from "@prisma/client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { claimStarter, pickRound } from "./actions";

interface CardLite {
  id: string;
  name: string;
  nameEn?: string | null;
  eraId: string;
  rarity: Rarity;
  type: string;
  cost: number;
  power: number;
  keywords: string[];
  flavor?: string | null;
  hasImage?: boolean;
}

interface Props {
  initialRolls: string[][][];
  initialPicks: number[];
  cardsById: Record<string, unknown>;
}

const RANK: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };
const TOTAL = 5;

function summary(cards: CardLite[]) {
  return {
    ur: cards.filter((c) => c.rarity === "UR").length,
    ssr: cards.filter((c) => c.rarity === "SSR").length,
    sr: cards.filter((c) => c.rarity === "SR").length,
    r: cards.filter((c) => c.rarity === "R").length,
  };
}

export function WelcomeClient({ initialRolls, initialPicks, cardsById }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [picks, setPicks] = useState<number[]>(initialPicks);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  const round = picks.length;
  const done = round >= TOTAL;

  const choices = useMemo(() => {
    if (done) return [];
    return initialRolls[round].map((ids) =>
      ids.map((id) => cardsById[id] as CardLite).filter(Boolean),
    );
  }, [initialRolls, round, cardsById, done]);

  const keptCards = useMemo(() => {
    const out: CardLite[] = [];
    picks.forEach((choiceIdx, r) => {
      for (const id of initialRolls[r][choiceIdx]) {
        const c = cardsById[id] as CardLite;
        if (c) out.push(c);
      }
    });
    return out;
  }, [picks, initialRolls, cardsById]);

  const onConfirm = () => {
    if (confirming === null) return;
    const choiceIdx = confirming;
    startTransition(async () => {
      const res = await pickRound(round, choiceIdx);
      setConfirming(null);
      if (!res.ok) {
        push(res.error, "danger");
        return;
      }
      setPicks(res.picks);
      router.refresh();
    });
  };

  const onClaim = () => {
    setClaiming(true);
    startTransition(async () => {
      const res = await claimStarter();
      setClaiming(false);
      if (!res.ok) {
        push(res.error, "danger");
        return;
      }
      push("起始禮包已領取,歡迎來到帷幕", "success");
      router.push("/home");
      router.refresh();
    });
  };

  if (done) {
    const total = summary(keptCards);
    return (
      <div className="relative min-h-[calc(100vh-3rem)] flex items-center justify-center px-6 py-10">
        <VeilBackdrop intensity="high" />
        <div className="relative max-w-3xl w-full text-center">
          <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-3">
            Ritual Complete
          </p>
          <h1 className="display-serif text-4xl sm:text-5xl text-sacred mb-4">
            五輪儀式完成
          </h1>
          <p className="text-parchment/70 max-w-xl mx-auto mb-8">
            50 張卡牌已歸入你的收藏。從這一刻起,帷幕將聽見你的名字。
          </p>
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto mb-8">
            <Stat label="UR" value={total.ur} tint="title-sheen" />
            <Stat label="SSR" value={total.ssr} tint="text-rarity-legend" />
            <Stat label="SR" value={total.sr} tint="text-rarity-super" />
            <Stat label="R" value={total.r} tint="text-rarity-rare" />
          </div>
          <Button size="lg" variant="primary" onClick={onClaim} disabled={claiming}>
            {claiming ? "領取中…" : "進入帷幕"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-3rem)]">
      <VeilBackdrop intensity="medium" />
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-3">
            Opening Ritual · Round {round + 1} / {TOTAL}
          </p>
          <h1 className="display-serif text-3xl sm:text-4xl text-sacred mb-2">
            第 {["一", "二", "三", "四", "五"][round]} 輪召喚
          </h1>
          <p className="text-parchment/60 text-sm max-w-xl mx-auto">
            四組十連之中,只能選走一組。其他將散於帷幕。
            {round === 0 && (
              <span className="block text-gold/80 mt-1">
                ✨ 首輪四組都保底至少一張 SSR
              </span>
            )}
          </p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-10 rounded-full transition-colors",
                i < picks.length
                  ? "bg-gold"
                  : i === picks.length
                    ? "bg-parchment/40"
                    : "bg-parchment/10",
              )}
            />
          ))}
        </div>

        {/* 4 choices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {choices.map((chCards, i) => {
            const s = summary(chCards);
            return (
              <motion.div
                key={`${round}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
                className="rounded-2xl border border-parchment/10 bg-veil/40 p-4 hover:border-gold/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="display-serif text-sm text-parchment/80">
                    組 {String.fromCharCode(65 + i)}
                  </span>
                  <div className="flex gap-2 text-[10px] tracking-wider">
                    {s.ur > 0 && <span className="title-sheen">UR×{s.ur}</span>}
                    {s.ssr > 0 && <span className="text-rarity-legend">SSR×{s.ssr}</span>}
                    {s.sr > 0 && <span className="text-rarity-super">SR×{s.sr}</span>}
                    <span className="text-rarity-rare">R×{s.r}</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {chCards.map((c, j) => (
                    <div key={`${c.id}-${j}`} className="w-full">
                      <CardTile card={c} size="sm" />
                    </div>
                  ))}
                </div>
                <Button
                  size="md"
                  variant="primary"
                  className="w-full"
                  disabled={pending}
                  onClick={() => setConfirming(i)}
                >
                  選這一組
                </Button>
              </motion.div>
            );
          })}
        </div>
      </main>

      <Modal
        open={confirming !== null}
        onClose={() => !pending && setConfirming(null)}
        title="確定?"
      >
        <p className="text-parchment/70 text-sm mb-4">
          選走這組後,其他 3 組將散於帷幕。這個決定不可反悔。
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(null)}
            disabled={pending}
          >
            取消
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={pending}>
            {pending ? "召喚中…" : "確定"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="p-3 rounded-lg border border-parchment/10 bg-veil/50">
      <div className={`text-xs tracking-wider ${tint}`}>{label}</div>
      <div className="font-[family-name:var(--font-mono)] text-2xl text-parchment tabular-nums mt-1">
        {value}
      </div>
    </div>
  );
}
