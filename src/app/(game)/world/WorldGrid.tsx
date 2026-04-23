"use client";

import type { Era } from "@/lib/constants/eras";
import { motion } from "framer-motion";
import Link from "next/link";

interface Tile {
  era: Era;
  believers: number;
  highestStage: number;
  totalStages: number;
  bossCleared: boolean;
  unlocked: boolean;
  prevEraName: string | null;
  dailyLegendName?: string;
}

export function WorldGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="relative mx-auto">
      {/* Central vertical timeline spine */}
      <div
        className="absolute top-0 bottom-0 left-6 md:left-1/2 md:-translate-x-1/2 w-px"
        style={{
          background:
            "linear-gradient(180deg, rgba(212,168,75,0) 0%, rgba(212,168,75,0.5) 10%, rgba(212,168,75,0.5) 90%, rgba(212,168,75,0) 100%)",
        }}
        aria-hidden
      />

      <div className="space-y-6 md:space-y-10 py-6">
        {tiles.map((t, i) => (
          <TimelineRow key={t.era.id} tile={t} index={i} />
        ))}
      </div>

      {/* End marker */}
      <div className="relative flex items-center justify-center mt-6">
        <div
          className="absolute top-1/2 left-6 md:left-1/2 md:-translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-gold/60 bg-veil"
          aria-hidden
        />
        <span className="ml-16 md:ml-0 text-[10px] text-parchment/30 tracking-[0.3em] font-[family-name:var(--font-cinzel)] uppercase">
          End of the Veil · 終章待續
        </span>
      </div>
    </div>
  );
}

