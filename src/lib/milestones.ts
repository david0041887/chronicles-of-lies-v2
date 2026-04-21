/**
 * Milestone-based free-pull rewards.
 *
 * Each milestone has a predicate that checks if a user has earned it,
 * and a `pulls` count granted on claim. Claims are idempotent via
 * User.claimedMilestones[].
 */

export interface MilestoneDef {
  id: string;
  title: string;
  desc: string;
  pulls: number;
  /** Human hint shown on /home for uncompleted milestones */
  hint: string;
}

export interface MilestoneUserSnapshot {
  level: number;
  battlesWon: number;
  bossesCleared: number;
  eraClearCount: number; // number of stages cleared across all eras
}

export interface MilestoneState extends MilestoneDef {
  completed: boolean;
  claimed: boolean;
  progress: { current: number; target: number } | null;
}

export const MILESTONES: readonly MilestoneDef[] = [
  {
    id: "tutorial",
    title: "完成新手教學",
    desc: "第一次召喚的感覺,永遠只有一次。",
    pulls: 10,
    hint: "請先完成教學戰",
  },
  {
    id: "battles_3",
    title: "首 3 場勝利",
    desc: "小試牛刀。",
    pulls: 10,
    hint: "再贏 {n} 場戰鬥",
  },
  {
    id: "battles_10",
    title: "戰鬥狂熱",
    desc: "你開始理解帷幕的韻律。",
    pulls: 15,
    hint: "再贏 {n} 場戰鬥",
  },
  {
    id: "boss_first",
    title: "首位 BOSS 被擊敗",
    desc: "時代頭領不再神秘。",
    pulls: 20,
    hint: "擊敗任一時代 BOSS",
  },
  {
    id: "boss_three",
    title: "三位 BOSS 倒下",
    desc: "三個時代臣服於你。",
    pulls: 30,
    hint: "再擊敗 {n} 位 BOSS",
  },
  {
    id: "level_5",
    title: "達到 Lv.5",
    desc: "新生編織者的第一個門檻。",
    pulls: 10,
    hint: "還差 {n} 級",
  },
  {
    id: "level_10",
    title: "達到 Lv.10",
    desc: "編織者議會開始注意你。",
    pulls: 15,
    hint: "還差 {n} 級",
  },
  {
    id: "level_20",
    title: "達到 Lv.20",
    desc: "正式編織者。",
    pulls: 25,
    hint: "還差 {n} 級",
  },
];

interface MilestoneLogic {
  check(s: MilestoneUserSnapshot): boolean;
  progress?: (s: MilestoneUserSnapshot) => { current: number; target: number };
}

const LOGIC: Record<string, MilestoneLogic> = {
  tutorial: { check: () => false }, // granted elsewhere (tutorial completion sets claimed directly)
  battles_3: {
    check: (s) => s.battlesWon >= 3,
    progress: (s) => ({ current: Math.min(3, s.battlesWon), target: 3 }),
  },
  battles_10: {
    check: (s) => s.battlesWon >= 10,
    progress: (s) => ({ current: Math.min(10, s.battlesWon), target: 10 }),
  },
  boss_first: {
    check: (s) => s.bossesCleared >= 1,
    progress: (s) => ({ current: Math.min(1, s.bossesCleared), target: 1 }),
  },
  boss_three: {
    check: (s) => s.bossesCleared >= 3,
    progress: (s) => ({ current: Math.min(3, s.bossesCleared), target: 3 }),
  },
  level_5: {
    check: (s) => s.level >= 5,
    progress: (s) => ({ current: Math.min(5, s.level), target: 5 }),
  },
  level_10: {
    check: (s) => s.level >= 10,
    progress: (s) => ({ current: Math.min(10, s.level), target: 10 }),
  },
  level_20: {
    check: (s) => s.level >= 20,
    progress: (s) => ({ current: Math.min(20, s.level), target: 20 }),
  },
};

export function evaluate(
  snap: MilestoneUserSnapshot,
  claimedIds: string[],
): MilestoneState[] {
  const claimedSet = new Set(claimedIds);
  return MILESTONES.map((m) => {
    const l = LOGIC[m.id];
    const completed = l?.check(snap) ?? false;
    return {
      ...m,
      completed,
      claimed: claimedSet.has(m.id),
      progress: l?.progress?.(snap) ?? null,
    };
  });
}

export function getMilestoneDef(id: string): MilestoneDef | undefined {
  return MILESTONES.find((m) => m.id === id);
}
