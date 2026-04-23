import { auth } from "@/auth";
import { csrfGate } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { takeBurst } from "@/lib/rate-limit";
import {
  cooldownLeft,
  dominantIndex,
  ensureLegendCounts,
  LEGEND_COUNT,
  SPREAD_BELIEVER_MAX,
  SPREAD_BELIEVER_MIN,
} from "@/lib/spread";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const csrf = csrfGate(req);
  if (csrf) return csrf;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // Per-user burst cap belt-and-braces with the server-side cooldown in
  // spread.ts — catches attackers who bypass the UI cooldown.
  if (!takeBurst(`spread:${session.user.id}`, 60_000, 20)) {
    return NextResponse.json({ error: "請求太頻繁" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { eraId, legendIdx } = (body as Record<string, unknown>) ?? {};
  if (typeof eraId !== "string") {
    return NextResponse.json({ error: "Missing eraId" }, { status: 400 });
  }
  if (
    typeof legendIdx !== "number" ||
    !Number.isInteger(legendIdx) ||
    legendIdx < 0 ||
    legendIdx >= LEGEND_COUNT
  ) {
    return NextResponse.json({ error: "Invalid legendIdx" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, lastSpreadAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const cd = cooldownLeft(user.lastSpreadAt);
  if (cd > 0) {
    return NextResponse.json(
      { error: "傳播冷卻中", cooldownSec: cd },
      { status: 429 },
    );
  }

  // Roll reward (crypto for fairness)
  const range = SPREAD_BELIEVER_MAX - SPREAD_BELIEVER_MIN + 1;
  const believerReward = SPREAD_BELIEVER_MIN + crypto.randomInt(0, range);

  // Compute next counts
  const existing = await prisma.eraProgress.findUnique({
    where: { userId_eraId: { userId: user.id, eraId } },
  });
  const counts = ensureLegendCounts(existing?.legendCounts);
  counts[legendIdx] = (counts[legendIdx] ?? 0) + 1;
  const dom = dominantIndex(counts);
  const now = new Date();

  const [, updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { lastSpreadAt: now },
    }),
    prisma.eraProgress.upsert({
      where: { userId_eraId: { userId: user.id, eraId } },
      create: {
        userId: user.id,
        eraId,
        believers: believerReward,
        legendCounts: counts,
        spreadsTotal: 1,
        dominantLegend: dom,
      },
      update: {
        believers: { increment: believerReward },
        legendCounts: { set: counts },
        spreadsTotal: { increment: 1 },
        dominantLegend: dom,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { totalBelievers: { increment: believerReward } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    believerReward,
    eraProgress: {
      believers: updated.believers,
      legendCounts: updated.legendCounts,
      spreadsTotal: updated.spreadsTotal,
      dominantLegend: updated.dominantLegend,
    },
    lastSpreadAt: now.toISOString(),
  });
}
