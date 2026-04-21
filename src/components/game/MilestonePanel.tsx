"use client";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { MilestoneState } from "@/lib/milestones";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  milestones: MilestoneState[];
}

export function MilestonePanel({ milestones }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const claimable = milestones.filter((m) => m.completed && !m.claimed);
  const upcoming = milestones.filter((m) => !m.completed);
  const claimed = milestones.filter((m) => m.claimed);

  const claim = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const r = await fetch("/api/milestones/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await r.json().catch(() => ({}));
      setBusyId(null);
      if (!r.ok) {
        push(body?.error ?? "領取失敗", "danger");
        return;
      }
      push(`✨ 領取 ${body.pulls} 次免費抽卡`, "success");
      router.refresh();
    });
  };

  const hintWithN = (hint: string, target: number, current: number) =>
    hint.replace("{n}", String(Math.max(1, target - current)));

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="display-serif text-xl text-sacred">里程碑</h3>
        <div className="text-xs text-parchment/50">
          已領 {claimed.length} / {milestones.length}
        </div>
      </div>

      {claimable.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gold tracking-widest mb-2">✨ 可領取</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {claimable.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border-2 border-gold bg-gold/10 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="display-serif text-gold truncate">{m.title}</div>
                  <div className="text-xs text-parchment/60">{m.desc}</div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={pending && busyId === m.id}
                  onClick={() => claim(m.id)}
                >
                  {busyId === m.id ? "…" : `領 ${m.pulls}`}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-parchment/50 tracking-widest mb-2">進行中</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {upcoming.map((m) => {
              const pct =
                m.progress
                  ? Math.min(100, (m.progress.current / m.progress.target) * 100)
                  : 0;
              const hint = m.progress
                ? hintWithN(m.hint, m.progress.target, m.progress.current)
                : m.hint;
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-parchment/10 bg-veil/30"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="display-serif text-parchment truncate">{m.title}</span>
                    <span className="text-[10px] text-gold/70 tracking-wider shrink-0">
                      +{m.pulls} 抽
                    </span>
                  </div>
                  {m.progress && (
                    <div className="h-1 rounded-full bg-parchment/10 overflow-hidden mb-1">
                      <div
                        className={cn(
                          "h-full transition-all",
                          pct >= 100 ? "bg-gold" : "bg-parchment/40",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  <div className="text-xs text-parchment/50">{hint}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {claimed.length > 0 && (
        <details className="text-xs text-parchment/50">
          <summary className="cursor-pointer py-2 tracking-wider">
            已領取 ({claimed.length})
          </summary>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {claimed.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-lg border border-parchment/10 bg-veil/20 opacity-60"
              >
                <div className="display-serif text-parchment/70 text-sm truncate">
                  ✓ {m.title}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
