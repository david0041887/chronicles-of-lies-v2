import type { BattleCard } from "./types";

/**
 * Deterministically enrich a card's keyword list so existing DB rows gain
 * meaningful skills without a migration.
 *
 * Rules (derived from rarity × type):
 *   — Every card keeps its original keywords.
 *   — Higher-rarity cards pick up more keywords.
 *   — Type drives flavour: attacks lean pierce/combo/lifesteal,
 *     debuffs lean poison/vulnerable/weaken, rituals lean sacrifice/echo,
 *     heals lean shield/lifesteal, buffs lean strength/resonance.
 *
 * All additions are idempotent (no duplicates).
 */
export function enrichCardKeywords(card: BattleCard): BattleCard {
  const add = new Set(card.keywords);
  const hash = simpleHash(card.id);
  const bit = (n: number) => ((hash >> n) & 1) === 1;

  const rarity = card.rarity;
  const type = card.type;

  // ── MINION classification ──
  // Attack/ritual cards at SR+ become summoned creatures that persist on
  // the board and trade blows with the enemy; R-rarity and non-combat
  // cards stay as one-shot spells. This gives roughly a 40/60 minion-to-
  // spell ratio across the 180-card library.
  if (rarity !== "R" && (type === "attack" || type === "ritual")) {
    add.add("minion");
    // Rarity-scaled keywords for minions:
    if (rarity === "SSR" || rarity === "UR") add.add("taunt");
    if (type === "ritual") add.add("charge");
    if (rarity === "UR") add.add("divine_shield");
    if (rarity === "UR" && bit(5)) add.add("windfury");
  }

  // UR → gets echo + one extra signature skill by type
  if (rarity === "UR") {
    add.add("echo");
    if (type === "attack" || type === "ritual") add.add("strength");
    if (type === "heal" || type === "spread") add.add("lifesteal");
    if (type === "debuff" || type === "confuse") add.add("poison");
  }

  // SSR → resonance (era synergy) + a rarer effect
  if (rarity === "SSR" || rarity === "UR") {
    add.add("resonance");
    if (type === "ritual") add.add("sacrifice");
    if (type === "buff") add.add("strength");
  }

  // SR+ gets type-flavoured active keyword
  if (rarity !== "R") {
    if (type === "attack") {
      add.add("pierce");
      if (bit(1)) add.add("combo");
      if (rarity === "SSR" || rarity === "UR") add.add("lifesteal");
    } else if (type === "debuff") {
      add.add("vulnerable");
      if (bit(2)) add.add("weaken");
    } else if (type === "confuse") {
      add.add("vulnerable");
      if (rarity === "SSR" || rarity === "UR") add.add("charm");
    } else if (type === "heal") {
      add.add("shield");
      if (rarity === "SSR" || rarity === "UR") add.add("lifesteal");
    } else if (type === "spread") {
      add.add("haste");
    } else if (type === "ritual") {
      if (bit(3)) add.add("poison");
      if (rarity === "SSR" || rarity === "UR") add.add("sacrifice");
    } else if (type === "buff") {
      if (bit(4)) add.add("resonance");
    }
  }

  // R with high-ish power gets one light flavour keyword
  if (rarity === "R") {
    if (type === "attack" && card.power >= 5 && bit(0)) add.add("combo");
    if (type === "debuff" && bit(1)) add.add("weaken");
    if (type === "heal" && bit(2)) add.add("shield");
    if (type === "spread" && bit(3)) add.add("haste");
  }

  return { ...card, keywords: Array.from(add) };
}

function simpleHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
