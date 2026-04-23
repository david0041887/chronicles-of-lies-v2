"use client";

import { cn } from "@/lib/utils";
import { getAbilityDescriptionsForCard } from "@/lib/battle/card-abilities";
import { keywordTitle } from "@/lib/keyword-meta";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import type { Rarity } from "@prisma/client";
import { CardArt } from "./CardArt";

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
  imageUrl?: string | null;  // external (e.g. Replicate URL)
  hasImage?: boolean;        // internal CardImage via /api/cards/:id/art
}

interface CardTileProps {
  card: Card;
  ownedCount?: number;
  revealed?: boolean;
  size?: "sm" | "md" | "lg";
  tilt?: boolean;
  onClick?: () => void;
  /** Show a NEW badge — for cards newly acquired since user last viewed. */
  isNew?: boolean;
}

const RARITY_GLOW: Record<Rarity, string> = {
  R: "shadow-[0_0_12px_rgba(74,144,226,0.35)]",
  SR: "shadow-[0_0_20px_rgba(184,127,235,0.55)]",
  SSR: "shadow-[var(--shadow-glow-gold)]",
  UR: "shadow-[0_0_32px_rgba(255,215,0,0.7),0_0_64px_rgba(184,127,235,0.35),0_0_96px_rgba(6,182,212,0.25)]",
};
const RARITY_BORDER: Record<Rarity, string> = {
  R: "border-rarity-rare",
  SR: "border-rarity-super",
  SSR: "border-rarity-legend",
  UR: "ur-rainbow-border",
};
const RARITY_TINT: Record<Rarity, string> = {
  R: "text-rarity-rare",
  SR: "text-rarity-super",
  SSR: "text-rarity-legend",
  UR: "title-sheen",
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

const ABILITY_TRIGGER_ICON_MAP: Record<string, string> = {
  戰吼: "📜",
  亡語: "☠",
  回合開始: "🌅",
  回合結束: "🌙",
  攻擊後: "⚔",
  受擊: "🩸",
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
  tilt = false,
  onClick,
  isNew = false,
}: CardTileProps) {
  const notOwned = typeof ownedCount === "number" && ownedCount === 0;

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });
  const transform = useMotionTemplate`perspective(900px) rotateX(${srx}deg) rotateY(${sry}deg)`;

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!tilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rx.set(-py * 14);
    ry.set(px * 18);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  if (!revealed) {
    return (
      <div
        className={cn(
          "aspect-[3/4] rounded-xl border-2 border-gold/60 relative overflow-hidden",
          "bg-gradient-to-br from-[#2a1b4a] via-veil to-[#0a0612]",
          "flex items-center justify-center",
          SIZES[size],
        )}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, #D4A84B22, transparent 60%)",
          }}
        />
        <div
          className="text-gold/70 display-serif text-5xl select-none"
          style={{ textShadow: "0 0 18px #D4A84B88" }}
        >
          謊
        </div>
      </div>
    );
  }

  const Wrapper: React.ElementType = onClick ? "button" : "div";

  // Derived ability preview — first description line for SR+ cards that
  // become minions. Used to paint a small trigger badge on the art so
  // players can tell a battlecry/deathrattle from stat-stick R cards at
  // a glance, both in collection and in hand.
  const abilityPreview = (() => {
    const lines = getAbilityDescriptionsForCard(
      card.id,
      card.rarity,
      card.keywords,
    );
    if (lines.length === 0) return null;
    const [trig, ...rest] = lines[0].split(":");
    const icon = ABILITY_TRIGGER_ICON_MAP[trig?.trim() ?? ""] ?? "✦";
    return { icon, trig, desc: rest.join(":").trim(), all: lines };
  })();

  const artUrl = card.imageUrl || (card.hasImage ? `/api/cards/${card.id}/art` : null);
  const artLayer = artUrl ? (
    <img
      src={artUrl}
      alt={card.name}
      className="w-full h-full object-cover"
      draggable={false}
    />
  ) : (
    <CardArt
      cardId={card.id}
      eraId={card.eraId}
      type={card.type}
      rarity={card.rarity}
      name={card.name}
      className="w-full h-full"
    />
  );

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
    >
      {tilt ? (
        <motion.div
          className="absolute inset-0"
          style={{ transform, transformStyle: "preserve-3d" }}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        >
          {artLayer}
        </motion.div>
      ) : (
        <div className="absolute inset-0">{artLayer}</div>
      )}

      {/* Overlays */}
      <div className="relative flex items-start justify-between p-2">
        <span className="font-[family-name:var(--font-mono)] font-bold text-parchment bg-black/60 px-1.5 rounded">
          {card.cost}
        </span>
        <span className={cn("text-xs font-bold tracking-wider drop-shadow-[0_0_6px_rgba(0,0,0,0.8)]", RARITY_TINT[card.rarity])}>
          {card.rarity}
        </span>
      </div>

      <div className="relative flex-1" />

      {card.keywords.length > 0 && (
        <div className="relative flex flex-wrap gap-0.5 justify-center px-1 pb-1">
          {card.keywords.slice(0, 3).map((k) => (
            <span
              key={k}
              title={keywordTitle(k)}
              className="text-[9px] tracking-widest px-1 py-0.5 rounded bg-black/60 text-parchment/90 backdrop-blur-sm cursor-help"
            >
              {k}
            </span>
          ))}
          {card.keywords.length > 3 && (
            <span
              title={card.keywords.slice(3).map(keywordTitle).join("\n")}
              className="text-[9px] tracking-widest px-1 py-0.5 rounded bg-black/60 text-parchment/60 backdrop-blur-sm cursor-help"
            >
              +{card.keywords.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="relative p-2 border-t border-black/40 bg-gradient-to-t from-black/75 to-black/35 backdrop-blur">
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
        <div className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-gold text-veil px-1.5 py-0.5 rounded-full shadow z-10">
          ×{ownedCount}
        </div>
      )}
      {isNew && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <motion.span
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="block text-[9px] font-bold tracking-[0.2em] bg-gradient-to-br from-amber-300 to-rose-500 text-veil px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(255,180,80,0.6)]"
          >
            NEW
          </motion.span>
        </div>
      )}
      {abilityPreview && (
        <div
          className="absolute bottom-[30%] right-1.5 z-10"
          title={abilityPreview.all.join("\n")}
        >
          <span className="flex items-center gap-0.5 text-[9px] font-semibold tracking-wider bg-rarity-super/90 text-veil px-1.5 py-0.5 rounded-full border border-rarity-super shadow-[0_0_8px_rgba(184,127,235,0.5)]">
            <span aria-hidden>{abilityPreview.icon}</span>
            <span className="hidden sm:inline">{abilityPreview.trig}</span>
          </span>
        </div>
      )}
    </Wrapper>
  );
}
