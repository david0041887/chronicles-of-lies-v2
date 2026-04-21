import crypto from "crypto";
import type { Rarity } from "@prisma/client";

/**
 * Rates v2 (tuned up per user request 2026-04-21):
 *   R  75%   SR  19%   SSR  5%   UR  1%
 * Pity:
 *   SR  — 50 pulls guarantee SR+
 *   SSR — 70 pulls guarantee SSR+
 *   UR  — 150 pulls guarantee UR
 * 10-pull boost:
 *   - Guarantees AT LEAST 2 × SR+
 *   - Slight SSR rate bump (~+2pp)
 */

const BASE_RATES: { rarity: Rarity; weight: number }[] = [
  { rarity: "R", weight: 750 },
  { rarity: "SR", weight: 190 },
  { rarity: "SSR", weight: 50 },
  { rarity: "UR", weight: 10 },
];

const TEN_PULL_RATES: { rarity: Rarity; weight: number }[] = [
  { rarity: "R", weight: 720 },
  { rarity: "SR", weight: 200 },
  { rarity: "SSR", weight: 70 },
  { rarity: "UR", weight: 10 },
];

export const PITY_SR = 50;
export const PITY_SSR = 70;
export const PITY_UR = 150;
export const TEN_PULL_SR_GUARANTEE = 2;

export const COST_SINGLE = 150;
export const COST_TEN = 1500;

const RANK: Record<Rarity, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };

function weightedPick(items: { rarity: Rarity; weight: number }[]): Rarity {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = crypto.randomInt(0, total);
  for (const it of items) {
    if (roll < it.weight) return it.rarity;
    roll -= it.weight;
  }
  return items[items.length - 1].rarity;
}

interface RollState {
  pitySR: number;
  pitySSR: number;
  pityUR: number;
}

function applyRarity(state: RollState, rarity: Rarity) {
  state.pitySR = RANK[rarity] >= RANK.SR ? 0 : state.pitySR + 1;
  state.pitySSR = RANK[rarity] >= RANK.SSR ? 0 : state.pitySSR + 1;
  state.pityUR = RANK[rarity] >= RANK.UR ? 0 : state.pityUR + 1;
}

/** Pull a single card rarity, applying pity. Mutates state. */
export function rollOne(
  state: RollState,
  table = BASE_RATES,
): Rarity {
  let rarity: Rarity;

  if (state.pityUR + 1 >= PITY_UR) {
    rarity = "UR";
  } else if (state.pitySSR + 1 >= PITY_SSR) {
    // Guarantee SSR+ at 70; 10% chance to be UR
    rarity = crypto.randomInt(0, 100) < 10 ? "UR" : "SSR";
  } else if (state.pitySR + 1 >= PITY_SR) {
    // Guarantee SR+; tilt SSR within it
    const r = crypto.randomInt(0, 100);
    rarity = r < 5 ? "SSR" : r < 30 ? "SR" : "SR";
  } else {
    rarity = weightedPick(table);
  }

  applyRarity(state, rarity);
  return rarity;
}

/**
 * Pull N cards. If N===10, guarantees at least TEN_PULL_SR_GUARANTEE SR+.
 * When promoting, we bump the *lowest-rarity* entries first.
 */
export function pullRarities(
  count: number,
  startPity: RollState,
): { rarities: Rarity[]; finalPity: RollState } {
  const state: RollState = { ...startPity };
  const rarities: Rarity[] = [];
  const table = count === 10 ? TEN_PULL_RATES : BASE_RATES;

  for (let i = 0; i < count; i++) {
    rarities.push(rollOne(state, table));
  }

  if (count === 10) {
    const srPlus = rarities.filter((r) => RANK[r] >= RANK.SR).length;
    const needed = TEN_PULL_SR_GUARANTEE - srPlus;
    if (needed > 0) {
      // Promote N random R slots to SR
      const rIndices = rarities
        .map((r, i) => (r === "R" ? i : -1))
        .filter((i) => i >= 0);
      // Pick needed random indices
      for (let k = 0; k < needed && rIndices.length > 0; k++) {
        const idx = rIndices.splice(crypto.randomInt(0, rIndices.length), 1)[0];
        rarities[idx] = "SR";
      }
      // Re-compute pity from scratch since we changed outcomes
      const fresh: RollState = { ...startPity };
      for (const r of rarities) applyRarity(fresh, r);
      return { rarities, finalPity: fresh };
    }
  }

  return { rarities, finalPity: state };
}
