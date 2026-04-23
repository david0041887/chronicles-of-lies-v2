import type { LevelProgress } from "@/lib/weaver";

interface HomeHudProps {
  username: string;
  faction: "weavers" | "veritas" | "faceless";
  weaver: LevelProgress;
}

const FACTION_LABEL: Record<HomeHudProps["faction"], string> = {
  weavers: "編織者議會",
  veritas: "守真者教團",
  faceless: "無相面者",
};

const FACTION_TINT: Record<HomeHudProps["faction"], string> = {
  weavers: "text-weavers",
  veritas: "text-veritas",
  faceless: "text-faceless",
};

/**
 * Profile/progress block on the home dashboard.
 *
 * Currencies live in the persistent TopBar now, so this block focuses on:
 *   — identity (username + faction)
 *   — weaver level progress toward the next milestone
 *   — next unlock teaser
 */
export function HomeHud(props: HomeHudProps) {
  const w = props.weaver;

  return (
    <section className="rounded-2xl border border-parchment/10 bg-veil/40 backdrop-blur p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="display-serif text-2xl text-parchment">{props.username}</h2>
            <span className={`text-xs tracking-widest ${FACTION_TINT[props.faction]}`}>
              {FACTION_LABEL[props.faction]}
            </span>
          </div>
          <p className="text-sm text-parchment/50 mt-1">{w.title}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-parchment/40 tracking-wider">編織者等級</div>
          <div className="display-serif text-3xl text-sacred">Lv.{w.level}</div>
        </div>
      </div>

      {/* Weaver progress bar */}
      <div>
        <div className="flex items-baseline justify-between text-xs mb-1 flex-wrap gap-2">
          <span className="text-parchment/50">
            累積信徒{" "}
            <span className="font-[family-name:var(--font-mono)] text-parchment tabular-nums">
              {w.believers.toLocaleString()}
            </span>
          </span>
          {!w.maxed ? (
            <span className="text-parchment/50">
              距下個里程碑{" "}
              <span className="font-[family-name:var(--font-mono)] text-gold tabular-nums">
                {w.toNext.toLocaleString()}
              </span>
            </span>
          ) : (
            <span className="text-gold tracking-widest">已達最高等級</span>
          )}
        </div>
        <div className="h-2 bg-parchment/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${(w.ratio * 100).toFixed(1)}%` }}
          />
        </div>
        {w.nextBlurb && (
          <div className="mt-2 text-[11px] text-parchment/60">
            <span className="text-gold">下一個解鎖:</span> {w.nextBlurb}
          </div>
        )}
      </div>
    </section>
  );
}
