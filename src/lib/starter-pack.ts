import crypto from "crypto";
import type { Rarity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pullRarities } from "@/lib/gacha";

export const TOTAL_ROUNDS = 5;
export const CHOICES_PER_ROUND = 4;
export const CARDS_PER_CHOICE = 10;

const RANK: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };

/** Pre-generate the entire 5×4×10 starter banner grid for a user. */
export async function rollStarterGrid(): Promise<string[][][]> {
  // Fetch all cards once, bucket by rarity
  const allCards = await prisma.card.findMany({
    select: { id: true, rarity: true },
  });
  const pool: Record<Rarity, string[]> = { R: [], SR: [], SSR: [], UR: [] };
  for (const c of allCards) pool[c.rarity].push(c.id);

  function pickId(r: Rarity): string {
    const bucket = pool[r];
    if (bucket.length === 0) {
      // Fallback: step down to next rarity
      if (r === "UR") return pickId("SSR");
      if (r === "SSR") return pickId("SR");
      if (r === "SR") return pickId("R");
      throw new Error("empty pool R");
    }
    return bucket[crypto.randomInt(0, bucket.length)];
  }

  const grid: string[][][] = [];

  for (let round = 0; round < TOTAL_ROUNDS; round++) {
    const choices: string[][] = [];
    for (let c = 0; c < CHOICES_PER_ROUND; c++) {
      // Use a fresh pity state per 10-pull so each choice is independent
      const { rarities } = pullRarities(CARDS_PER_CHOICE, {
        pitySR: 0,
        pitySSR: 0,
        pityUR: 0,
      });

      // Round 1 bonus: guarantee at least one SSR+ in every choice
      // (so no matter which of 4 the player picks, they get an SSR gift)
      if (round === 0) {
        const hasSSR = rarities.some((x) => RANK[x] >= RANK.SSR);
        if (!hasSSR) {
          const rIdx = rarities.findIndex((x) => x === "R" || x === "SR");
          rarities[rIdx >= 0 ? rIdx : 0] = "SSR";
        }
      }

      const ids = rarities.map((r) => pickId(r));
      choices.push(ids);
    }
    grid.push(choices);
  }

  return grid;
}

export interface StarterSummary {
  rolls: string[][][];
  picks: number[];
  claimedAt: Date | null;
}

export async function getOrCreateStarter(userId: string): Promise<StarterSummary> {
  const existing = await prisma.startingReward.findUnique({ where: { userId } });
  if (existing) {
    return {
      rolls: existing.rolls as string[][][],
      picks: existing.picks,
      claimedAt: existing.claimedAt,
    };
  }
  const rolls = await rollStarterGrid();
  const created = await prisma.startingReward.create({
    data: { userId, rolls },
  });
  return {
    rolls: rolls,
    picks: created.picks,
    claimedAt: created.claimedAt,
  };
}