function TimelineRow({ tile, index }: { tile: Tile; index: number }) {
  const { era, believers, highestStage, totalStages, bossCleared, unlocked, prevEraName, dailyLegendName } = tile;
  const isLeft = index % 2 === 0;
  const started = highestStage > 0 || bossCleared;
  const cleared = bossCleared;

  // Wrap — either <Link> when unlocked or a plain <div> when locked.
  const CardWrapper = unlocked
    ? ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
        <Link href={`/era/${era.id}`} className={className} style={style}>
          {children}
        </Link>
      )
    : ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
        <div
          className={className}
          style={style}
          title={prevEraName ? `擊敗「${prevEraName}」的 BOSS 以解鎖` : "需要先解鎖前一時代"}
        >
          {children}
        </div>
      );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 0.97, 0.32, 1.08] }}
      className="relative grid md:grid-cols-2 md:items-center md:gap-6"
    >
      {/* Spacer for alternating desktop layout */}
      <div className={`hidden md:block ${isLeft ? "order-2" : "order-1"}`} />

      {/* Era medallion — sits ON the timeline spine */}
      <EraMedallion
        era={era}
        started={started}
        cleared={cleared}
        locked={!unlocked}
        dailyActive={!!dailyLegendName}
      />

      {/* Era card body (offset left or right on desktop, below on mobile) */}
      <div className={`pl-20 md:pl-0 ${isLeft ? "md:order-1 md:pr-10 md:text-right" : "md:order-2 md:pl-10"}`}>
        <CardWrapper
          className={`group block p-5 rounded-2xl border relative overflow-hidden ${
            unlocked ? "transition-all cursor-pointer" : "cursor-not-allowed"
          }`}
          style={{
            borderColor: !unlocked
              ? "rgba(244,230,193,0.08)"
              : started
                ? `${era.palette.main}88`
                : "rgba(244,230,193,0.12)",
            background: !unlocked
              ? "rgba(10,6,18,0.6)"
              : `linear-gradient(${isLeft ? "-45deg" : "45deg"}, ${era.palette.dark}cc, ${era.palette.main}22)`,
            boxShadow:
              cleared && unlocked
                ? `0 0 24px ${era.palette.main}33`
                : undefined,
            opacity: unlocked ? 1 : 0.45,
          }}
        >
          {/* Faint emoji watermark */}
          <span
            aria-hidden
            className={`absolute ${isLeft ? "-left-4" : "-right-4"} -bottom-6 opacity-[0.08] group-hover:opacity-15 transition-opacity pointer-events-none select-none`}
            style={{ fontSize: "7rem", lineHeight: 1 }}
          >
            {era.emoji}
          </span>

          <div className={`relative flex items-start gap-3 ${isLeft ? "md:flex-row-reverse md:text-right" : ""}`}>
            <span className="text-3xl shrink-0 drop-shadow-[0_0_10px_rgba(0,0,0,0.6)]">
              {era.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`flex items-center gap-2 ${isLeft ? "md:flex-row-reverse" : ""}`}>
                <span
                  className="font-[family-name:var(--font-cinzel)] text-[10px] tracking-[0.3em]"
                  style={{ color: era.palette.accent }}
                >
                  {era.code}
                </span>
                {cleared && (
                  <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/40">
                    CLEARED
                  </span>
                )}
                {!unlocked && (
                  <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded bg-parchment/10 text-parchment/60 border border-parchment/30">
                    🔒 LOCKED
                  </span>
                )}
                {dailyLegendName && unlocked && (
                  <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/40">
                    ✨ 今日
                  </span>
                )}
              </div>
              <h3
                className="display-serif text-2xl mb-0.5"
                style={{ color: started ? era.palette.accent : "rgba(244,230,193,0.75)" }}
              >
                {era.name}
              </h3>
              <p className="text-[11px] text-parchment/50 tracking-wider">
                {era.en} · {era.theme}
              </p>
              <p className="text-xs text-parchment/70 italic mt-2 font-[family-name:var(--font-noto-serif)] leading-relaxed">
                {unlocked
                  ? `「${era.hero}」`
                  : prevEraName
                    ? `🔒 擊敗「${prevEraName}」的 BOSS 以解鎖`
                    : "🔒 尚未解鎖"}
              </p>

              <ProgressPips
                highestStage={highestStage}
                totalStages={totalStages}
                bossCleared={bossCleared}
                palette={era.palette}
                alignRight={isLeft}
              />

              <div
                className={`mt-3 flex items-center gap-3 text-[11px] ${isLeft ? "md:justify-end" : ""}`}
              >
                <span className="text-parchment/60">
                  🪙 信徒 <span className="font-[family-name:var(--font-mono)] text-parchment tabular-nums">{believers.toLocaleString()}</span>
                </span>
                {dailyLegendName && (
                  <span className="text-amber-300 truncate">
                    · {dailyLegendName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardWrapper>
      </div>
    </motion.div>
  );
}

function EraMedallion({
  era,
  started,
  cleared,
  locked,
  dailyActive,
}: {
  era: Era;
  started: boolean;
  cleared: boolean;
  locked: boolean;
  dailyActive: boolean;
}) {
  const color = locked
    ? "rgba(244,230,193,0.2)"
    : started
      ? era.palette.main
      : "rgba(244,230,193,0.35)";
  const accent = era.palette.accent;
  return (
    <div className="absolute top-3 left-6 md:left-1/2 md:-translate-x-1/2 z-10" aria-hidden>
      <motion.div
        animate={
          dailyActive
            ? {
                boxShadow: [
                  `0 0 0px ${accent}00`,
                  `0 0 22px ${accent}cc`,
                  `0 0 0px ${accent}00`,
                ],
              }
            : {
                boxShadow: cleared
                  ? `0 0 18px ${color}aa`
                  : `0 0 0px transparent`,
              }
        }
        transition={
          dailyActive
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
        className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl bg-veil"
        style={{
          borderColor: color,
          background: `radial-gradient(circle at center, ${era.palette.dark}, ${era.palette.dark}f5)`,
        }}
      >
        <span
          style={{
            filter: locked
              ? "grayscale(1) opacity(0.35)"
              : started
                ? "none"
                : "grayscale(0.6) opacity(0.6)",
          }}
        >
          {locked ? "🔒" : era.emoji}
        </span>
      </motion.div>
      {cleared && (
        <span
          className="absolute -bottom-1 -right-1 text-[10px] bg-gold text-veil rounded-full w-5 h-5 flex items-center justify-center font-bold shadow"
        >
          ✓
        </span>
      )}
    </div>
  );
}

function ProgressPips({
  highestStage,
  totalStages,
  bossCleared,
  palette,
  alignRight,
}: {
  highestStage: number;
  totalStages: number;
  bossCleared: boolean;
  palette: { main: string; accent: string };
  alignRight: boolean;
}) {
  const pips = Math.max(3, totalStages);
  return (
    <div
      className={`mt-3 flex items-center gap-1.5 ${alignRight ? "md:justify-end" : ""}`}
    >
      {Array.from({ length: pips }).map((_, i) => {
        const isBossSlot = i === pips - 1;
        const done = isBossSlot ? bossCleared : highestStage > i;
        return (
          <span
            key={i}
            className="w-5 h-1.5 rounded-full transition-colors"
            style={{
              background: done
                ? isBossSlot
                  ? palette.accent
                  : palette.main
                : "rgba(244,230,193,0.15)",
              boxShadow: done ? `0 0 6px ${palette.main}88` : undefined,
            }}
            title={
              isBossSlot
                ? bossCleared
                  ? "BOSS 已擊敗"
                  : "BOSS 待戰"
                : `第 ${i + 1} 關 ${done ? "已通" : "待過"}`
            }
          />
        );
      })}
      <span className="ml-1 text-[10px] text-parchment/50 font-[family-name:var(--font-mono)] tabular-nums">
        {highestStage}/{totalStages || 3}
        {bossCleared ? " ★" : ""}
      </span>
    </div>
  );
}
