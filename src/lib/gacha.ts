import crypto from "crypto";
import type { Rarity } from "@prisma/client";

// Base rates per spec §5.1 (scaled without UR since MVP pool has no UR)
const BASE_RATES: { rarity: Rarity; weight: number }[] = [
  { rarity: "R", weight: 850 },
  { rarity: "SR", weight: 120 },
  { rarity: "SSR", weight: 30 },
];

const PITY_SR = 50;   // 50 rolls without SR+ → guaranteed SR+
const PITY_SSR = 90;  // 90 rolls without SSR+ → guaranteed SSR

export const COST_SINGLE = 150;
export const COST_TEN = 1500;

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
}

/** Pull a single card rarity, applying pity. Mutates state. */
export function rollOne(state: RollState): Rarity {
  let rarity: Rarity;

  if (state.pitySSR + 1 >= PITY_SSR) {
    rarity = "SSR";
  } else if (state.pitySR + 1 >= PITY_SR) {
    // Guarantee SR+, tilt SSR chance within it
    const roll = crypto.randomInt(0, 100);
    rarity = roll < 20 ? "SSR" : "SR";
  } else {
    rarity = weightedPick(BASE_RATES);
  }

  if (rarity === "R") {
    state.pitySR++;
    state.pitySSR++;
  } else if (rarity === "SR") {
    state.pitySR = 0;
    state.pitySSR++;
  } else if (rarity === "SSR") {
    state.pitySR = 0;
    state.pitySSR = 0;
  }

  return rarity;
}

/** Pull N cards. If N===10 and no SR+ was drawn, promotes the last to SR. */
export function pullRarities(count: number, startPity: RollState): { rarities: Rarity[]; finalPity: RollState } {
  const state: RollState = { ...startPity };
  const rarities: Rarity[] = [];

  for (let i = 0; i < count; i++) {
    rarities.push(rollOne(state));
  }

  if (count === 10 && !rarities.some((r) => r === "SR" || r === "SSR")) {
    // Promote last R to SR (10-pull SR guarantee)
    const lastIdx = rarities.length - 1;
    rarities[lastIdx] = "SR";
    // Fix pity counters: we removed one R and added one SR
    state.pitySR = 0;
  }

  return { rarities, finalPity: state };
}
