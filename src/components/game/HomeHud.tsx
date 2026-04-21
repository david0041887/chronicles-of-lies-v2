interface HomeHudProps {
  username: string;
  title: string;
  level: number;
  exp: number;
  faction: "weavers" | "veritas" | "faceless";
  currencies: {
    crystals: number;
    faith: number;
    essence: number;
    masks: number;
    scrolls: number;
  };
  veilEnergy: number;
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

  return (
    <section className="rounded-2xl border border-parchment/10 bg-veil/40 backdrop-blur p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="display-serif text-2xl text-parchment">
              {props.username}
            </h2>
            <span
              className={`text-xs tracking-widest ${FACTION_TINT[props.faction]}`}
            >
              {FACTION_LABEL[props.faction]}
            </span>
          </div>
          <p className="text-sm text-parchment/50 mt-1">{props.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-parchment/40 tracking-wider">等級</div>
            <div className="display-serif text-xl text-sacred">
              Lv.{props.level}
            </div>
          </div>
          <div className="w-32">
            <div className="text-xs text-parchment/40 tracking-wider">經驗</div>
            <div className="h-2 bg-parchment/10 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gold"
                style={{ width: `${Math.min(100, props.exp % 100)}%` }}
              />
            </div>
          </div>
        </div>
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

      <div className="mt-4 flex items-center justify-between px-2 text-xs text-parchment/60">
        <span>📿 帷幕能量</span>
        <span className="font-[family-name:var(--font-mono)] text-ichor">
          {props.veilEnergy.toLocaleString()}
        </span>
      </div>
    </section>
  );
}
