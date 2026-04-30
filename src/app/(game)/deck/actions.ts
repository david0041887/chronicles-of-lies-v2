"use server";

import { requireOnboarded } from "@/lib/auth-helpers";
import { DECK_SIZE, MAX_COPIES_PER_CARD } from "@/lib/battle/deck";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { defaultSlotName, MAX_DECK_SLOTS } from "./constants";

function clampSlot(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DECK_SLOTS) return null;
  return n;
}

export async function saveDeck(
  cardIds: string[],
  slot?: number,
): Promise<{ ok: true; deckId: string; slot: number } | { ok: false; error: string }> {
  try {
    return await saveDeckUnsafe(cardIds, slot);
  } catch (err) {
    console.error("saveDeck failed", err);
    return { ok: false, error: "儲存牌組失敗,請稍後再試" };
  }
}

async function saveDeckUnsafe(
  cardIds: string[],
  slotIn: number | undefined,
): Promise<{ ok: true; deckId: string; slot: number } | { ok: false; error: string }> {
  const user = await requireOnboarded();

  if (!Array.isArray(cardIds) || cardIds.length !== DECK_SIZE) {
    return { ok: false, error: `牌組需 ${DECK_SIZE} 張(目前 ${cardIds?.length ?? 0})` };
  }
  for (const id of cardIds) {
    if (typeof id !== "string" || id.length > 64) {
      return { ok: false, error: "牌組包含無效卡 id" };
    }
  }

  const counts = new Map<string, number>();
  for (const id of cardIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    if (n > MAX_COPIES_PER_CARD) {
      return { ok: false, error: `同名卡最多 ${MAX_COPIES_PER_CARD} 張(${id} 有 ${n})` };
    }
  }

  const existing = await prisma.card.findMany({
    where: { id: { in: [...counts.keys()] } },
    select: { id: true, eraId: true },
  });
  if (existing.length !== counts.size) {
    return { ok: false, error: "牌組中有未知卡" };
  }

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
    void n;
  }

  const eraCount = new Map<string, number>();
  for (const c of existing) {
    const n = counts.get(c.id) ?? 0;
    eraCount.set(c.eraId, (eraCount.get(c.eraId) ?? 0) + n);
  }
  const dominant = [...eraCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // If no slot given, use the user's current active slot. Validate range
  // either way so a forged param can't escape the 1..3 envelope.
  const slot = slotIn === undefined ? user.activeDeckSlot ?? 1 : clampSlot(slotIn);
  if (slot === null) {
    return { ok: false, error: "牌組欄位無效" };
  }

  // Atomic upsert by (userId, slot) — the composite unique on the
  // schema gives us idempotent writes without an explicit findFirst.
  const upserted = await prisma.deck.upsert({
    where: { userId_slot: { userId: user.id, slot } },
    update: { cardIds, eraId: dominant ?? null },
    create: {
      userId: user.id,
      slot,
      name: defaultSlotName(slot),
      cardIds,
      eraId: dominant ?? null,
    },
  });

  revalidatePath("/deck");
  return { ok: true, deckId: upserted.id, slot };
}

/** Switch which slot is the active deck for battles. Idempotent. */
export async function switchActiveSlot(
  slot: number,
): Promise<{ ok: true; slot: number } | { ok: false; error: string }> {
  const user = await requireOnboarded();
  const target = clampSlot(slot);
  if (target === null) {
    return { ok: false, error: "牌組欄位無效" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { activeDeckSlot: target },
  });
  revalidatePath("/deck");
  return { ok: true, slot: target };
}

/** Duplicate one slot's contents into another. Source slot must exist
 *  and have a full deck; destination slot is overwritten. */
export async function copyDeckSlot(
  fromSlot: number,
  toSlot: number,
): Promise<{ ok: true; toSlot: number } | { ok: false; error: string }> {
  const user = await requireOnboarded();
  const from = clampSlot(fromSlot);
  const to = clampSlot(toSlot);
  if (from === null || to === null) {
    return { ok: false, error: "牌組欄位無效" };
  }
  if (from === to) {
    return { ok: false, error: "來源與目標牌組相同" };
  }
  const source = await prisma.deck.findUnique({
    where: { userId_slot: { userId: user.id, slot: from } },
  });
  if (!source || source.cardIds.length !== DECK_SIZE) {
    return { ok: false, error: "來源牌組不完整" };
  }
  await prisma.deck.upsert({
    where: { userId_slot: { userId: user.id, slot: to } },
    update: { cardIds: source.cardIds, eraId: source.eraId },
    create: {
      userId: user.id,
      slot: to,
      name: defaultSlotName(to),
      cardIds: source.cardIds,
      eraId: source.eraId,
    },
  });
  revalidatePath("/deck");
  return { ok: true, toSlot: to };
}

/** Wipe a slot's contents (the row is deleted; player will see an
 *  empty slot when next visiting). Slot 1 cannot be deleted because
 *  it's always the fallback. */
export async function clearDeckSlot(
  slot: number,
): Promise<{ ok: true; slot: number } | { ok: false; error: string }> {
  const user = await requireOnboarded();
  const target = clampSlot(slot);
  if (target === null) {
    return { ok: false, error: "牌組欄位無效" };
  }
  if (target === 1) {
    return { ok: false, error: "主牌組不可刪除,可改為儲存其他內容" };
  }
  // If the deleted slot is the active one, fall back to slot 1.
  await prisma.$transaction(async (tx) => {
    await tx.deck
      .delete({ where: { userId_slot: { userId: user.id, slot: target } } })
      .catch(() => null); // swallow "not found" — already empty is success
    if ((user.activeDeckSlot ?? 1) === target) {
      await tx.user.update({
        where: { id: user.id },
        data: { activeDeckSlot: 1 },
      });
    }
  });
  revalidatePath("/deck");
  return { ok: true, slot: target };
}

