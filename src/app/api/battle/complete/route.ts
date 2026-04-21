import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function expNeededForLevel(level: number): number {
  return level * 100;
}

// Repeat clears give 7% of first-clear rewards (middle of 5-10% window).
const REPEAT_MULT = 0.07;

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

  const { stageId, won, turnsElapsed, playerHpEnd, enemyHpEnd } =
    (body as Record<string, unknown>) ?? {};

  if (typeof stageId !== "string" || typeof won !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

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

  // Has this user cleared this stage before?
  const existing = await prisma.stageClear.findUnique({
    where: { userId_stageId: { userId, stageId } },
  });
  const isFirstClear = !existing;

  const crystals = scale(stage.rewardCrystals, isFirstClear);
  const exp = scale(stage.rewardExp, isFirstClear);
  const believers = scale(stage.rewardBelievers, isFirstClear);

  // Compute level-up(s)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true, exp: true },
  });
  let newLevel = user?.level ?? 1;
  let newExp = (user?.exp ?? 0) + exp;
  while (newExp >= expNeededForLevel(newLevel) && newLevel < 100) {
    newExp -= expNeededForLevel(newLevel);
    newLevel += 1;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        crystals: { increment: crystals },
        exp: newExp,
        level: newLevel,
        battlesWon: { increment: 1 },
        totalBelievers: { increment: believers },
      },
    }),
    prisma.eraProgress.upsert({
      where: { userId_eraId: { userId, eraId: stage.eraId } },
      update: {
        believers: { increment: believers },
        highestStage: stage.orderNum,
        bossCleared: stage.isBoss ? true : undefined,
      },
      create: {
        userId,
        eraId: stage.eraId,
        believers,
        highestStage: stage.orderNum,
        bossCleared: stage.isBoss,
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
      exp,
      believers,
      levelBefore: user?.level ?? 1,
      levelAfter: newLevel,
    },
    firstClear: isFirstClear,
    meta: { turnsElapsed, playerHpEnd, enemyHpEnd },
  });
}
