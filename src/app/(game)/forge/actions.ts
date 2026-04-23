"use server";

import { requireOnboarded } from "@/lib/auth-helpers";
import { progressMission } from "@/lib/daily-missions";
import { copiesNeeded, FUSION_INPUTS, MAX_STARS, NEXT_RARITY } from "@/lib/forge";
import { prisma } from "@/lib/prisma";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export async function upgradeCardStars(
  cardTemplateId: string,
): Promise<
  | { ok: true; newStars: number; consumed: number }
  | { ok: false; error: string }
> {
  const user = await requireOnboarded();

  // Pre-read to validate the request (UI already knows this state, but
  // authoritative check still needed).
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

  const perks = perksForLevel(weaverLevel(user.totalBelievers));
  const baseNeed = copiesNeeded(best.stars);
  const needed = Math.max(1, Math.ceil(baseNeed * (1 - perks.forgeDiscount)));
  const available = copies.length - 1;
  if (available < needed) {
    return {
      ok: false,
      error: `升到 ${best.stars + 1}★ 需要 ${needed} 張同名卡${
        perks.forgeDiscount > 0 ? `(原 ${baseNeed},編織者折扣後)` : ""
      }(目前另有 ${available} 張可餵)`,
    };
  }

  const fodder = [...copies]
    .slice(1)
    .sort((a, b) => a.stars - b.stars)
    .slice(0, needed);
  const fodderIds = fodder.map((f) => f.id);

  // Atomic: consume fodder + upgrade best. If another tab raced us and
  // already deleted these copies, deleteMany returns count < needed and
  // the transaction aborts — no free star.
  try {
    await prisma.$transaction(async (tx) => {
      const del = await tx.ownedCard.deleteMany({
        where: { id: { in: fodderIds }, userId: user.id },
      });
      if (del.count !== needed) {
        throw new Error("CONCURRENT_FODDER_GONE");
      }
      // Re-check best still exists at the expected stars to avoid double-
      // upgrade if another tab completed first.
      const stillBest = await tx.ownedCard.findUnique({
        where: { id: best.id },
        select: { stars: true },
      });
      if (!stillBest || stillBest.stars !== best.stars) {
        throw new Error("CONCURRENT_BEST_MOVED");
      }
      await tx.ownedCard.update({
        where: { id: best.id },
        data: { stars: best.stars + 1 },
      });
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "CONCURRENT_FODDER_GONE" || msg === "CONCURRENT_BEST_MOVED") {
      return { ok: false, error: "卡片狀態已改變,請重試" };
    }
    console.error("upgradeCardStars failed", err);
    return { ok: false, error: "鍛造失敗,請稍後再試" };
  }

  await progressMission(user.id, "forge_action", 1);
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch inside the transaction so a concurrent request can't have
      // deleted these cards between ownership check and consumption.
      const rows = await tx.ownedCard.findMany({
        where: { id: { in: ownedIds }, userId: user.id },
        include: { card: { select: { id: true, eraId: true, rarity: true } } },
      });
      if (rows.length !== FUSION_INPUTS) {
        throw new Error("CARDS_UNAVAILABLE");
      }
      const firstRarity = rows[0].card.rarity;
      const firstEra = rows[0].card.eraId;
      if (!rows.every((r) => r.card.rarity === firstRarity)) {
        throw new Error("VALIDATION:三張卡稀有度必須相同");
      }
      if (!rows.every((r) => r.card.eraId === firstEra)) {
        throw new Error("VALIDATION:三張卡時代必須相同");
      }
      const nextRarity = NEXT_RARITY[firstRarity];
      if (!nextRarity) {
        throw new Error(`VALIDATION:${firstRarity} 已是最高稀有度,無法融合`);
      }

      const pool = await tx.card.findMany({
        where: { rarity: nextRarity, eraId: firstEra },
        select: { id: true, name: true },
      });
      if (pool.length === 0) {
        throw new Error(`VALIDATION:${nextRarity} / ${firstEra} 池子為空`);
      }
      const product = pool[crypto.randomInt(0, pool.length)];

      const del = await tx.ownedCard.deleteMany({
        where: { id: { in: ownedIds }, userId: user.id },
      });
      if (del.count !== FUSION_INPUTS) {
        throw new Error("CARDS_UNAVAILABLE");
      }
      await tx.ownedCard.create({
        data: { userId: user.id, cardId: product.id, stars: 1 },
      });
      return {
        resultCardId: product.id,
        resultName: product.name,
        resultRarity: nextRarity,
      };
    });

    await progressMission(user.id, "forge_action", 1);
    revalidatePath("/forge");
    revalidatePath("/collection");
    revalidatePath("/deck");
    return { ok: true, ...result };
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (msg === "CARDS_UNAVAILABLE") {
      return { ok: false, error: "卡片狀態已改變,請重試" };
    }
    if (msg.startsWith("VALIDATION:")) {
      return { ok: false, error: msg.slice("VALIDATION:".length) };
    }
    console.error("fuseCards failed", err);
    return { ok: false, error: "融合失敗,請稍後再試" };
  }
}
