"use server";

import { requireUser } from "@/lib/auth-helpers";
import { COST_SINGLE, COST_TEN, pullRarities } from "@/lib/gacha";
import { prisma } from "@/lib/prisma";
import type { Card } from "@prisma/client";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export type CardWithImage = Card & { hasImage: boolean };

export type PullResult = {
  cards: CardWithImage[];
  crystalsLeft: number;
  freePullsLeft: number;
  pitySR: number;
  pitySSR: number;
  pityUR: number;
  totalPulls: number;
  /** "free" = used free pulls, "crystal" = paid with crystals */
  paidWith: "free" | "crystal";
};

export async function pullGacha(
  count: 1 | 10,
): Promise<{ ok: true; data: PullResult } | { ok: false; error: string }> {
  const user = await requireUser();
  const cost = count === 10 ? COST_TEN : COST_SINGLE;

  // Use free pulls if available and enough to cover the count
  const useFree = user.freePulls >= count;
  if (!useFree && user.crystals < cost) {
    return {
      ok: false,
      error: `水晶不足(需 ${cost},目前 ${user.crystals}) · 可用免費 ${user.freePulls}`,
    };
  }

  const { rarities, finalPity } = pullRarities(count, {
    pitySR: user.pitySR,
    pitySSR: user.pitySSR,
    pityUR: user.pityUR,
  });

  const poolByRarity = new Map<string, CardWithImage[]>();
  for (const rarity of new Set(rarities)) {
    const raw = await prisma.card.findMany({
      where: { rarity },
      include: { image: { select: { cardId: true } } },
    });
    if (raw.length === 0) {
      return { ok: false, error: `無法抽卡:${rarity} 池是空的` };
    }
    poolByRarity.set(
      rarity,
      raw.map(({ image, ...c }) => ({ ...c, hasImage: image !== null })),
    );
  }

  const drawn: CardWithImage[] = rarities.map((r) => {
    const pool = poolByRarity.get(r)!;
    return pool[crypto.randomInt(0, pool.length)];
  });

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: useFree
        ? {
            freePulls: { decrement: count },
            pitySR: finalPity.pitySR,
            pitySSR: finalPity.pitySSR,
            pityUR: finalPity.pityUR,
            totalPulls: { increment: count },
          }
        : {
            crystals: { decrement: cost },
            pitySR: finalPity.pitySR,
            pitySSR: finalPity.pitySSR,
            pityUR: finalPity.pityUR,
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
      freePullsLeft: updatedUser.freePulls,
      pitySR: updatedUser.pitySR,
      pitySSR: updatedUser.pitySSR,
      pityUR: updatedUser.pityUR,
      totalPulls: updatedUser.totalPulls,
      paidWith: useFree ? "free" : "crystal",
    },
  };
}
