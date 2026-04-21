"use server";

import { requireUser } from "@/lib/auth-helpers";
import { COST_SINGLE, COST_TEN, pullRarities } from "@/lib/gacha";
import { prisma } from "@/lib/prisma";
import type { Card } from "@prisma/client";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export type PullResult = {
  cards: Card[];
  crystalsLeft: number;
  pitySR: number;
  pitySSR: number;
  totalPulls: number;
};

export async function pullGacha(
  count: 1 | 10,
): Promise<{ ok: true; data: PullResult } | { ok: false; error: string }> {
  const user = await requireUser();
  const cost = count === 10 ? COST_TEN : COST_SINGLE;

  if (user.crystals < cost) {
    return { ok: false, error: `水晶不足(需 ${cost},目前 ${user.crystals})` };
  }

  const { rarities, finalPity } = pullRarities(count, {
    pitySR: user.pitySR,
    pitySSR: user.pitySSR,
  });

  // Pool cards by rarity
  const poolByRarity = new Map<string, Card[]>();
  for (const rarity of new Set(rarities)) {
    const cards = await prisma.card.findMany({ where: { rarity } });
    if (cards.length === 0) {
      return { ok: false, error: `無法抽卡:${rarity} 池是空的` };
    }
    poolByRarity.set(rarity, cards);
  }

  const drawn: Card[] = rarities.map((r) => {
    const pool = poolByRarity.get(r)!;
    return pool[crypto.randomInt(0, pool.length)];
  });

  // Persist in one transaction
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        crystals: { decrement: cost },
        pitySR: finalPity.pitySR,
        pitySSR: finalPity.pitySSR,
        totalPulls: { increment: count },
      },
    }),
    prisma.ownedCard.createMany({
      data: drawn.map((c) => ({ userId: user.id, cardId: c.id })),
    }),
  ]);

  revalidatePath("/gacha");
  revalidatePath("/home");
  revalidatePath("/collection");

  return {
    ok: true,
    data: {
      cards: drawn,
      crystalsLeft: updatedUser.crystals,
      pitySR: updatedUser.pitySR,
      pitySSR: updatedUser.pitySSR,
      totalPulls: updatedUser.totalPulls,
    },
  };
}
