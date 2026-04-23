import { auth } from "@/auth";
import { getMilestoneDef } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import { takeBurst } from "@/lib/rate-limit";
import { weaverLevel } from "@/lib/weaver";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!takeBurst(`milestone:${session.user.id}`, 60_000, 10)) {
    return NextResponse.json(
      { error: "請求太頻繁" },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { id } = (body as Record<string, unknown>) ?? {};
  if (typeof id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const def = getMilestoneDef(id);
  if (!def) return NextResponse.json({ error: "Unknown milestone" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.claimedMilestones.includes(id)) {
    return NextResponse.json({ error: "已領取" }, { status: 409 });
  }

  // Evaluate completion server-side
  const bossCleared = await prisma.eraProgress.count({
    where: { userId: user.id, bossCleared: true },
  });
  const snap = {
    level: weaverLevel(user.totalBelievers),
    battlesWon: user.battlesWon,
    bossesCleared: bossCleared,
    eraClearCount: 0, // not used by current milestones
  };

  // Tutorial can only be granted by /api/tutorial/complete
  if (id === "tutorial") {
    return NextResponse.json({ error: "教學獎勵由教學流程發放" }, { status: 400 });
  }

  const completedMap: Record<string, boolean> = {
    battles_3: snap.battlesWon >= 3,
    battles_10: snap.battlesWon >= 10,
    boss_first: snap.bossesCleared >= 1,
    boss_three: snap.bossesCleared >= 3,
    level_5: snap.level >= 5,
    level_10: snap.level >= 10,
    level_20: snap.level >= 20,
  };
  if (!completedMap[id]) {
    return NextResponse.json({ error: "尚未達成條件" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      freePulls: { increment: def.pulls },
      claimedMilestones: { push: id },
    },
  });

  return NextResponse.json({ ok: true, pulls: def.pulls });
}
