/**
 * Tower of Whispers (幽音塔) — pure data + helpers, no DB / IO.
 *
 * The tower is a vertical gauntlet with no fixed end. Each floor:
 *   - rolls a deterministic enemy from the floor's "tier" pool
 *   - applies escalating EnemyModifiers (more shield / mana / enrage)
 *   - awards essence + occasional tower tokens on clear
 *
 * Determinism notes:
 *   - Enemy pool selection uses (userId, floor) as a hash so the run
 *     feels coherent ("on floor 3 I always face X for this run")
 *     without forcing every player to face the same opponent on the
 *     same floor — it's a stable per-user roll.
 *   - Modifier curves are pure functions of the floor number.
 */

import type { EnemyModifiers } from "@/lib/battle/engine";
import { ERAS } from "@/lib/constants/eras";

/** Number of floors in a "wing" — clearing a wing yields tokens. */
export const TOWER_FLOORS_PER_WING = 5;

/** Soft ceiling on the displayed floor count; the tower keeps going
 *  beyond this but with extreme difficulty. */
export const TOWER_MAX_FLOOR_DISPLAY = 30;

interface TowerFloorPlan {
  /** 1-indexed floor number. */
  floor: number;
  /** The era whose deck pool the enemy is drawn from. */
  eraId: string;
  /** Enemy display name for the prep screen + battle banner. */
  enemyName: string;
  /** Enemy HP (scales with floor). */
  enemyHp: number;
  /** Engine modifiers (shield / mana / enrage threshold). */
  enemyMods: EnemyModifiers;
  /** Floor tier label shown in UI ("試煉 / 精英 / BOSS"). */
  tierLabel: string;
  /** Whether this floor counts as a "wing boss" (every 5th floor). */
  isWingBoss: boolean;
  /** Reward preview displayed before the battle starts. */
  rewardPreview: TowerReward;
}

export interface TowerReward {
  essence: number;
  /** Tower tokens awarded only on wing-boss floors. */
  towerTokens: number;
  /** Crystals trickle (small). */
  crystals: number;
  /** Lifetime first-clear bonus (only on the very first time the player
   *  reaches this floor — checked at API time against highestLevel). */
  firstClearEssence: number;
}

/** A pool of enemy boss names per era — re-uses the trial-chapter rosters
 *  from STAGE_ERAS to keep the tower thematically rooted. */
const ERA_ENEMY_POOL: Record<string, string[]> = {
  primitive: ["獸骨巫師", "冰河幽靈", "薩滿之眼", "歲熊之靈"],
  mesopotamia: ["泥板咒師", "塔影追獵", "雪松林守衛", "伊絲塔使者"],
  egypt: ["墓穴守護", "亡者之靈", "黃金之心", "荷魯斯羽士"],
  greek: ["迷宮守衛", "神諭回聲", "美杜莎之影", "狄俄尼索斯僧侶"],
  han: ["宮廷術士", "龍影幻術", "崑崙門徒", "方士頭領"],
  norse: ["狼群斥候", "瓦爾哈拉先兆", "英靈殿門衛", "海姆達爾影子"],
  medieval: ["地牢獄卒", "黑彌撒信徒", "宗教法庭主審", "煉金術士"],
  sengoku: ["忍者監視", "妖怪先遣", "鎮魂社人", "陰陽師門徒"],
  ming: ["御林護法", "夜禁巡守", "司禮太監", "鎮殿龍衛"],
  modern: ["AI 監視員", "演算法執行者", "資訊戰士", "影子代理"],
};

function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Plan one tower floor given the user (for deterministic-per-user
 * variation) and a 1-indexed floor number.
 */
export function planTowerFloor(userId: string, floor: number): TowerFloorPlan {
  const eraIdx = hash(`${userId}:era:${floor}`) % ERAS.length;
  const eraId = ERAS[eraIdx].id;
  const pool = ERA_ENEMY_POOL[eraId] ?? ["影子守衛"];
  const enemyName = pool[hash(`${userId}:name:${floor}`) % pool.length];

  // HP curve: 30 base + 6 per floor + +20 every wing-boss floor.
  const isWingBoss = floor % TOWER_FLOORS_PER_WING === 0;
  const baseHp = 30 + floor * 6 + (isWingBoss ? 20 : 0);

  // Modifier curve. Floors 1-4 are gentle so a fresh run feels winnable
  // even on a green deck; from floor 5 onward we layer shield + mana.
  const mods: EnemyModifiers = {};
  if (floor >= 5) mods.startShield = Math.min(12, Math.floor(floor / 2));
  if (floor >= 8) mods.extraStartMana = Math.min(3, Math.floor((floor - 5) / 4));
  if (isWingBoss) {
    mods.enrageAt = 0.5;
    mods.label = "幽音塔 BOSS";
  } else if (floor >= 10) {
    mods.enrageAt = 0.4;
  }

  const tierLabel = isWingBoss
    ? "守關 BOSS"
    : floor < TOWER_FLOORS_PER_WING
      ? "試煉"
      : floor < TOWER_FLOORS_PER_WING * 3
        ? "精英"
        : "深層";

  return {
    floor,
    eraId,
    enemyName,
    enemyHp: baseHp,
    enemyMods: mods,
    tierLabel,
    isWingBoss,
    rewardPreview: planTowerReward(floor),
  };
}

export function planTowerReward(floor: number): TowerReward {
  const isWingBoss = floor % TOWER_FLOORS_PER_WING === 0;
  return {
    essence: 1 + Math.floor(floor / 3),
    towerTokens: isWingBoss ? 1 : 0,
    crystals: 25 + floor * 5,
    firstClearEssence: isWingBoss ? 5 : 2,
  };
}

/**
 * Build the enemy deck for a tower floor by sampling a fixed-size deck
 * from the matched era's R-rarity pool of card ids. Designed to be
 * called from the battle prep page after we know the era.
 *
 * Returns an array of card ids (the page resolves them to BattleCards
 * via the same enrichCardKeywords path the main battle uses).
 */
export function buildTowerEnemyDeckIds(
  pool: string[],
  floor: number,
  userId: string,
): string[] {
  // 16 cards, sampled with replacement so deeper floors don't run out
  // of options on small pools. Repetition is a feature here — the
  // tower is supposed to feel relentlessly thematic.
  const out: string[] = [];
  const size = Math.min(20, 14 + Math.floor(floor / 3));
  for (let i = 0; i < size; i++) {
    const idx = hash(`${userId}:deck:${floor}:${i}`) % pool.length;
    out.push(pool[idx]);
  }
  return out;
}
