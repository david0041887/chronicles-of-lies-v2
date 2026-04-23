import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { takeBurst } from "@/lib/rate-limit";
import { grantStarterDeck } from "@/lib/starter";
import { getMilestoneDef } from "@/lib/milestones";
import { NextResponse } from "next/server";

/**
 * Called by the tutorial BattleClient after the demo battle ends.
 * Idempotent — the tutorialDone flag prevents double-grant.
 *
 * Grants:
 *  - 30-card starter deck (5 SR + 25 R, capped 3 copies per template)
 *  - 10 free pulls (the "tutorial" milestone)
 *  - Sets tutorialDone = true and claims the "tutorial" milestone
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // Rate limit: tutorial is one-shot (gated by tutorialDone) but an
  // attacker could still hammer this and burn DB cycles. Cap at 3/min.
  if (!takeBurst(`tutorialComplete:${session.user.id}`, 60_000, 3)) {
    return NextResponse.json(
      { error: "請求太頻繁" },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.tutorialDone) {
    return NextResponse.json({ ok: true, alreadyDone: true, rewards: null });
  }

  const tutorialDef = getMilestoneDef("tutorial");
  const freePulls = tutorialDef?.pulls ?? 10;

  await grantStarterDeck(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      tutorialDone: true,
      freePulls: { increment: freePulls },
      faith: { increment: 300 },
      claimedMilestones: { push: "tutorial" },
    },
  });

  return NextResponse.json({
    ok: true,
    rewards: {
      starterCards: 30,
      freePulls,
      faith: 300,
    },
  });
}
