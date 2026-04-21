"use client";

import { cn } from "@/lib/utils";
import { ERAS } from "@/lib/constants/eras";
import type { Rarity } from "@prisma/client";

interface Card {
  id: string;
  name: string;
  nameEn?: string | null;
  eraId: string;
  rarity: Rarity;
  type: string;
  cost: number;
  power: number;
  keywords: string[];
  flavor?: string | null;
}

interface CardTileProps {
  card: Card;
  ownedCount?: number;
  revealed?: boolean;         // false shows card back (for gacha flip)
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const RARITY_GLOW: Record<Rarity, string> = {
  R: "shadow-[0_0_12px_rgba(74,144,226,0.35)]",
  SR: "shadow-[0_0_20px_rgba(184,127,235,0.5)]",
  SSR: "shadow-[var(--shadow-glow-gold)]",
  UR: "shadow-[var(--shadow-glow-gold)]",
};
const RARITY_BORDER: Record<Rarity, string> = {
  R: "border-rarity-rare",
  SR: "border-rarity-super",
  SSR: "border-rarity-legend",
  UR: "border-gold",
};
const RARITY_TINT: Record<Rarity, string> = {
  R: "text-rarity-rare",
  SR: "text-rarity-super",
  SSR: "text-rarity-legend",
  UR: "text-gold",
};
const TYPE_ICON: Record<string, string> = {
  attack: "⚔️",
  spread: "📢",
  heal: "💚",
  confuse: "🌀",
  buff: "⬆️",
  debuff: "⬇️",
  ritual: "🔮",
};

const SIZES = {
  sm: "w-32 text-xs",
  md: "w-44 text-sm",
  lg: "w-56 text-base",
};

export function CardTile({
  card,
  ownedCount,
  revealed = true,
  size = "md",
  onClick,
}: CardTileProps) {
  const era = ERAS.find((e) => e.id === card.eraId);
  const notOwned = typeof ownedCount === "number" && ownedCount === 0;

  if (!revealed) {
    return (
      <div
        className={cn(
          "aspect-[3/4] rounded-xl border-2 border-gold/50 bg-gradient-to-br from-[#2a1b4a] to-veil relative overflow-hidden",
          "flex items-center justify-center",
          SIZES[size],
        )}
      >
        <div className="text-gold/40 display-serif text-4xl">謊</div>
      </div>
    );
  }

  const Wrapper: React.ElementType = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "relative aspect-[3/4] rounded-xl border-2 overflow-hidden",
        "flex flex-col transition-all text-left",
        RARITY_BORDER[card.rarity],
        RARITY_GLOW[card.rarity],
        onClick && "hover:-translate-y-1 hover:brightness-110 cursor-pointer",
        notOwned && "opacity-40 grayscale",
        SIZES[size],
      )}
      style={{
        background: era
          ? `linear-gradient(135deg, ${era.palette.dark} 0%, ${era.palette.main}30 100%)`
          : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-2">
        <div className="flex items-center gap-1">
          <span className="font-[family-name:var(--font-mono)] font-bold text-parchment bg-black/40 px-1.5 rounded">
            {card.cost}
          </span>
        </div>
        <span className={cn("text-xs font-bold tracking-wider", RARITY_TINT[card.rarity])}>
          {card.rarity}
        </span>
      </div>

      {/* Center — art placeholder */}
      <div className="flex-1 flex items-center justify-center relative">
        <div
          className="text-5xl sm:text-6xl select-none"
          style={{ filter: "drop-shadow(0 0 12px rgba(0,0,0,0.5))" }}
        >
          {era?.emoji ?? "🎴"}
        </div>
        {card.keywords.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex flex-wrap gap-0.5 justify-center px-1">
            {card.keywords.slice(0, 3).map((k) => (
              <span
                key={k}
                className="text-[9px] tracking-widest px-1 py-0.5 rounded bg-black/50 text-parchment/90"
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-black/40 bg-black/30 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="display-serif truncate text-parchment">
            {card.name}
          </span>
          <span className="flex items-center gap-0.5 text-parchment/90 shrink-0">
            <span className="text-[10px]">{TYPE_ICON[card.type] ?? "⚔️"}</span>
            <span className="font-[family-name:var(--font-mono)] text-xs font-bold">
              {card.power}
            </span>
          </span>
        </div>
        {card.nameEn && (
          <div className="text-[10px] text-parchment/40 tracking-wider truncate">
            {card.nameEn}
          </div>
        )}
      </div>

      {typeof ownedCount === "number" && (
        <div className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-gold text-veil px-1.5 py-0.5 rounded-full shadow">
          ×{ownedCount}
        </div>
      )}
    </Wrapper>
  );
}
