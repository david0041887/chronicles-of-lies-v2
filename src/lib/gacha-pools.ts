import type { Rarity } from "@prisma/client";

/**
 * Gacha pool definitions — four pools with distinct currency/rates/filters.
 *
 *  1. basic     — 信念召喚  (faith,  cheap, worse rates,  slower pity)
 *  2. standard  — 標準召喚  (crystals, baseline rates and pity)
 *  3. featured  — 本週限定  (crystals, UR rate doubled + weekly UR guaranteed 50% when UR rolls)
 *  4. era       — 時代專召  (crystals, higher cost, card pool filtered to a specific era)
 *
 * Pity counters are shared across pools (single triple on User model). That
 * lets the player "accumulate luck" across their activity without needing
 * per-pool columns in the database.
 */

export type PoolId = "basic" | "standard" | "featured" | "era";

export interface PoolConfig {
  id: PoolId;
  name: string;
  emoji: string;
  subtitle: string;
  currency: "faith" | "crystals" | "eraTicket";
  costSingle: number;
  costTen: number;
  baseRates: { rarity: Rarity; weight: number }[];
  tenPullRates: { rarity: Rarity; weight: number }[];
  /** Indicative text shown on the tab. */
  rateHint: string;
}

const STD_BASE: { rarity: Rarity; weight: number }[] = [
  { rarity: "R", weight: 820 },
  { rarity: "SR", weight: 150 },
  { rarity: "SSR", weight: 25 },
  { rarity: "UR", weight: 5 },
];

const STD_TEN: { rarity: Rarity; weight: number }[] = [
  { rarity: "R", weight: 780 },
  { rarity: "SR", weight: 170 },
  { rarity: "SSR", weight: 40 },
  { rarity: "UR", weight: 10 },
];

export const POOLS: Record<PoolId, PoolConfig> = {
  basic: {
    id: "basic",
    name: "信念召喚",
    emoji: "🕯️",
    subtitle: "以日常累積的信念換取一次低語。",
    currency: "faith",
    costSingle: 60,
    costTen: 540,
    baseRates: [
      { rarity: "R", weight: 880 },
      { rarity: "SR", weight: 100 },
      { rarity: "SSR", weight: 16 },
      { rarity: "UR", weight: 4 },
    ],
    tenPullRates: [
      { rarity: "R", weight: 850 },
      { rarity: "SR", weight: 120 },
      { rarity: "SSR", weight: 25 },
      { rarity: "UR", weight: 5 },
    ],
    rateHint: "R 88% · SR 10% · SSR 1.6% · UR 0.4%",
  },
  standard: {
    id: "standard",
    name: "標準召喚",
    emoji: "💎",
    subtitle: "常駐水晶池,完整機率與保底。",
    currency: "crystals",
    costSingle: 150,
    costTen: 1350,
    baseRates: STD_BASE,
    tenPullRates: STD_TEN,
    rateHint: "R 82.5% · SR 15% · SSR 2.5% · UR 0.5%",
  },
  featured: {
    id: "featured",
    name: "本週限定",
    emoji: "✨",
    subtitle: "每週輪替 UR —— UR 機率加倍,中時 50% 命中本週主角。",
    currency: "crystals",
    costSingle: 160,
    costTen: 1440,
    baseRates: [
      { rarity: "R", weight: 810 },
      { rarity: "SR", weight: 150 },
      { rarity: "SSR", weight: 30 },
      { rarity: "UR", weight: 10 },
    ],
    tenPullRates: [
      { rarity: "R", weight: 770 },
      { rarity: "SR", weight: 170 },
      { rarity: "SSR", weight: 45 },
      { rarity: "UR", weight: 15 },
    ],
    rateHint: "UR 機率 ×2 · 中 UR 時 50% 必為本週主角",
  },
  era: {
    id: "era",
    name: "時代專召",
    emoji: "🎟️",
    subtitle: "鎖定單一時代的卡,以時代券召喚。擊敗 BOSS 取得。",
    currency: "eraTicket",
    costSingle: 1,
    costTen: 9,
    baseRates: STD_BASE,
    tenPullRates: STD_TEN,
    rateHint: "機率同標準池 · 所有抽到的卡必為所選時代 · 十連 9 券 (10% 折)",
  },
};

export function getPool(id: PoolId): PoolConfig {
  return POOLS[id];
}

// ─────────────────────────────────────────────────────────────────────────
// Weekly featured UR rotation
// ─────────────────────────────────────────────────────────────────────────

/** ISO-ish week number from Jan 1 UTC — stable within a UTC week. */
export function weekNumberUtc(d: Date = new Date()): number {
  const onejan = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - onejan) / (7 * 24 * 60 * 60 * 1000));
}

export function msUntilNextWeekRotation(d: Date = new Date()): number {
  const week = weekNumberUtc(d);
  const onejan = Date.UTC(d.getUTCFullYear(), 0, 1);
  const nextBoundary = onejan + (week + 1) * 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, nextBoundary - d.getTime());
}

/**
 * Pick the featured UR card id for the current week from a pool of UR card
 * ids. Deterministic so all players see the same featured UR during a week.
 */
export function pickFeaturedUrId(
  urCardIds: string[],
  d: Date = new Date(),
): string | null {
  if (urCardIds.length === 0) return null;
  const idx = weekNumberUtc(d) % urCardIds.length;
  return urCardIds[idx];
}
