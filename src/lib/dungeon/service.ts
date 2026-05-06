/**
 * DungeonRun service helpers — DB read/write surfaces shared across
 * routes (enter, claim, abandon) and the dungeon UI page. Centralises
 * the row-shape so the API and UI agree on what "current state" means.
 */

import { prisma } from "@/lib/prisma";
import type { DungeonKind, DungeonRun, Prisma } from "@prisma/client";

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
        state: mergeRunState(null, { towerTokens: rewards.towerTokens }),
      },
      update: {
        level: floor,
        highestLevel: nextHighest,
        totalClears: { increment: 1 },
        lastFloorAt: now,
        state: mergeRunState(existing?.state, { towerTokens: nextTokens }),
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

/** Internal — merge a partial update into a DungeonRun.state JSON
 *  blob WITHOUT clobbering keys we don't know about. Earlier writes
 *  used `data: { state: { towerTokens: N } }` directly which replaces
 *  the whole JSON — fine while towerTokens was the only key, but
 *  fragile the moment another dungeon kind drops a key in there.
 *
 *  Returns Prisma.InputJsonValue so it slots straight into a `data`
 *  payload without an explicit cast at every call site. */
function mergeRunState(
  existing: unknown,
  patch: Record<string, Prisma.InputJsonValue>,
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, Prisma.InputJsonValue>)
      : {};
  return { ...base, ...patch };
}

/**
 * Defeat / abandon — resets level to 0 (run starts over from floor 1)
 * but PRESERVES highestLevel for vanity stats. Tokens stay in `state`.
 *
 * Uses upsert to handle the (rare) case where the run row was never
 * created — happens if a dev seeds a battle ticket directly or a row
 * was wiped out of band. Failing the loss-settlement on a missing row
 * would leave the player stuck unable to retry.
 */
export async function abandonRun(userId: string, kind: DungeonKind) {
  return prisma.dungeonRun.upsert({
    where: { userId_kind: { userId, kind } },
    update: { level: 0, lastResetAt: new Date() },
    create: {
      userId,
      kind,
      level: 0,
      highestLevel: 0,
      lastResetAt: new Date(),
    },
  });
}

/** Read-only — what's in a run's state JSON, normalised.
 *
 * NOTE: don't add a top-level User.towerTokens column — the
 * JSON-on-DungeonRun shape is intentional so each dungeon kind keeps
 * its currency local to its run record. Spend path goes through
 * spendTowerTokens() below. */
export function readTowerState(run: DungeonRun) {
  return { towerTokens: readTokensFromState(run.state) };
}

/** Spend tower tokens atomically. Used by /api/dungeon/tower/redeem
 *  to convert tokens into other currencies. Returns the resulting
 *  balance so the UI can update. Throws if balance < cost (the route
 *  catches and returns 400). */
export async function spendTowerTokens(
  userId: string,
  cost: number,
  rewards: { essence?: number; crystals?: number; faith?: number },
): Promise<{ remainingTokens: number }> {
  if (cost <= 0) throw new Error("INVALID_COST");

  return prisma.$transaction(async (tx) => {
    const run = await tx.dungeonRun.findUnique({
      where: { userId_kind: { userId, kind: "tower" } },
    });
    const balance = readTokensFromState(run?.state);
    if (balance < cost) {
      // Caller distinguishes by message text since action results
      // surface this to the user verbatim.
      throw new Error("INSUFFICIENT_TOKENS");
    }
    const remaining = balance - cost;

    await tx.dungeonRun.update({
      where: { userId_kind: { userId, kind: "tower" } },
      data: { state: mergeRunState(run?.state, { towerTokens: remaining }) },
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        ...(rewards.essence ? { essence: { increment: rewards.essence } } : {}),
        ...(rewards.crystals
          ? { crystals: { increment: rewards.crystals } }
          : {}),
        ...(rewards.faith ? { faith: { increment: rewards.faith } } : {}),
      },
    });
    return { remainingTokens: remaining };
  });
}
