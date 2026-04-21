import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const STARTER_SIZE = 30;
export const STARTER_SR_COUNT = 5;

/**
 * Grant a freshly-rolled 30-card starter deck to the user.
 * Returns the created OwnedCard ids.
 *
 * Composition: 5 SR + 25 R, spread across eras (each card era is random
 * but within the card pool). Duplicates allowed but capped at 3 per
 * template. Idempotency: callers should ensure this runs once per user
 * (e.g., guarded by tutorialDone flag).
 */
export async function grantStarterDeck(userId: string): Promise<string[]> {
  const [rPool, srPool] = await Promise.all([
    prisma.card.findMany({ where: { rarity: "R" }, select: { id: true } }),
    prisma.card.findMany({ where: { rarity: "SR" }, select: { id: true } }),
  ]);

  if (rPool.length === 0 || srPool.length === 0) {
    throw new Error("Card pool empty — seed cards first");
  }

  function pickWithCap(pool: { id: string }[], count: number, cap = 3): string[] {
    const taken: Record<string, number> = {};
    const picks: string[] = [];
    let attempts = 0;
    while (picks.length < count && attempts < count * 10) {
      const c = pool[crypto.randomInt(0, pool.length)].id;
      if ((taken[c] ?? 0) < cap) {
        picks.push(c);
        taken[c] = (taken[c] ?? 0) + 1;
      }
      attempts++;
    }
    return picks;
  }

  const srIds = pickWithCap(srPool, STARTER_SR_COUNT);
  const rIds = pickWithCap(rPool, STARTER_SIZE - STARTER_SR_COUNT);
  const allIds = [...srIds, ...rIds];

  // Create ownedCards
  await prisma.ownedCard.createMany({
    data: allIds.map((cardId) => ({ userId, cardId, stars: 1 })),
  });

  return allIds;
}
