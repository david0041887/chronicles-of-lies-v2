import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function expNeededForLevel(level: number): number {
  return level * 100;
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

  const {
    stageId,
    won,
    turnsElapsed,
    playerHpEnd,
    enemyHpEnd,
  } = (body as Record<string, unknown>) ?? {};

  if (typeof stageId !== "string" || typeof won !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  const userId = session.user.id;

  if (!won) {
    // Just increment loss counter
    await prisma.user.update({
      where: { id: userId },
      data: { battlesLost: { increment: 1 } },
    });
    return NextResponse.json({ ok: true, rewards: null });
  }

  // Rewards
  const { rewardCrystals, rewardExp, rewardBelievers, eraId } = stage;

  // Compute level-up(s)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { level: true, exp: true } });
  let newLevel = user?.level ?? 1;
  let newExp = (user?.exp ?? 0) + rewardExp;
  while (newExp >= expNeededForLevel(newLevel) && newLevel < 100) {
    newExp -= expNeededForLevel(newLevel);
    newLevel += 1;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        crystals: { increment: rewardCrystals },
        exp: newExp,
        level: newLevel,
        battlesWon: { increment: 1 },
        totalBelievers: { increment: rewardBelievers },
      },
    }),
    prisma.eraProgress.upsert({
      where: { userId_eraId: { userId, eraId } },
      update: {
        believers: { increment: rewardBelievers },
        highestStage: stage.orderNum,
        bossCleared: stage.isBoss ? true : undefined,
      },
      create: {
        userId,
        eraId,
        believers: rewardBelievers,
        highestStage: stage.orderNum,
        bossCleared: stage.isBoss,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    rewards: {
      crystals: rewardCrystals,
      exp: rewardExp,
      believers: rewardBelievers,
      levelBefore: user?.level ?? 1,
      levelAfter: newLevel,
    },
    meta: { turnsElapsed, playerHpEnd, enemyHpEnd },
  });
}
