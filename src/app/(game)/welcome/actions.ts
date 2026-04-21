"use server";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  CARDS_PER_CHOICE,
  CHOICES_PER_ROUND,
  TOTAL_ROUNDS,
  getOrCreateStarter,
} from "@/lib/starter-pack";
import { revalidatePath } from "next/cache";

export async function ensureStarter() {
  const user = await requireUser();
  return getOrCreateStarter(user.id);
}

export async function pickRound(
  round: number,
  choice: number,
): Promise<{ ok: true; picks: number[] } | { ok: false; error: string }> {
  const user = await requireUser();
  if (
    !Number.isInteger(round) ||
    !Number.isInteger(choice) ||
    round < 0 ||
    round >= TOTAL_ROUNDS ||
    choice < 0 ||
    choice >= CHOICES_PER_ROUND
  ) {
    return { ok: false, error: "參數錯誤" };
  }

  const reward = await prisma.startingReward.findUnique({
    where: { userId: user.id },
  });
  if (!reward) return { ok: false, error: "尚未初始化起始禮包" };
  if (reward.claimedAt) return { ok: false, error: "起始禮包已領取" };
  if (reward.picks.length !== round) {
    return { ok: false, error: `回合錯誤(目前應為 ${reward.picks.length + 1} / ${TOTAL_ROUNDS})` };
  }

  const rolls = reward.rolls as string[][][];
  const cardIds = rolls[round]?.[choice];
  if (!cardIds || cardIds.length !== CARDS_PER_CHOICE) {
    return { ok: false, error: "卡牌資料毀損" };
  }

  const newPicks = [...reward.picks, choice];

  await prisma.$transaction([
    prisma.ownedCard.createMany({
      data: cardIds.map((cardId) => ({ userId: user.id, cardId })),
    }),
    prisma.startingReward.update({
      where: { userId: user.id },
      data: { picks: newPicks },
    }),
  ]);

  revalidatePath("/welcome");
  revalidatePath("/collection");
  return { ok: true, picks: newPicks };
}

export async function claimStarter(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await requireUser();
  const reward = await prisma.startingReward.findUnique({
    where: { userId: user.id },
  });
  if (!reward) return { ok: false, error: "尚未初始化" };
  if (reward.claimedAt) return { ok: false, error: "已領取" };
  if (reward.picks.length !== TOTAL_ROUNDS) {
    return {
      ok: false,
      error: `還有 ${TOTAL_ROUNDS - reward.picks.length} 輪未選`,
    };
  }

  await prisma.startingReward.update({
    where: { userId: user.id },
    data: { claimedAt: new Date() },
  });
  revalidatePath("/home");
  return { ok: true };
}
