import type { LevelProgress } from "@/lib/weaver";

interface HomeHudProps {
  username: string;
  faction: "weavers" | "veritas" | "faceless";
  currencies: {
    crystals: number;
    faith: number;
    essence: number;
    masks: number;
    scrolls: number;
  };
  veilEnergy: number;
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

export function HomeHud(props: HomeHudProps) {
  const currencies: { key: keyof HomeHudProps["currencies"]; label: string; emoji: string }[] = [
    { key: "crystals", label: "水晶", emoji: "💎" },
    { key: "faith", label: "信念", emoji: "🪙" },
    { key: "essence", label: "精華", emoji: "🔮" },
    { key: "masks", label: "面具", emoji: "🎭" },
    { key: "scrolls", label: "卷軸", emoji: "📜" },
  ];

  const w = props.weaver;

  return (
    <section className="rounded-2xl border border-parchment/10 bg-veil/40 backdrop-blur p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="display-serif text-2xl text-parchment">{props.username}</h2>
            <span className={`text-xs tracking-widest ${FACTION_TINT[props.faction]}`}>
              {FACTION_LABEL[props.faction]}
            </span>
          </div>
          <p className="text-sm text-parchment/50 mt-1">{w.title}</p>
        </div>
        <div className="flex items-center gap-4 min-w-0">
          <div className="text-right shrink-0">
            <div className="text-xs text-parchment/40 tracking-wider">編織者等級</div>
            <div className="display-serif text-2xl text-sacred">Lv.{w.level}</div>
          </div>
        </div>
      </div>

      {/* Weaver progress bar */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between text-xs mb-1">
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

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {currencies.map((c) => (
          <div
            key={c.key}
            className="flex flex-col items-center p-3 rounded-lg bg-veil/70 border border-parchment/5"
          >
            <div className="text-2xl">{c.emoji}</div>
            <div className="text-xs text-parchment/50 mt-1">{c.label}</div>
            <div className="font-[family-name:var(--font-mono)] text-sm text-parchment tabular-nums">
              {props.currencies[c.key].toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
