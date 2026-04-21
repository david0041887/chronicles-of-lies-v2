/**
 * Weaver Level — single-currency progression driven by total accumulated 信徒.
 * Replaces the old User.level / User.exp system.
 *
 * Level thresholds are milestone-based (not every level — only levels that
 * unlock something). Between milestones the displayed level stays the same
 * but the progress bar shows progress toward the next milestone.
 */

export interface Milestone {
  level: number;
  threshold: number;
  title: string;
  /** Short UI blurb */
  blurb: string;
}

export const MILESTONES: readonly Milestone[] = [
  { level: 1, threshold: 0, title: "新生編織者", blurb: "起點" },
  { level: 3, threshold: 1_000, title: "帷幕學徒", blurb: "✨ 每日傳說啟動" },
  { level: 5, threshold: 4_000, title: "低語者", blurb: "⚔️ 戰鬥開場手牌 +1" },
  { level: 8, threshold: 10_000, title: "鍛造見習", blurb: "⚒️ 升星/融合素材 −25%" },
  { level: 10, threshold: 18_000, title: "編織者", blurb: "⚔️ 戰鬥開場信仰池 +1" },
  { level: 15, threshold: 40_000, title: "金線守護", blurb: "🎴 抽卡 SSR 機率 +1%" },
  { level: 20, threshold: 90_000, title: "資深編織者", blurb: "⚔️ 信仰池上限 +2" },
  { level: 28, threshold: 250_000, title: "命運之手", blurb: "⚒️ 素材再 −25%(累計 −50%)" },
  { level: 40, threshold: 800_000, title: "議會成員", blurb: "🎁 每週一次免費十連" },
  { level: 50, threshold: 3_000_000, title: "長老席位", blurb: "🌀 終章「帷幕之間」解鎖" },
] as const;

/** Returns the current weaver level (stairs up: floor semantics). */
export function weaverLevel(totalBelievers: number): number {
  let lv = 1;
  for (const m of MILESTONES) {
    if (totalBelievers >= m.threshold) lv = m.level;
    else break;
  }
  return lv;
}

export interface LevelProgress {
  level: number;
  title: string;
  believers: number;
  /** Current tier's threshold. */
  currentThreshold: number;
  /** Next milestone tier threshold (or same if maxed). */
  nextThreshold: number;
  /** Believers gained since current tier. */
  gained: number;
  /** Believers needed to reach the next milestone. */
  toNext: number;
  /** Next milestone blurb (or null if maxed). */
  nextBlurb: string | null;
  /** Progress 0-1 toward next milestone. */
  ratio: number;
  maxed: boolean;
}

export function levelProgress(totalBelievers: number): LevelProgress {
  let currTier: Milestone = MILESTONES[0];
  let nextTier: Milestone | null = MILESTONES[1] ?? null;

  for (let i = 0; i < MILESTONES.length; i++) {
    const m = MILESTONES[i];
    if (totalBelievers >= m.threshold) {
      currTier = m;
      nextTier = MILESTONES[i + 1] ?? null;
    }
  }

  if (!nextTier) {
    return {
      level: currTier.level,
      title: currTier.title,
      believers: totalBelievers,
      currentThreshold: currTier.threshold,
      nextThreshold: currTier.threshold,
      gained: totalBelievers - currTier.threshold,
      toNext: 0,
      nextBlurb: null,
      ratio: 1,
      maxed: true,
    };
  }

  const span = nextTier.threshold - currTier.threshold;
  const gained = totalBelievers - currTier.threshold;
  return {
    level: currTier.level,
    title: currTier.title,
    believers: totalBelievers,
    currentThreshold: currTier.threshold,
    nextThreshold: nextTier.threshold,
    gained,
    toNext: Math.max(0, nextTier.threshold - totalBelievers),
    nextBlurb: nextTier.blurb,
    ratio: Math.max(0, Math.min(1, gained / span)),
    maxed: false,
  };
}

export interface WeaverPerks {
  /** +1 to starting hand size (Lv.5). */
  startHandBonus: number;
  /** +1 to starting mana (Lv.10). */
  startManaBonus: number;
  /** +2 to max mana (Lv.20). */
  maxManaBonus: number;
  /** SSR rate bonus in 1/1000 units (Lv.15: 10 = +1%). */
  ssrRateBonus: number;
  /** Forge cost discount: 0 / 0.25 / 0.5 at Lv.8 / Lv.28. */
  forgeDiscount: number;
  /** Daily-legend effect active? (Lv.3) */
  dailyLegendActive: boolean;
  /** Weekly free 10-pull entitlement (Lv.40, scaffold only). */
  weeklyFreePull: boolean;
}

export function perksForLevel(level: number): WeaverPerks {
  return {
    startHandBonus: level >= 5 ? 1 : 0,
    startManaBonus: level >= 10 ? 1 : 0,
    maxManaBonus: level >= 20 ? 2 : 0,
    ssrRateBonus: level >= 15 ? 10 : 0,
    forgeDiscount: level >= 28 ? 0.5 : level >= 8 ? 0.25 : 0,
    dailyLegendActive: level >= 3,
    weeklyFreePull: level >= 40,
  };
}
