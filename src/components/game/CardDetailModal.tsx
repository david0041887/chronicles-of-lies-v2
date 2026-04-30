"use client";

import { CardArt } from "@/components/game/CardArt";
import { Modal } from "@/components/ui/Modal";
import { getAbilityDescriptionsForCard } from "@/lib/battle/card-abilities";
import { cardArtUrl } from "@/lib/card-art";
import { ERAS } from "@/lib/constants/eras";
import { cn } from "@/lib/utils";
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
  imageUrl?: string | null;
  hasImage?: boolean;
}

interface Props {
  card: Card | null;
  ownedCount: number;
  onClose: () => void;
}

const RARITY_TINT: Record<Rarity, string> = {
  R: "text-rarity-rare border-rarity-rare",
  SR: "text-rarity-super border-rarity-super",
  SSR: "text-rarity-legend border-rarity-legend",
  UR: "title-sheen border-gold",
};

const TYPE_LABEL: Record<string, { label: string; emoji: string; desc: string }> = {
  attack: { label: "攻擊", emoji: "⚔️", desc: "削減對手信徒" },
  spread: { label: "傳播", emoji: "📢", desc: "穩定增加自己信徒" },
  heal: { label: "恢復", emoji: "💚", desc: "補血並移除負面狀態" },
  confuse: { label: "困惑", emoji: "🌀", desc: "讓敵人下回合跳過" },
  buff: { label: "強化", emoji: "⬆️", desc: "下一張牌效果翻倍" },
  debuff: { label: "削弱", emoji: "⬇️", desc: "削弱敵人並轉化信徒" },
  ritual: { label: "儀式", emoji: "🔮", desc: "蓄力發動,高風險高回報" },
};

const KEYWORD_DESC: Record<string, string> = {
  whisper: "低語 — 出牌時偷看對手 1 張手牌",
  ritual: "儀式 — 高投入回合強力發動",
  charm: "魅惑 — 敵人下張攻擊/儀式有 50% 反傷自己",
  curse: "詛咒 — 2-3 疊,每回合遞減 1 點傷害",
  resonance: "共鳴 — 同時代牌同場效果提升",
  sacrifice: "獻祭 — 棄 1 張手牌 → 本牌 +3 威力",
  echo: "回響 — 下回合自動以 50% 威力重現",
  pierce: "穿透 — 無視敵方護盾",
  shield: "護盾 — 獲得一次性傷害吸收",
  haste: "迅捷 — 出牌後立即再抽 1 張",
  // ── New effect keywords ──
  lifesteal: "吸血 — 本次傷害回復等量信徒(上限 6)",
  poison: "中毒 — 敵人每回合 −N 信徒,不衰減",
  vulnerable: "破綻 — 敵人 2 回合內受到 +50% 傷害",
  weaken: "虛弱 — 敵人 2 回合內輸出 −25%",
  strength: "力量 — 永久為每張後續牌 +1 威力",
  combo: "連擊 — 本回合第 3 張起 +50% 威力",
};

