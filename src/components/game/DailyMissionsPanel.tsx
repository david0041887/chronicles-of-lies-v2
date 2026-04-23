"use client";

import { PageSection } from "@/components/ui/PageSection";
import { useToast } from "@/components/ui/Toast";
import {
  MISSION_REWARD,
  TEMPLATES,
  type MissionSlot,
} from "@/lib/daily-missions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { claimMissionAction } from "./daily-missions-actions";

const TPL_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function DailyMissionsPanel({
  initialSlots,
  resetInHours,
}: {
  initialSlots: MissionSlot[];
  resetInHours: number;
}) {
  const { push } = useToast();
  const router = useRouter();
  const [slots, setSlots] = useState<MissionSlot[]>(initialSlots);
  const [pending, startTransition] = useTransition();

  const onClaim = (slotId: string) => {
    startTransition(async () => {
      const res = await claimMissionAction(slotId);
      if (!res.ok) {
        push(res.error, "warning");
        return;
      }
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, claimed: true } : s)),
      );
      push(`+${res.crystals}💎 / +${res.faith}🕯️`, "success");
      router.refresh();
    });
  };

  const allDone = slots.every((s) => s.claimed);

  return (
    <PageSection
      title="📜 每日任務"
      subtitle={`${resetInHours}h 後輪替 · 每項獎勵 ${MISSION_REWARD.crystals}💎 + ${MISSION_REWARD.faith}🕯️`}
    >
      <div className="grid sm:grid-cols-3 gap-3">
        {slots.map((slot) => {
          const tpl = TPL_BY_ID.get(slot.id);
          if (!tpl) return null;
          const ratio = Math.min(1, slot.progress / slot.target);
          const completed = slot.progress >= slot.target;
          return (
            <div
              key={slot.id}
              className={`relative p-4 rounded-xl border transition-all ${
                slot.claimed
                  ? "border-parchment/10 bg-veil/20 opacity-50"
                  : completed
                    ? "border-gold/60 bg-gold/10 shadow-[0_0_20px_rgba(212,168,75,0.18)]"
                    : "border-parchment/15 bg-veil/40"
              }`}
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="text-2xl leading-none shrink-0">
                  {tpl.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-parchment leading-tight">
                    {tpl.label}
                  </div>
                  <div className="text-[10px] text-parchment/50 mt-0.5 font-[family-name:var(--font-mono)] tabular-nums">
                    {slot.progress} / {slot.target}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-parchment/10 overflow-hidden mb-3">
                <div
                  className={`h-full transition-all ${completed ? "bg-gold" : "bg-parchment/40"}`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>

              {slot.claimed ? (
                <div className="text-center text-[10px] text-parchment/50 tracking-widest py-1">
                  ✓ 已領取
                </div>
              ) : completed ? (
                <button
                  onClick={() => onClaim(slot.id)}
                  disabled={pending}
                  className="w-full py-1.5 rounded-md bg-gold text-veil text-xs font-semibold hover:brightness-110 disabled:opacity-50 min-h-[36px]"
                >
                  {pending ? "領取中…" : "領取獎勵"}
                </button>
              ) : (
                <div className="text-center text-[10px] text-parchment/40 tracking-wider py-1">
                  進行中…
                </div>
              )}
            </div>
          );
        })}
      </div>
      {allDone && (
        <div className="mt-3 text-center text-[11px] text-gold/70 tracking-widest">
          ✨ 今日全部完成 — 明日新任務刷新
        </div>
      )}
    </PageSection>
  );
}
