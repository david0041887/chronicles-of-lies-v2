"use client";

import { cn } from "@/lib/utils";
import { chapterStatus, type Chapter } from "@/lib/story";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface Props {
  chapters: Chapter[];
  highestStage: number;
  bossCleared: boolean;
  palette: { main: string; accent: string; dark: string };
}

export function StoryChapters({ chapters, highestStage, bossCleared, palette }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {chapters.map((ch, i) => {
        const status = chapterStatus(ch.unlockAt, highestStage, bossCleared);
        const unlocked = status === "unlocked";
        const open = openIdx === i;
        return (
          <div
            key={i}
            className={cn(
              "rounded-xl border transition-colors",
              unlocked
                ? "border-parchment/15 bg-veil/40"
                : "border-parchment/10 bg-veil/20",
            )}
          >
            <button
              onClick={() => unlocked && setOpenIdx(open ? null : i)}
              disabled={!unlocked}
              className={cn(
                "w-full p-4 text-left flex items-center gap-3 transition-colors",
                unlocked ? "hover:bg-parchment/5" : "cursor-not-allowed",
              )}
            >
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 text-sm"
                style={{
                  borderColor: unlocked ? palette.main : "var(--color-parchment)",
                  background: unlocked ? `${palette.main}22` : "transparent",
                  opacity: unlocked ? 1 : 0.25,
                }}
              >
                {unlocked ? "📖" : "🔒"}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "display-serif text-base truncate",
                    unlocked ? "text-parchment" : "text-parchment/40",
                  )}
                >
                  {ch.title}
                </div>
                <div
                  className={cn(
                    "text-xs",
                    unlocked ? "text-parchment/50" : "text-parchment/30",
                  )}
                >
                  {unlocked
                    ? ch.subtitle
                    : ch.unlockAt === 3
                      ? "需擊敗 BOSS"
                      : `需通關第 ${ch.unlockAt} 關`}
                </div>
              </div>
              {unlocked && (
                <span
                  className={cn(
                    "text-xs transition-transform text-parchment/50",
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
                  <div className="px-5 pb-5 pl-[72px] pr-5">
                    <p className="text-sm text-parchment/80 leading-relaxed font-[family-name:var(--font-noto-serif)]">
                      {ch.body}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
