"use client";

import { useToast } from "@/components/ui/Toast";
import { SPREAD_COOLDOWN_SEC } from "@/lib/spread";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

interface Legend {
  name: string;
  desc: string;
}

interface Props {
  eraId: string;
  legends: Legend[];
  paletteMain: string;
  initialCounts: number[];
  initialBelievers: number;
  initialSpreadsTotal: number;
  initialDominantIdx: number | null;
  initialCooldownSec: number;
}

export function SpreadLegends({
  eraId,
  legends,
  paletteMain,
  initialCounts,
  initialBelievers,
  initialSpreadsTotal,
  initialDominantIdx,
  initialCooldownSec,
}: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [counts, setCounts] = useState(initialCounts);
  const [believers, setBelievers] = useState(initialBelievers);
  const [totalSpreads, setTotalSpreads] = useState(initialSpreadsTotal);
  const [dominantIdx, setDominantIdx] = useState<number | null>(initialDominantIdx);
  const [cd, setCd] = useState(initialCooldownSec);
  const [floats, setFloats] = useState<{ id: number; value: number; idx: number }[]>([]);

  // Countdown tick
  useEffect(() => {
    if (cd <= 0) return;
    const t = setInterval(() => {
      setCd((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cd]);

  const onSpread = (idx: number) => {
    if (cd > 0) {
      push(`冷卻中 (${cd}s)`, "warning");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/era/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eraId, legendIdx: idx }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.cooldownSec) setCd(body.cooldownSec);
        push(body?.error ?? "傳播失敗", "danger");
        return;
      }
      const { believerReward, eraProgress } = body;
      setCounts(eraProgress.legendCounts ?? counts);
      setBelievers(eraProgress.believers);
      setTotalSpreads(eraProgress.spreadsTotal);
      setDominantIdx(eraProgress.dominantLegend);
      setCd(SPREAD_COOLDOWN_SEC);
      setFloats((f) => [
        ...f,
        { id: Date.now() + idx, value: believerReward, idx },
      ]);
      setTimeout(() => {
        setFloats((f) => f.filter((x) => x.id !== Date.now() + idx));
      }, 2000);
      router.refresh();
    });
  };

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {legends.map((lg, i) => {
        const count = counts[i] ?? 0;
        const isDominant = dominantIdx === i && count > 0;
        const ready = cd === 0;
        const myFloats = floats.filter((f) => f.idx === i);
        return (
          <div
            key={i}
            className={cn(
              "relative p-5 rounded-xl border transition-colors",
              isDominant
                ? "border-gold/60 bg-gold/5"
                : "border-parchment/10 bg-veil/40",
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="text-xs tracking-widest font-[family-name:var(--font-cinzel)]"
                style={{ color: paletteMain }}
              >
                LEGEND {i + 1}
              </div>
              {isDominant && (
                <span className="text-[10px] tracking-widest text-gold border border-gold/40 px-1.5 py-0.5 rounded">
                  主導傳說
                </span>
              )}
            </div>
            <div className="display-serif text-lg text-parchment mb-1">
              {lg.name}
            </div>
            <p className="text-sm text-parchment/60 italic font-[family-name:var(--font-noto-serif)] mb-4">
              {lg.desc}
            </p>
            <div className="flex items-center justify-between">
              <div className="text-xs text-parchment/60 font-[family-name:var(--font-mono)] tabular-nums">
                ×{count} 次傳播
              </div>
              <button
                onClick={() => onSpread(i)}
                disabled={pending || !ready}
                className={cn(
                  "relative text-xs tracking-wider px-3 py-1.5 rounded-lg border transition-all",
                  ready
                    ? "border-gold text-gold hover:bg-gold/10"
                    : "border-parchment/20 text-parchment/40 cursor-not-allowed",
                )}
              >
                {!ready ? `⏳ ${cd}s` : "📢 傳播謊言"}
                <AnimatePresence>
                  {myFloats.map((f) => (
                    <motion.span
                      key={f.id}
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: -30 }}
                      exit={{ opacity: 0, y: -50 }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                      className="absolute right-0 -top-2 text-sm text-gold font-bold whitespace-nowrap drop-shadow-[0_0_6px_rgba(212,168,75,0.6)]"
                    >
                      +{f.value} 信徒
                    </motion.span>
                  ))}
                </AnimatePresence>
              </button>
            </div>
            {/* Progress toward 100 */}
            <div className="mt-3 h-1 rounded-full bg-parchment/10 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(100, count)}%`,
                  backgroundColor: paletteMain,
                }}
              />
            </div>
            <div className="mt-1 text-[10px] text-parchment/40">
              傳 100 次解鎖隱藏劇情(規劃中)
            </div>
          </div>
        );
      })}
      <div className="sm:col-span-2 text-right text-[11px] text-parchment/50 pt-1">
        累積 {totalSpreads} 次 · 當前信徒 {believers.toLocaleString()}
      </div>
    </div>
  );
}
