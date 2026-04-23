"use server";

import { requireOnboarded } from "@/lib/auth-helpers";
import { DECK_SIZE, MAX_COPIES_PER_CARD } from "@/lib/battle/deck";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveDeck(
  cardIds: string[],
): Promise<{ ok: true; deckId: string } | { ok: false; error: string }> {
  try {
    return await saveDeckUnsafe(cardIds);
  } catch (err) {
    console.error("saveDeck failed", err);
    return { ok: false, error: "儲存牌組失敗,請稍後再試" };
  }
}

async function saveDeckUnsafe(
  cardIds: string[],
): Promise<{ ok: true; deckId: string } | { ok: false; error: string }> {
  const user = await requireOnboarded();

  if (!Array.isArray(cardIds) || cardIds.length !== DECK_SIZE) {
    return { ok: false, error: `牌組需 ${DECK_SIZE} 張(目前 ${cardIds?.length ?? 0})` };
  }
  // Refuse absurdly-long string ids (potential DoS via huge JSON blobs
  // or Prisma $in with millions of entries).
  for (const id of cardIds) {
    if (typeof id !== "string" || id.length > 64) {
      return { ok: false, error: "牌組包含無效卡 id" };
    }
  }

  // Max 3 copies per card id
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    if (n > MAX_COPIES_PER_CARD) {
      return { ok: false, error: `同名卡最多 ${MAX_COPIES_PER_CARD} 張(${id} 有 ${n})` };
    }
  }

  // Verify all card ids exist
  const existing = await prisma.card.findMany({
    where: { id: { in: [...counts.keys()] } },
    select: { id: true, eraId: true },
  });
  if (existing.length !== counts.size) {
    return { ok: false, error: "牌組中有未知卡" };
  }

  // Verify the user actually owns at least one copy of each (to avoid putting cards they don't have)
  const owned = await prisma.ownedCard.groupBy({
    by: ["cardId"],
    where: { userId: user.id, cardId: { in: [...counts.keys()] } },
    _count: true,
  });
  const ownedMap = new Map(owned.map((o) => [o.cardId, o._count]));
  for (const [id, n] of counts) {
    if ((ownedMap.get(id) ?? 0) < 1) {
      return { ok: false, error: `未擁有 ${id}` };
    }
    // Copies in deck can exceed owned instances — players can field duplicates they don't literally own multiple of.
    // (common in CCGs with "deck blueprint" model) Skip strict owned>=n check.
    void n;
  }

  // Pick dominant era for resonance
  const eraCount = new Map<string, number>();
  for (const c of existing) {
    const n = counts.get(c.id) ?? 0;
    eraCount.set(c.eraId, (eraCount.get(c.eraId) ?? 0) + n);
  }
  const dominant = [...eraCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Upsert — keep only ONE deck per user for now (single slot)
  const existingDeck = await prisma.deck.findFirst({ where: { userId: user.id } });
  let deckId: string;
  if (existingDeck) {
    const updated = await prisma.deck.update({
      where: { id: existingDeck.id },
      data: { cardIds, eraId: dominant ?? null, name: existingDeck.name },
    });
    deckId = updated.id;
  } else {
    const created = await prisma.deck.create({
      data: {
        userId: user.id,
        name: "我的牌組",
        cardIds,
        eraId: dominant ?? null,
      },
    });
    deckId = created.id;
  }

  revalidatePath("/deck");
  return { ok: true, deckId };
}
