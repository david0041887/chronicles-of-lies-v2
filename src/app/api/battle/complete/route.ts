import { auth } from "@/auth";
import { verifyResult, verifyTicket } from "@/lib/battle/ticket";
import { csrfGate } from "@/lib/csrf";
import { progressMission } from "@/lib/daily-missions";
import { cardLegendIndex } from "@/lib/legend-cards";
import { prisma } from "@/lib/prisma";
import { takeBurst } from "@/lib/rate-limit";
import { ensureLegendCounts, dominantIndex as computeDominant } from "@/lib/spread";
import { NextResponse } from "next/server";

// Repeat clears give 15% of first-clear rewards.
const REPEAT_MULT = 0.15;

function scale(amount: number, first: boolean): number {
  return first ? amount : Math.max(1, Math.floor(amount * REPEAT_MULT));
}

// Sanity caps — reject clearly impossible submissions.
const MAX_TURNS = 40;
const MAX_PLAYS_PER_TURN = 6;

export async function POST(req: Request) {
  const csrf = csrfGate(req);
  if (csrf) return csrf;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  // Rate limit: max 3 completions per minute per user.
  if (!takeBurst(`battleComplete:${userId}`, 60_000, 3)) {
    return NextResponse.json(
      { error: "提交太快了,稍等再試" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    stageId,
    ticket,
    sig,
    won,
    turnsElapsed,
    playerHpEnd,
    enemyHpEnd,
    playerPlays,
  } = (body as Record<string, unknown>) ?? {};

  if (typeof stageId !== "string" || typeof won !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // ── Verify HMAC ticket: the client must have actually rendered the battle
  //    page as this user for this stage within the TTL window.
  const ticketStr = typeof ticket === "string" ? ticket : "";
  const ticketCheck = verifyTicket(ticketStr, { userId, stageId });
  if (!ticketCheck.ok) {
    return NextResponse.json(
      { error: `Battle ticket rejected: ${ticketCheck.error}` },
      { status: 403 },
    );
  }

  // ── Verify payload signature: client must have computed HMAC over the
  //    canonical outcome using the ticket-derived key. Reject if missing
  //    or mismatched — this catches tools that simply POST a modified body.
  const plays = Array.isArray(playerPlays) ? (playerPlays as string[]) : [];
  const sigOk =
    typeof sig === "string" &&
    verifyResult(
      {
        ticket: ticketStr,
        won: won === true,
        turnsElapsed: Math.max(1, Math.floor(Number(turnsElapsed) || 1)),
        playerHpEnd: Math.floor(Number(playerHpEnd) || 0),
        enemyHpEnd: Math.floor(Number(enemyHpEnd) || 0),
        playerPlays: plays,
      },
      sig,
    );
  if (!sigOk) {
    return NextResponse.json(
      { error: "Battle result signature rejected" },
      { status: 403 },
    );
  }

  // ── Sanity checks on reported state.
  const turns = Math.max(1, Math.floor(Number(turnsElapsed) || 1));
  if (turns > MAX_TURNS) {
    return NextResponse.json(
      { error: "Turn count out of range" },
      { status: 400 },
    );
  }
  if (plays.length > turns * MAX_PLAYS_PER_TURN) {
    return NextResponse.json(
      { error: "Play count inconsistent with turn count" },
      { status: 400 },
    );
  }
  const hpEnd = Number(playerHpEnd);
  if (!Number.isFinite(hpEnd) || hpEnd < 0 || hpEnd > 200) {
    return NextResponse.json(
      { error: "Player HP out of range" },
      { status: 400 },
    );
  }
  const enemyEnd = Number(enemyHpEnd);
  if (!Number.isFinite(enemyEnd) || enemyEnd < 0 || enemyEnd > 500) {
    return NextResponse.json(
      { error: "Enemy HP out of range" },
      { status: 400 },
    );
  }

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  // Consistency: a "won" claim requires enemy HP at 0; a "lost" claim
  // requires player HP at 0. This catches the simplest forged submissions.
  if (won && enemyEnd > 0) {
    return NextResponse.json(
      { error: "Reported win but enemy is still alive" },
      { status: 400 },
    );
  }
  if (!won && hpEnd > 0 && enemyEnd > 0) {
    return NextResponse.json(
      { error: "Reported loss but nobody died" },
      { status: 400 },
    );
  }

  // Plays must all be card ids that exist (prevents grinding fake missions).
  // We also fetch types so we can give mission credit for attack plays.
  let attackPlayCount = 0;
  if (plays.length > 0) {
    const uniquePlays = [...new Set(plays)];
    const knownCards = await prisma.card.findMany({
      where: { id: { in: uniquePlays } },
      select: { id: true, type: true },
    });
    if (knownCards.length < uniquePlays.length) {
      return NextResponse.json(
        { error: "Unknown card id in playerPlays" },
        { status: 400 },
      );
    }
    const typeById = new Map(knownCards.map((c) => [c.id, c.type]));
    for (const id of plays) {
      const t = typeById.get(id);
      if (t === "attack" || t === "ritual" || t === "debuff") attackPlayCount++;
    }
  }

  if (!won) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        battlesLost: { increment: 1 },
        faith: { increment: 8 },
      },
    });
    // Progress plays-related missions even on loss so the grind doesn't feel
    // wasted. Boss/win missions deliberately do not advance here.
    await progressMission(userId, "card_played", plays.length);
    if (attackPlayCount > 0) {
      await progressMission(userId, "attack_played", attackPlayCount);
    }
    return NextResponse.json({ ok: true, rewards: null, firstClear: false });
  }

  // First clear?
  const existing = await prisma.stageClear.findUnique({
    where: { userId_stageId: { userId, stageId } },
  });
  const isFirstClear = !existing;

  const crystals = scale(stage.rewardCrystals, isFirstClear);
  const believers = scale(stage.rewardBelievers, isFirstClear);
  const faithReward = Math.max(5, Math.floor(believers * 0.1));

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
        faith: { increment: faithReward },
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

  // Mission progress — fire after transaction commits.
  await progressMission(userId, "battle_win", 1);
  await progressMission(userId, "card_played", plays.length);
  if (stage.isBoss) await progressMission(userId, "boss_clear", 1);
  if (attackPlayCount > 0) {
    await progressMission(userId, "attack_played", attackPlayCount);
  }

  return NextResponse.json({
    ok: true,
    rewards: {
      crystals,
      believers,
      faith: faithReward,
      exp: 0, // deprecated
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
