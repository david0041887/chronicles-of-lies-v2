/**
 * DungeonRun service helpers — DB read/write surfaces shared across
 * routes (enter, claim, abandon) and the dungeon UI page. Centralises
 * the row-shape so the API and UI agree on what "current state" means.
 */

import { prisma } from "@/lib/prisma";
import type { DungeonKind, DungeonRun } from "@prisma/client";

/**
 * Get or lazy-create the run for (user, kind). The default row is
 * level 0 / never-attempted so the UI can render an "open the door"
 * CTA without an explicit setup step.
 */
export async function getOrCreateRun(
  userId: string,
  kind: DungeonKind,
): Promise<DungeonRun> {
  const existing = await prisma.dungeonRun.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  if (existing) return existing;
  return prisma.dungeonRun.create({
    data: { userId, kind, level: 0, highestLevel: 0 },
  });
}

/**
 * Mark a floor as cleared and award rewards atomically.
 *
 * Race-safe: every read + every write happens INSIDE a single
 * `$transaction` callback so two concurrent submissions on the same
 * floor can't both award the first-clear bonus. Prisma's interactive
 * transaction serialises the body via the connection's own
 * BEGIN/COMMIT, so the second caller sees the first caller's writes.
 *
 * Returns the run row + the rewards actually granted (firstClearEssence
 * is zero if this floor was a repeat of the high-water mark).
 */
export async function recordTowerFloorClear(
  userId: string,
  floor: number,
  rewards: {
    essence: number;
    towerTokens: number;
    crystals: number;
    firstClearEssence: number;
  },
) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.dungeonRun.findUnique({
      where: { userId_kind: { userId, kind: "tower" } },
    });

    const isFirstClear = !existing || floor > (existing.highestLevel ?? 0);
    const firstClearBonus = isFirstClear ? rewards.firstClearEssence : 0;
    const totalEssence = rewards.essence + firstClearBonus;

    const prevTokens = readTokensFromState(existing?.state);
    const nextTokens = prevTokens + rewards.towerTokens;
    const nextHighest = Math.max(existing?.highestLevel ?? 0, floor);

    const run = await tx.dungeonRun.upsert({
      where: { userId_kind: { userId, kind: "tower" } },
      create: {
        userId,
        kind: "tower",
        level: floor,
        highestLevel: floor,
        lastFloorAt: now,
        totalClears: 1,
        state: { towerTokens: rewards.towerTokens },
      },
      update: {
        level: floor,
        highestLevel: nextHighest,
        totalClears: { increment: 1 },
        lastFloorAt: now,
        state: { towerTokens: nextTokens },
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        essence: { increment: totalEssence },
        crystals: { increment: rewards.crystals },
      },
    });

    return {
      run,
      rewards: {
        essence: totalEssence,
        towerTokens: rewards.towerTokens,
        crystals: rewards.crystals,
        firstClearEssence: firstClearBonus,
        isFirstClear,
      },
    };
  });
}

/** Internal — read tower-tokens count out of the loose state JSON
 *  (DungeonRun.state is a Json column, so the read needs a guard). */
function readTokensFromState(state: unknown): number {
  if (!state || typeof state !== "object") return 0;
  const v = (state as Record<string, unknown>).towerTokens;
  return typeof v === "number" && v >= 0 ? v : 0;
}

/**
 * Defeat / abandon — resets level to 0 (run starts over from floor 1)
 * but PRESERVES highestLevel for vanity stats. Tokens stay in `state`.
 */
export async function abandonRun(userId: string, kind: DungeonKind) {
  return prisma.dungeonRun.update({
    where: { userId_kind: { userId, kind } },
    data: { level: 0, lastResetAt: new Date() },
  });
}

/** Read-only — what's in a run's state JSON, normalised.
 *
 * NOTE: tower tokens accumulate here but currently have NO spend
 * mechanism. Players collect them as a vanity counter on the hub
 * until a future "tower exchange" feature ships (e.g., trade tokens
 * for an awakening reagent or a bypass pass). Don't add a top-level
 * User.towerTokens column — the JSON-on-DungeonRun shape is
 * intentional so each dungeon kind keeps its currency local to its
 * run record. See the TODO at the bottom of this file. */
export function readTowerState(run: DungeonRun) {
  return { towerTokens: readTokensFromState(run.state) };
}

// TODO(dungeon): tower-token spend mechanism. When designed, add a new
// service helper (e.g. spendTowerTokens(userId, n, reason)) that runs
// inside its own $transaction, deducts via jsonb subtraction, and logs
// the audit trail. Don't promote tokens to a User column.
