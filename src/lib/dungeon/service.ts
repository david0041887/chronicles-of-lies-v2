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

/** Mark a floor as cleared and award rewards atomically. Returns the
 *  updated run + the rewards granted (nothing is awarded if the floor
 *  was a repeat clear of the user's high-water-mark). */
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
  const isFirstClear = await prisma.dungeonRun
    .findUnique({
      where: { userId_kind: { userId, kind: "tower" } },
    })
    .then((r) => !r || floor > (r.highestLevel ?? 0));

  const totalEssence = rewards.essence + (isFirstClear ? rewards.firstClearEssence : 0);
  const now = new Date();

  // Single transaction: bump the run + credit currencies. The state
  // JSON tracks tokens (we don't have a top-level User.towerTokens —
  // tokens are dungeon-local until exchanged).
  const [run] = await prisma.$transaction([
    prisma.dungeonRun.upsert({
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
        highestLevel: { set: undefined } as never, // placeholder, replaced below
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        essence: { increment: totalEssence },
        crystals: { increment: rewards.crystals },
      },
    }),
  ]);

  // Prisma can't conditionally `Math.max` on update inline, so do a
  // follow-up that sets highestLevel via raw expression. Cheaper than
  // a separate read+max+write.
  await prisma.$executeRaw`
    UPDATE "DungeonRun"
    SET
      "highestLevel" = GREATEST("highestLevel", ${floor}),
      "totalClears"  = "totalClears" + 1,
      "lastFloorAt"  = ${now},
      "state"        = jsonb_set(
        COALESCE("state", '{}'::jsonb),
        '{towerTokens}',
        to_jsonb(COALESCE(("state"->>'towerTokens')::int, 0) + ${rewards.towerTokens})
      )
    WHERE "userId" = ${userId} AND "kind"::text = 'tower'
  `;

  return {
    run,
    rewards: {
      essence: totalEssence,
      towerTokens: rewards.towerTokens,
      crystals: rewards.crystals,
      firstClearEssence: isFirstClear ? rewards.firstClearEssence : 0,
      isFirstClear,
    },
  };
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

/** Read-only — what's in a run's state JSON, normalised. */
export function readTowerState(run: DungeonRun) {
  const state = (run.state as Record<string, unknown>) ?? {};
  return {
    towerTokens: typeof state.towerTokens === "number" ? state.towerTokens : 0,
  };
}
