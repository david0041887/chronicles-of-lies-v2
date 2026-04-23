import { prisma } from "@/lib/prisma";

/**
 * Daily missions — 3 tasks per UTC day, reset at 00:00 UTC.
 *
 * Storage: User.dailyMissions Json
 *   { date: "YYYY-MM-DD", slots: [{ id, target, progress, claimed }, ...] }
 *
 * On any page-load that calls ensureTodaysMissions(), missions are regenerated
 * if the stored date is stale. Progress is mutated by event-driven calls from
 * battle/gacha/forge routes via progressMission(userId, eventType, delta).
 *
 * Rewards: uniform across difficulties to keep reward grid predictable.
 */

export const MISSION_REWARD = {
  crystals: 120,
  faith: 60,
};

export type MissionEvent =
  | "battle_win"
  | "card_played"
  | "attack_played"
  | "gacha_pull"
  | "forge_action"
  | "boss_clear"
  | "crystals_spent"
  | "faith_spent";

export interface MissionTemplate {
  id: string;
  event: MissionEvent;
  target: number;
  label: string;
  icon: string;
}

export const TEMPLATES: MissionTemplate[] = [
  { id: "win3",      event: "battle_win",    target: 3,   label: "贏得 3 場戰鬥",        icon: "🏆" },
  { id: "cards20",   event: "card_played",   target: 20,  label: "打出 20 張牌",         icon: "🎴" },
  { id: "attacks10", event: "attack_played", target: 10,  label: "打出 10 張攻擊牌",     icon: "⚔️" },
  { id: "pull5",     event: "gacha_pull",    target: 5,   label: "召喚 5 張卡",          icon: "🌀" },
  { id: "forge2",    event: "forge_action",  target: 2,   label: "完成 2 次鍛造",        icon: "⚒️" },
  { id: "boss1",     event: "boss_clear",    target: 1,   label: "擊敗 1 個時代 BOSS",   icon: "👑" },
  { id: "crys300",   event: "crystals_spent",target: 300, label: "召喚消耗 300 水晶",    icon: "💎" },
  { id: "faith200",  event: "faith_spent",   target: 200, label: "召喚消耗 200 信念幣",  icon: "🕯️" },
];

const TPL_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export interface MissionSlot {
  id: string;
  target: number;
  progress: number;
  claimed: boolean;
}

export interface DailyMissionsState {
  date: string;
  slots: MissionSlot[];
}

function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic daily pick: 3 unique templates per (userId × date). */
export function pickMissionsFor(userId: string, date: string): MissionSlot[] {
  const seed = hash(`${userId}|${date}`);
  const order = TEMPLATES.slice().sort((a, b) => {
    const ha = hash(a.id + seed);
    const hb = hash(b.id + seed);
    return ha - hb;
  });
  return order.slice(0, 3).map((t) => ({
    id: t.id,
    target: t.target,
    progress: 0,
    claimed: false,
  }));
}

function parseState(raw: unknown): DailyMissionsState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.date !== "string" || !Array.isArray(o.slots)) return null;
  const slots = o.slots
    .filter(
      (s): s is MissionSlot =>
        !!s &&
        typeof (s as MissionSlot).id === "string" &&
        typeof (s as MissionSlot).target === "number" &&
        typeof (s as MissionSlot).progress === "number" &&
        typeof (s as MissionSlot).claimed === "boolean",
    );
  if (slots.length === 0) return null;
  return { date: o.date, slots };
}

/**
 * Read-and-regenerate: if stored state's date doesn't match today (UTC),
 * replace with fresh slots and persist. Returns the fresh state.
 */
export async function ensureTodaysMissions(
  userId: string,
): Promise<DailyMissionsState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyMissions: true },
  });
  const today = utcDateString();
  const parsed = parseState(user?.dailyMissions);
  if (parsed && parsed.date === today) return parsed;
  const fresh: DailyMissionsState = {
    date: today,
    slots: pickMissionsFor(userId, today),
  };
  await prisma.user.update({
    where: { id: userId },
    data: { dailyMissions: fresh as unknown as object },
  });
  return fresh;
}

/** Returns template for enriching slot display. */
export function enrichSlot(slot: MissionSlot): MissionSlot & {
  template: MissionTemplate;
  completed: boolean;
} {
  const tpl = TPL_BY_ID.get(slot.id)!;
  return {
    ...slot,
    template: tpl,
    completed: slot.progress >= slot.target,
  };
}

/**
 * Increment progress for all of today's matching mission slots. Called from
 * battle/gacha/forge handlers. Safe no-op if no slot matches the event.
 */
export async function progressMission(
  userId: string,
  event: MissionEvent,
  delta: number,
): Promise<void> {
  if (delta <= 0) return;
  const state = await ensureTodaysMissions(userId);
  let touched = false;
  const updated: MissionSlot[] = state.slots.map((slot) => {
    const tpl = TPL_BY_ID.get(slot.id);
    if (!tpl || tpl.event !== event || slot.claimed) return slot;
    const nextProgress = Math.min(slot.target, slot.progress + delta);
    if (nextProgress !== slot.progress) touched = true;
    return { ...slot, progress: nextProgress };
  });
  if (!touched) return;
  const next: DailyMissionsState = { date: state.date, slots: updated };
  await prisma.user.update({
    where: { id: userId },
    data: { dailyMissions: next as unknown as object },
  });
}

export async function claimMission(
  userId: string,
  slotId: string,
): Promise<{ ok: true; crystals: number; faith: number } | { ok: false; error: string }> {
  const state = await ensureTodaysMissions(userId);
  const slot = state.slots.find((s) => s.id === slotId);
  if (!slot) return { ok: false, error: "任務不存在" };
  if (slot.claimed) return { ok: false, error: "已領取" };
  if (slot.progress < slot.target) return { ok: false, error: "進度未達標" };

  const nextSlots = state.slots.map((s) =>
    s.id === slotId ? { ...s, claimed: true } : s,
  );
  const next: DailyMissionsState = { date: state.date, slots: nextSlots };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        dailyMissions: next as unknown as object,
        crystals: { increment: MISSION_REWARD.crystals },
        faith: { increment: MISSION_REWARD.faith },
      },
    }),
  ]);

  return { ok: true, ...MISSION_REWARD };
}
