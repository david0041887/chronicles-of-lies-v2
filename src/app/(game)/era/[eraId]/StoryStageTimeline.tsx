"use client";

import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/story";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export interface ChapterWithStatus extends Chapter {
  status: "unlocked" | "locked";
}

interface Stage {
  id: string;
  name: string;
  subtitle: string | null;
  orderNum: number;
  difficulty: number;
  enemyName: string;
  enemyHp: number;
  isBoss: boolean;
  rewardCrystals: number;
  rewardBelievers: number;
}

interface Props {
  chapters: ChapterWithStatus[];
  stages: Stage[];
  highestStage: number;
  palette: { main: string; accent: string; dark: string };
}

/**
 * Interleaved timeline: chapter → stage → chapter → stage ...
 *
 * Chapters are placed by matching their `unlockAt` to a stage's orderNum,
 * so we correctly slot inter-stage chapters even when elite / extra
 * normal stages are inserted. The terminus chapter (unlockAt === 3, the
 * "boss" sentinel) is always pinned to the very end.
 */
export function StoryStageTimeline({
  chapters,
  stages,
  highestStage,
  palette,
}: Props) {
  const items: Array<
    | { kind: "chapter"; data: ChapterWithStatus; key: string }
    | { kind: "stage"; data: Stage; key: string }
  > = [];

  const prologue = chapters.find((c) => c.unlockAt === 0);
  const terminus = chapters.find((c) => c.unlockAt === 3);
  const midChapters = chapters.filter(
    (c) => c.unlockAt !== 0 && c.unlockAt !== 3,
  );

  if (prologue) items.push({ kind: "chapter", data: prologue, key: "ch0" });

  for (const stage of stages) {
    items.push({ kind: "stage", data: stage, key: `st${stage.orderNum}` });
    const matching = midChapters.find((c) => c.unlockAt === stage.orderNum);
    if (matching) {
      items.push({
        kind: "chapter",
        data: matching,
        key: `ch_after_${stage.orderNum}`,
      });
    }
  }

  if (terminus) {
    items.push({ kind: "chapter", data: terminus, key: "ch_terminus" });
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div
        className="absolute left-[23px] top-4 bottom-4 w-px pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${palette.main}33, ${palette.main}aa, ${palette.main}33)`,
        }}
        aria-hidden
      />
      <div className="space-y-3 relative">
        {items.map((item) => {
          if (item.kind === "chapter") {
            return (
              <ChapterRow
                key={item.key}
                chapter={item.data}
                palette={palette}
              />
            );
          }
          const stage = item.data;
          const unlocked =
            stage.orderNum === 1 || highestStage >= stage.orderNum - 1;
          const cleared = highestStage >= stage.orderNum;
          return (
            <StageRow
              key={item.key}
              stage={stage}
              unlocked={unlocked}
              cleared={cleared}
              palette={palette}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChapterRow({
  chapter,
  palette,
}: {
  chapter: ChapterWithStatus;
  palette: { main: string; accent: string };
}) {
  const [open, setOpen] = useState(chapter.status === "unlocked" && chapter.unlockAt === 0);
  const unlocked = chapter.status === "unlocked";

  return (
    <div
      className={cn(
        "relative pl-14 rounded-xl transition-colors border",
        unlocked
          ? "border-parchment/10 bg-veil/30"
          : "border-parchment/5 bg-veil/10",
      )}
    >
      {/* Marker */}
      <div
        className="absolute left-2 top-4 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm"
        style={{
          borderColor: unlocked ? palette.main : "var(--color-parchment)",
          background: unlocked ? `${palette.main}22` : "transparent",
          opacity: unlocked ? 1 : 0.3,
        }}
      >
        {unlocked ? "📖" : "🔒"}
      </div>
      <button
        onClick={() => unlocked && setOpen(!open)}
        disabled={!unlocked}
        className={cn(
          "w-full text-left py-3 pr-4 flex items-center justify-between gap-2",
          unlocked ? "cursor-pointer" : "cursor-not-allowed",
        )}
      >
        <div className="min-w-0">
          <div
            className={cn(
              "display-serif text-base truncate",
              unlocked ? "text-parchment" : "text-parchment/40",
            )}
          >
            {chapter.title}
          </div>
          <div
            className={cn(
              "text-[11px] truncate",
              unlocked ? "text-parchment/50" : "text-parchment/30",
            )}
          >
            {unlocked
              ? chapter.subtitle
              : chapter.unlockAt === 3
                ? "需擊敗 BOSS 解鎖"
                : `需通關第 ${chapter.unlockAt} 關解鎖`}
          </div>
        </div>
        {unlocked && (
          <span
            className={cn(
              "text-xs transition-transform text-parchment/50 shrink-0",
              open && "rotate-90",
            )}
          >
            ▶
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {unlocked && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-4 pr-4 text-sm text-parchment/80 leading-relaxed font-[family-name:var(--font-noto-serif)]">
              {chapter.body}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StageRow({
  stage,
  unlocked,
  cleared,
  palette,
}: {
  stage: Stage;
  unlocked: boolean;
  cleared: boolean;
  palette: { main: string; accent: string };
}) {
  return (
    <div
      className={cn(
        "relative pl-14 rounded-xl border transition-colors",
        unlocked
          ? stage.isBoss
            ? "border-blood/50 bg-blood/10"
            : "border-parchment/15 bg-veil/40 hover:border-gold/40"
          : "border-parchment/10 bg-veil/20 opacity-60",
      )}
    >
      {/* Marker */}
      <div
        className={cn(
          "absolute left-2 top-4 w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0",
        )}
        style={{
          borderColor: stage.isBoss ? "#8B1A1A" : palette.main,
          background: stage.isBoss ? "#8B1A1A22" : `${palette.main}22`,
        }}
      >
        <span className="display-serif text-sm">
          {stage.isBoss ? "👑" : stage.orderNum}
        </span>
      </div>
      <div className="flex items-center gap-3 pr-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="display-serif text-base text-parchment truncate">
              ⚔️ {stage.name}
            </span>
            {cleared && <span className="text-xs text-success">✓ 已通關</span>}
            {stage.isBoss && (
              <span className="text-[10px] text-blood tracking-widest border border-blood/60 px-1.5 py-0.5 rounded">
                BOSS
              </span>
            )}
          </div>
          {stage.subtitle && (
            <div className="text-[11px] text-parchment/50">{stage.subtitle}</div>
          )}
          <div className="flex items-center gap-3 text-[11px] text-parchment/60 mt-1">
            <span>難度 ×{stage.difficulty}</span>
            <span>敵 HP {stage.enemyHp}</span>
            <span className="text-rarity-super">💎 +{stage.rewardCrystals}</span>
            <span className="text-gold">🪙 +{stage.rewardBelievers}</span>
          </div>
        </div>
        {unlocked ? (
          <Link
            href={`/battle/${stage.id}`}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold shrink-0 transition-all",
              stage.isBoss
                ? "bg-blood text-parchment hover:brightness-110"
                : "bg-gold text-veil hover:brightness-110",
            )}
          >
            {cleared ? "再戰" : "挑戰"}
          </Link>
        ) : (
          <span className="text-xs text-parchment/30 tracking-widest shrink-0">
            🔒
          </span>
        )}
      </div>
    </div>
  );
}
