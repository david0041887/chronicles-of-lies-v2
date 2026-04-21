import { auth } from "@/auth";
import { cardLegendIndex } from "@/lib/legend-cards";
import { prisma } from "@/lib/prisma";
import { ensureLegendCounts, dominantIndex as computeDominant } from "@/lib/spread";
import { NextResponse } from "next/server";

// Repeat clears give 15% of first-clear rewards.
const REPEAT_MULT = 0.15;

function scale(amount: number, first: boolean): number {
  return first ? amount : Math.max(1, Math.floor(amount * REPEAT_MULT));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { stageId, won, playerPlays } = (body as Record<string, unknown>) ?? {};
  if (typeof stageId !== "string" || typeof won !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const plays = Array.isArray(playerPlays) ? (playerPlays as string[]) : [];

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  const userId = session.user.id;

  if (!won) {
    await prisma.user.update({
      where: { id: userId },
      data: { battlesLost: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, rewards: null, firstClear: false });
  }

  // First clear?
  const existing = await prisma.stageClear.findUnique({
    where: { userId_stageId: { userId, stageId } },
  });
  const isFirstClear = !existing;

  const crystals = scale(stage.rewardCrystals, isFirstClear);
  const believers = scale(stage.rewardBelievers, isFirstClear);

  // Compute auto-spread increments for this stage's era based on played cards
  const spreadGained: number[] = [0, 0, 0, 0];
  for (const cardId of plays) {
    const legendIdx = cardLegendIndex(stage.eraId, cardId);
    if (legendIdx !== null) spreadGained[legendIdx] += 1;
  }
  const totalSpreadDelta = spreadGained.reduce((s, x) => s + x, 0);

  // Apply spread to EraProgress
  const existingProgress = await prisma.eraProgress.findUnique({
    where: { userId_eraId: { userId, eraId: stage.eraId } },
  });
  const mergedCounts = ensureLegendCounts(existingProgress?.legendCounts ?? []);
  for (let i = 0; i < mergedCounts.length; i++) {
    mergedCounts[i] = (mergedCounts[i] ?? 0) + (spreadGained[i] ?? 0);
  }
  const newDominant = computeDominant(mergedCounts);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        crystals: { increment: crystals },
        battlesWon: { increment: 1 },
        totalBelievers: { increment: believers },
      },
    }),
    prisma.eraProgress.upsert({
      where: { userId_eraId: { userId, eraId: stage.eraId } },
      update: {
        believers: { increment: believers },
        highestStage: Math.max(existingProgress?.highestStage ?? 0, stage.orderNum),
        bossCleared: stage.isBoss
          ? true
          : (existingProgress?.bossCleared ?? false),
        legendCounts: { set: mergedCounts },
        spreadsTotal: { increment: totalSpreadDelta },
        dominantLegend: newDominant,
      },
      create: {
        userId,
        eraId: stage.eraId,
        believers,
        highestStage: stage.orderNum,
        bossCleared: stage.isBoss,
        legendCounts: mergedCounts,
        spreadsTotal: totalSpreadDelta,
        dominantLegend: newDominant,
      },
    }),
    prisma.stageClear.upsert({
      where: { userId_stageId: { userId, stageId } },
      update: {
        lastClearedAt: new Date(),
        clearCount: { increment: 1 },
      },
      create: { userId, stageId },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    rewards: {
      crystals,
      believers,
      exp: 0, // deprecated, kept for UI compatibility
      levelBefore: 0,
      levelAfter: 0,
    },
    firstClear: isFirstClear,
    spread: {
      eraId: stage.eraId,
      gained: spreadGained,
      totalDelta: totalSpreadDelta,
    },
  });
}
