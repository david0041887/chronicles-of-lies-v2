import type { Rarity } from "@prisma/client";

export const MAX_STARS = 6;
export const STAR_POWER_PER_STEP = 0.15;

// Duplicates required to go from N★ → N+1★ (index = current star)
// stars 1→2 costs 1, 2→3 costs 2, ... 5→6 costs 16. Total to 6★ = 31.
export const STAR_COST: readonly number[] = [0, 1, 2, 4, 8, 16];

export function copiesNeeded(currentStars: number): number {
  if (currentStars < 1 || currentStars >= MAX_STARS) return 0;
  return STAR_COST[currentStars];
}

export function powerMultiplier(stars: number): number {
  return 1 + STAR_POWER_PER_STEP * Math.max(0, stars - 1);
}

export function effectivePower(basePower: number, stars: number): number {
  return Math.round(basePower * powerMultiplier(stars));
}

export const NEXT_RARITY: Record<Rarity, Rarity | null> = {
  R: "SR",
  SR: "SSR",
  SSR: "UR",
  UR: null,
};

export const FUSION_INPUTS = 3;
