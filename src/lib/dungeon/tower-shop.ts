/**
 * Tower-token exchange catalog. Static list of redemption "deals" the
 * tower hub can offer; each entry maps a token cost → currency rewards.
 * Living here (not in DB) because tower tokens are a soft economy that
 * doesn't need admin tooling yet — just hand-tune the list.
 *
 * Pricing rule of thumb:
 *   1 token  = ~50 essence (the small daily-grind currency)
 *   1 token  = ~100 crystals (very cheap relative to gacha cost)
 *   5 tokens = a "package" that pays back a wing of work
 *
 * Tokens drop one per wing-boss clear (every 5 floors), so 5 tokens
 * means clearing 5 wings = 25 floors. Pricing keeps that meaningful.
 */

export interface TowerShopOffer {
  id: string;
  cost: number;
  /** Currency rewards granted on redemption. */
  rewards: { essence?: number; crystals?: number; faith?: number };
  /** UI labels — hand-tuned per offer so each has flavour. */
  title: string;
  desc: string;
  emoji: string;
}

export const TOWER_SHOP_OFFERS: readonly TowerShopOffer[] = [
  {
    id: "essence-small",
    cost: 1,
    rewards: { essence: 50 },
    title: "精華包",
    desc: "鍛造素材一束 — 適合日常累積",
    emoji: "✨",
  },
  {
    id: "crystal-bundle",
    cost: 2,
    rewards: { crystals: 250 },
    title: "水晶束",
    desc: "聚集塔頂的祈禱,化為召喚的能量",
    emoji: "💎",
  },
  {
    id: "wing-bounty",
    cost: 5,
    rewards: { essence: 300, crystals: 500 },
    title: "段位福利",
    desc: "整個段位征服的回報 — 精華 + 水晶大包",
    emoji: "🪙",
  },
  {
    id: "faith-fragment",
    cost: 3,
    rewards: { faith: 30 },
    title: "信念碎片",
    desc: "罕見的信念貨幣,可用於特殊兌換",
    emoji: "🕯️",
  },
] as const;

export function getOffer(id: string): TowerShopOffer | undefined {
  return TOWER_SHOP_OFFERS.find((o) => o.id === id);
}
