"use client";

import { cardsForLegend } from "@/lib/legend-cards";
import { cn } from "@/lib/utils";

interface Legend {
  name: string;
  desc: string;
}

interface Props {
  legends: Legend[];
  eraId: string;
  paletteMain: string;
  counts: number[];
  dominantIdx: number | null;
  /** -1 if weaver Lv < 3 (not active) */
  dailyIdx: number;
}

export function LegendsPanel({
  legends,
  eraId,
  paletteMain,
  counts,
  dominantIdx,
  dailyIdx,
}: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {legends.map((lg, i) => {
        const count = counts[i] ?? 0;
        const isDominant = dominantIdx === i && count > 0;
        const isDaily = dailyIdx === i;
        const bound = cardsForLegend(eraId, i);
        return (
          <div
            key={i}
            className={cn(
              "relative p-5 rounded-xl border transition-colors",
              isDaily
                ? "border-gold/60 bg-gold/5"
                : isDominant
                  ? "border-parchment/40 bg-veil/60"
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
              <div className="flex gap-1">
                {isDaily && (
                  <span className="text-[10px] tracking-widest text-gold border border-gold/60 px-1.5 py-0.5 rounded">
                    ✨ 今日
                  </span>
                )}
                {isDominant && (
                  <span className="text-[10px] tracking-widest text-parchment/70 border border-parchment/30 px-1.5 py-0.5 rounded">
                    主導
                  </span>
                )}
              </div>
            </div>
            <div className="display-serif text-lg text-parchment mb-1">
              {lg.name}
            </div>
            <p className="text-sm text-parchment/60 italic font-[family-name:var(--font-noto-serif)] mb-3">
              {lg.desc}
            </p>

            {/* Bound cards count */}
            <div className="text-[10px] text-parchment/50 mb-2">
              綁定 {bound.length} 張卡 · 打出時 +1 進度
            </div>

            {/* Progress 100 */}
            <div className="flex items-center justify-between text-xs text-parchment/60 mb-1">
              <span>傳播進度</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">
                {count} / 100
              </span>
            </div>
            <div className="h-1 rounded-full bg-parchment/10 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(100, count)}%`,
                  backgroundColor: isDaily ? "#D4A84B" : paletteMain,
                }}
              />
            </div>
            <div className="mt-1 text-[10px] text-parchment/40">
              傳 100 次解鎖隱藏劇情(規劃中)
            </div>
          </div>
        );
      })}
    </div>
  );
}
