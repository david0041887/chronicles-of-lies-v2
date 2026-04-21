import type { Era } from "@/lib/constants/eras";
import Link from "next/link";

interface EraCardProps {
  era: Era;
  believers: number;
  locked?: boolean;
  comingSoon?: boolean;
}

export function EraCard({ era, believers, locked, comingSoon }: EraCardProps) {
  const content = (
    <>
      <div
        className="absolute inset-0 opacity-60 era-card-glow"
        style={{
          background: `radial-gradient(circle at 30% 20%, ${era.palette.main}44, transparent 70%), radial-gradient(circle at 70% 80%, ${era.palette.accent}33, transparent 70%)`,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-30 mix-blend-screen"
        style={{
          background: `linear-gradient(135deg, ${era.palette.main}, ${era.palette.dark})`,
        }}
        aria-hidden
      />
      {/* era motes */}
      <div className="absolute inset-0 pointer-events-none opacity-70" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="era-mote absolute rounded-full"
            style={{
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              left: `${15 + ((i * 37) % 70)}%`,
              top: `${20 + ((i * 53) % 60)}%`,
              backgroundColor: era.palette.accent,
              boxShadow: `0 0 ${6 + (i % 3) * 3}px ${era.palette.accent}`,
              animationDelay: `${i * -2.5}s`,
              animationDuration: `${10 + (i % 4) * 2}s`,
            }}
          />
        ))}
      </div>
      <div className="relative p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <span
            className="font-[family-name:var(--font-cinzel)] text-xs tracking-[0.3em]"
            style={{ color: era.palette.main }}
          >
            {era.code}
          </span>
          <span className="text-3xl">{era.emoji}</span>
        </div>
        <h3 className="display-serif text-2xl text-parchment mb-1">{era.name}</h3>
        <p className="text-xs text-parchment/50 tracking-wider mb-4">
          {era.theme}
        </p>
        <p className="text-sm text-parchment/70 leading-relaxed font-[family-name:var(--font-noto-serif)] italic mb-6 line-clamp-3">
          「{era.hero}」
        </p>
        <div className="mt-auto flex items-end justify-between">
          <div>
            <div className="text-xs text-parchment/40">信徒</div>
            <div className="font-[family-name:var(--font-mono)] text-lg text-parchment tabular-nums">
              {believers.toLocaleString()}
            </div>
          </div>
          <div className="flex gap-1 items-center">
            {era.heroes.slice(0, 3).map((h) => (
              <span
                key={h}
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: `${era.palette.main}66`,
                  color: era.palette.main,
                }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
      {(locked || comingSoon) && (
        <div className="absolute inset-0 bg-veil/70 backdrop-blur-sm flex items-center justify-center">
          <span className="display-serif text-parchment/60">
            {comingSoon ? "即將開放" : "未解鎖"}
          </span>
        </div>
      )}
    </>
  );

  const frame =
    "relative overflow-hidden rounded-2xl border border-parchment/10 bg-veil/60 aspect-[4/5] min-h-[320px] transition-all";

  if (locked || comingSoon) {
    return <div className={frame}>{content}</div>;
  }

  return (
    <Link
      href={`/era/${era.id}`}
      className={`${frame} hover:border-gold/60 hover:-translate-y-1 hover:shadow-[var(--shadow-glow-gold)] group`}
    >
      {content}
    </Link>
  );
}
