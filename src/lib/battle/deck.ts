import { prisma } from "@/lib/prisma";
import { effectivePower } from "@/lib/forge";
import type { BattleCard } from "./types";

const RANK: Record<string, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };

/**
 * Build a 30-card battle deck for a user.
 *
 * Strategy:
 *  1. Load all OwnedCard rows with their Card template
 *  2. If player has an active Deck, use its card ids
 *  3. Otherwise auto-build: pick the top 30 by rarity (UR > SSR > SR > R),
 *     with at most 2 copies of the same card (3 of R is OK)
 *  4. Deduplicate by card id up to per-rarity limits
 */
export async function buildPlayerDeck(userId: string): Promise<BattleCard[]> {
  const [ownedRaw, activeDeck] = await Promise.all([
    prisma.ownedCard.findMany({
      where: { userId },
      include: {
        card: {
          include: { image: { select: { cardId: true } } },
        },
      },
    }),
    prisma.deck.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  const ownedById = new Map<string, typeof ownedRaw>();
  for (const o of ownedRaw) {
    const list = ownedById.get(o.cardId) ?? [];
    list.push(o);
    ownedById.set(o.cardId, list);
  }

  const toBattleCard = (cardId: string, uid: string): BattleCard | null => {
    const instances = ownedById.get(cardId);
    if (!instances || instances.length === 0) return null;
    // Use highest-star copy for effective stats
    const best = [...instances].sort((a, b) => b.stars - a.stars)[0];
    const c = best.card;
    return {
      id: c.id,
      uid,
      name: c.name,
      nameEn: c.nameEn,
      eraId: c.eraId,
      rarity: c.rarity,
      type: c.type,
      cost: c.cost,
      power: effectivePower(c.power, best.stars),
      keywords: c.keywords,
      flavor: c.flavor,
      hasImage: c.image !== null,
      imageUrl: c.imageUrl,
    };
  };

  // Prefer active deck
  if (activeDeck && activeDeck.cardIds.length === 30) {
    const deck: BattleCard[] = [];
    for (let i = 0; i < activeDeck.cardIds.length; i++) {
      const bc = toBattleCard(activeDeck.cardIds[i], `deck-${i}`);
      if (bc) deck.push(bc);
    }
    if (deck.length >= 20) return deck;
    // fall through to auto-build if deck somehow invalid
  }

  // Auto-build: sort owned by rarity desc, power desc
  const uniqueCards = Array.from(ownedById.entries()).map(([cardId, instances]) => ({
    cardId,
    card: instances[0].card,
    copies: instances.length,
  }));
  uniqueCards.sort((a, b) => {
    const rDiff = RANK[b.card.rarity] - RANK[a.card.rarity];
    if (rDiff !== 0) return rDiff;
    return b.card.power - a.card.power;
  });

  const deck: BattleCard[] = [];
  let uidCounter = 0;
  for (const u of uniqueCards) {
    if (deck.length >= 30) break;
    // Max 3 copies per card template (user rule)
    const maxCopies = 3;
    const ownedCount = Math.min(maxCopies, u.copies);
    const copies = Math.min(ownedCount, 30 - deck.length);
    for (let c = 0; c < copies; c++) {
      const bc = toBattleCard(u.cardId, `auto-${uidCounter++}`);
      if (bc) deck.push(bc);
    }
  }

  return deck;
}

export const DECK_SIZE = 30;
export const MAX_COPIES_PER_CARD = 3;

/**
 * Build the enemy's battle deck from an array of card ids (stage definition).
 */
export async function buildStageDeck(cardIds: string[]): Promise<BattleCard[]> {
  const cards = await prisma.card.findMany({
    where: { id: { in: [...new Set(cardIds)] } },
    include: { image: { select: { cardId: true } } },
  });
  const byId = new Map(cards.map((c) => [c.id, c]));

  const deck: BattleCard[] = [];
  cardIds.forEach((id, i) => {
    const c = byId.get(id);
    if (!c) return;
    deck.push({
      id: c.id,
      uid: `enemy-${i}`,
      name: c.name,
      nameEn: c.nameEn,
      eraId: c.eraId,
      rarity: c.rarity,
      type: c.type,
      cost: c.cost,
      power: c.power,
      keywords: c.keywords,
      flavor: c.flavor,
      hasImage: c.image !== null,
      imageUrl: c.imageUrl,
    });
  });
  return deck;
}