export function CardDetailModal({ card, ownedCount, onClose }: Props) {
  if (!card) return null;
  const era = ERAS.find((e) => e.id === card.eraId);
  const typeInfo = TYPE_LABEL[card.type] ?? { label: card.type, emoji: "?", desc: "" };
  const artUrl = cardArtUrl(card);

  return (
    <Modal open={true} onClose={onClose} className="max-w-3xl">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Art */}
        <div
          className={cn(
            "relative aspect-[3/4] rounded-2xl border-2 overflow-hidden",
            RARITY_TINT[card.rarity],
          )}
        >
          {artUrl ? (
            <img src={artUrl} alt={card.name} className="w-full h-full object-cover" />
          ) : (
            <CardArt
              cardId={card.id}
              eraId={card.eraId}
              type={card.type}
              rarity={card.rarity}
              name={card.name}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-xs font-bold tracking-wider px-2 py-0.5 rounded border",
                RARITY_TINT[card.rarity],
              )}
            >
              {card.rarity}
            </span>
            {era && (
              <span
                className="text-xs tracking-widest font-[family-name:var(--font-cinzel)]"
                style={{ color: era.palette.main }}
              >
                {era.emoji} {era.code} {era.name}
              </span>
            )}
          </div>
          <h2 className="display-serif text-3xl text-sacred mb-1">{card.name}</h2>
          {card.nameEn && (
            <p className="font-[family-name:var(--font-cinzel)] text-sm text-parchment/50 tracking-widest mb-4">
              {card.nameEn}
            </p>
          )}

          {card.flavor && (
            <p className="font-[family-name:var(--font-noto-serif)] italic text-parchment/80 border-l-2 border-parchment/20 pl-4 mb-5">
              「{card.flavor}」
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="費用" value={card.cost} />
            <Stat label="威力" value={card.power} />
            <Stat label="擁有" value={ownedCount} />
          </div>

          <div className="mb-4">
            <div className="text-xs text-parchment/50 tracking-wider mb-1">牌型</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">{typeInfo.emoji}</span>
              <span className="display-serif text-parchment">{typeInfo.label}</span>
              <span className="text-parchment/60 text-xs">— {typeInfo.desc}</span>
            </div>
          </div>

          {card.keywords.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-parchment/50 tracking-wider mb-2">關鍵字</div>
              <div className="space-y-1.5">
                {card.keywords.map((k) => (
                  <div
                    key={k}
                    className="text-xs px-3 py-1.5 rounded bg-veil/60 border border-parchment/10"
                  >
                    <span className="text-gold font-semibold">{k}</span>
                    <span className="text-parchment/60 ml-2">
                      {KEYWORD_DESC[k]?.split("—")[1]?.trim() ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature abilities — if this card is a minion with unique
              triggers, list them. Otherwise fall back to keyword-derived
              defaults for SR+ minions. */}
          <CardAbilities card={card} />
        </div>
      </div>
    </Modal>
  );
}

const TRIGGER_ICON: Record<string, string> = {
  戰吼: "📜",
  亡語: "☠",
  回合開始: "🌅",
  回合結束: "🌙",
  攻擊後: "⚔",
  受擊: "🩸",
};

function CardAbilities({ card }: { card: Card }) {
  const abilities = getAbilityDescriptionsForCard(card.id, card.rarity, card.keywords);
  if (abilities.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="text-xs text-parchment/50 tracking-wider mb-2 flex items-center gap-2">
        <span>卡牌技能</span>
        <span className="flex-1 h-px bg-rarity-super/20" aria-hidden />
        <span className="text-[10px] text-rarity-super/70">SR+ 登場時觸發</span>
      </div>
      <div className="space-y-1.5">
        {abilities.map((line, i) => {
          const [trig, ...rest] = line.split(":");
          const t = trig.trim();
          const icon = TRIGGER_ICON[t] ?? "◆";
          return (
            <div
              key={i}
              className="text-xs px-3 py-2 rounded bg-gradient-to-r from-rarity-super/10 to-veil/60 border border-rarity-super/40 flex items-start gap-2"
            >
              <span
                className="shrink-0 w-6 h-6 rounded-full bg-rarity-super/25 border border-rarity-super/50 flex items-center justify-center text-sm"
                aria-hidden
              >
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-rarity-super font-semibold tracking-wider leading-tight">
                  {t}
                </div>
                <div className="text-parchment/85 leading-snug mt-0.5">
                  {rest.join(":").trim()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-2 rounded-lg bg-veil/50 border border-parchment/10 text-center">
      <div className="text-[10px] text-parchment/50 tracking-wider">{label}</div>
      <div className="font-[family-name:var(--font-mono)] text-xl text-parchment tabular-nums">
        {value}
      </div>
    </div>
  );
}
