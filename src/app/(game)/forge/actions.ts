"use server";

import { requireOnboarded } from "@/lib/auth-helpers";
import { copiesNeeded, FUSION_INPUTS, MAX_STARS, NEXT_RARITY } from "@/lib/forge";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function upgradeCardStars(
  cardTemplateId: string,
): Promise<
  | { ok: true; newStars: number; consumed: number }
  | { ok: false; error: string }
> {
  const user = await requireOnboarded();

  // Get all owned copies of this template, sorted by stars desc (best first)
  const copies = await prisma.ownedCard.findMany({
    where: { userId: user.id, cardId: cardTemplateId },
    orderBy: { stars: "desc" },
  });
  if (copies.length === 0) {
    return { ok: false, error: "未擁有這張卡" };
  }

  const best = copies[0];
  if (best.stars >= MAX_STARS) {
    return { ok: false, error: `已達最高星級 ${MAX_STARS}★` };
  }

  const needed = copiesNeeded(best.stars);
  const available = copies.length - 1; // minus best
  if (available < needed) {
    return {
      ok: false,
      error: `升到 ${best.stars + 1}★ 需要 ${needed} 張同名卡(目前另有 ${available} 張可餵)`,
    };
  }

  // Consume N lowest-star copies (preserve any highest-star copies in case user has multiple already-starred ones)
  const fodder = [...copies].slice(1).sort((a, b) => a.stars - b.stars).slice(0, needed);

  await prisma.$transaction([
    prisma.ownedCard.deleteMany({
      where: { id: { in: fodder.map((f) => f.id) } },
    }),
    prisma.ownedCard.update({
      where: { id: best.id },
      data: { stars: best.stars + 1 },
    }),
  ]);

  revalidatePath("/forge");
  revalidatePath("/collection");
  revalidatePath("/deck");
  return { ok: true, newStars: best.stars + 1, consumed: needed };
}

export async function fuseCards(
  ownedIds: string[],
): Promise<
  | { ok: true; resultCardId: string; resultName: string; resultRarity: string }
  | { ok: false; error: string }
> {
  const user = await requireOnboarded();

  if (!Array.isArray(ownedIds) || ownedIds.length !== FUSION_INPUTS) {
    return { ok: false, error: `需要 ${FUSION_INPUTS} 張卡` };
  }
  if (new Set(ownedIds).size !== ownedIds.length) {
    return { ok: false, error: "不能重複選同一張實例" };
  }

  const rows = await prisma.ownedCard.findMany({
    where: { id: { in: ownedIds }, userId: user.id },
    include: { card: { select: { id: true, eraId: true, rarity: true } } },
  });
  if (rows.length !== FUSION_INPUTS) {
    return { ok: false, error: "有卡片不屬於您或不存在" };
  }

  // Validate: same rarity + same era
  const firstRarity = rows[0].card.rarity;
  const firstEra = rows[0].card.eraId;
  if (!rows.every((r) => r.card.rarity === firstRarity)) {
    return { ok: false, error: "三張卡稀有度必須相同" };
  }
  if (!rows.every((r) => r.card.eraId === firstEra)) {
    return { ok: false, error: "三張卡時代必須相同" };
  }

  const nextRarity = NEXT_RARITY[firstRarity];
  if (!nextRarity) {
    return { ok: false, error: `${firstRarity} 已是最高稀有度,無法融合` };
  }

  // Pick random product from (nextRarity, firstEra) pool
  const pool = await prisma.card.findMany({
    where: { rarity: nextRarity, eraId: firstEra },
    select: { id: true, name: true },
  });
  if (pool.length === 0) {
    return { ok: false, error: `${nextRarity} / ${firstEra} 池子為空` };
  }
  const product = pool[crypto.randomInt(0, pool.length)];

  await prisma.$transaction([
    prisma.ownedCard.deleteMany({ where: { id: { in: ownedIds } } }),
    prisma.ownedCard.create({
      data: { userId: user.id, cardId: product.id, stars: 1 },
    }),
  ]);

  revalidatePath("/forge");
  revalidatePath("/collection");
  revalidatePath("/deck");
  return {
    ok: true,
    resultCardId: product.id,
    resultName: product.name,
    resultRarity: nextRarity,
  };
}
