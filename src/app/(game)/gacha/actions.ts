"use server";

import { requireUser } from "@/lib/auth-helpers";
import { progressMission } from "@/lib/daily-missions";
import {
  getEraTicketCount,
  parseEraTickets,
  spendEraTickets,
} from "@/lib/era-tickets";
import { pullRarities } from "@/lib/gacha";
import {
  getPool,
  pickFeaturedUrId,
  type PoolId,
} from "@/lib/gacha-pools";
import { prisma } from "@/lib/prisma";
import { takeBurst } from "@/lib/rate-limit";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import type { Card, Rarity } from "@prisma/client";
import crypto from "crypto";
import { revalidatePath } from "next/cache";

export type CardWithImage = Card & { hasImage: boolean };

export type PullResult = {
  cards: CardWithImage[];
  crystalsLeft: number;
  faithLeft: number;
  freePullsLeft: number;
  eraTicketsLeft: Record<string, number>;
  pitySR: number;
  pitySSR: number;
  pityUR: number;
  totalPulls: number;
  /** "free" = used free pulls, otherwise name of currency used */
  paidWith: "free" | "crystal" | "faith" | "eraTicket";
  poolId: PoolId;
  featuredUrId: string | null;
};

export async function pullGacha(args: {
  pool: PoolId;
  count: 1 | 10;
  eraId?: string;
}): Promise<{ ok: true; data: PullResult } | { ok: false; error: string }> {
  const user = await requireUser();

  // Throttle: max 20 pulls per minute per user (generous for ten-pull spam
  // but blocks brute-force scripts).
  if (!takeBurst(`gacha:${user.id}`, 60_000, 20)) {
    return { ok: false, error: "召喚太頻繁,稍等幾秒再試" };
  }

  const config = getPool(args.pool);
  const count = args.count;
  const cost = count === 10 ? config.costTen : config.costSingle;

  if (config.id === "era" && !args.eraId) {
    return { ok: false, error: "時代專召需要指定時代" };
  }

  // Free pulls always pay via the "free" lane — but only on standard pool
  // (featured/era/basic pulls should feel intentional, not auto-spend).
  const useFree = config.id === "standard" && user.freePulls >= count;

  // Balance check
  if (!useFree) {
    if (config.currency === "eraTicket") {
      const tickets = parseEraTickets(user.eraTickets);
      const have = getEraTicketCount(tickets, args.eraId!);
      if (have < cost) {
        return {
          ok: false,
          error: `時代券不足(需 ${cost} 張,目前 ${have} 張)· 擊敗時代 BOSS 可取得`,
        };
      }
    } else {
      const balance =
        config.currency === "crystals" ? user.crystals : user.faith;
      if (balance < cost) {
        const label = config.currency === "crystals" ? "水晶" : "信念幣";
        return {
          ok: false,
          error: `${label}不足(需 ${cost},目前 ${balance})`,
        };
      }
    }
  }

  // Weaver-level perk: SSR rate bonus (Lv.15+)
  const perks = perksForLevel(weaverLevel(user.totalBelievers));

  const { rarities, finalPity } = pullRarities(
    count,
    {
      pitySR: user.pitySR,
      pitySSR: user.pitySSR,
      pityUR: user.pityUR,
    },
    perks.ssrRateBonus,
    config.baseRates,
    config.tenPullRates,
  );

  // Look up candidate cards filtered by rarity (and era for era pool).
  const poolByRarity = new Map<Rarity, CardWithImage[]>();
  for (const rarity of new Set(rarities)) {
    const raw = await prisma.card.findMany({
      where:
        config.id === "era" && args.eraId
          ? { rarity, eraId: args.eraId }
          : { rarity },
      include: { image: { select: { cardId: true } } },
    });
    if (raw.length === 0) {
      return {
        ok: false,
        error: `無法抽卡:${rarity} ${config.id === "era" ? `(${args.eraId}) ` : ""}池為空`,
      };
    }
    poolByRarity.set(
      rarity,
      raw.map((r) => {
        const { image, ...rest } = r;
        return { ...rest, hasImage: image !== null };
      }),
    );
  }

  // Weekly featured UR for featured pool
  let featuredUrId: string | null = null;
  if (config.id === "featured") {
    const urPool = poolByRarity.get("UR") ?? [];
    featuredUrId = pickFeaturedUrId(urPool.map((c) => c.id));
  }

  const drawn: CardWithImage[] = rarities.map((r) => {
    const pool = poolByRarity.get(r)!;
    // Featured pool: on UR, 50% chance to hit the weekly featured card
    if (r === "UR" && featuredUrId) {
      if (crypto.randomInt(0, 100) < 50) {
        const hit = pool.find((c) => c.id === featuredUrId);
        if (hit) return hit;
      }
    }
    return pool[crypto.randomInt(0, pool.length)];
  });

  // Era ticket path: debit atomically BEFORE drawing cards, so a race
  // can't double-spend the last tickets.
  if (!useFree && config.currency === "eraTicket") {
    const ok = await spendEraTickets(user.id, args.eraId!, cost);
    if (!ok) {
      return { ok: false, error: "時代券不足 · 擊敗時代 BOSS 可取得" };
    }
  }

  // Currency + pity update for non-ticket paths.
  const updateData: Record<string, unknown> = {
    pitySR: finalPity.pitySR,
    pitySSR: finalPity.pitySSR,
    pityUR: finalPity.pityUR,
    totalPulls: { increment: count },
  };
  let paidWith: "free" | "crystal" | "faith" | "eraTicket";
  if (useFree) {
    updateData.freePulls = { decrement: count };
    paidWith = "free";
  } else if (config.currency === "crystals") {
    updateData.crystals = { decrement: cost };
    paidWith = "crystal";
  } else if (config.currency === "faith") {
    updateData.faith = { decrement: cost };
    paidWith = "faith";
  } else {
    // eraTicket: already debited above
    paidWith = "eraTicket";
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: updateData,
    }),
    prisma.ownedCard.createMany({
      data: drawn.map((c) => ({ userId: user.id, cardId: c.id })),
    }),
  ]);

  // Mission progress (post-commit).
  await progressMission(user.id, "gacha_pull", count);
  if (!useFree) {
    if (config.currency === "crystals") {
      await progressMission(user.id, "crystals_spent", cost);
    } else if (config.currency === "faith") {
      await progressMission(user.id, "faith_spent", cost);
    }
    // eraTicket spend doesn't count toward crystal/faith missions (they're
    // earned via boss fights, not purchased).
  }

  revalidatePath("/gacha");
  revalidatePath("/home");
  revalidatePath("/collection");

  return {
    ok: true,
    data: {
      cards: drawn,
      crystalsLeft: updatedUser.crystals,
      faithLeft: updatedUser.faith,
      eraTicketsLeft: parseEraTickets(updatedUser.eraTickets),
      freePullsLeft: updatedUser.freePulls,
      pitySR: updatedUser.pitySR,
      pitySSR: updatedUser.pitySSR,
      pityUR: updatedUser.pityUR,
      totalPulls: updatedUser.totalPulls,
      paidWith,
      poolId: config.id,
      featuredUrId,
    },
  };
}

/**
 * Return a lightweight preview of the weekly-featured UR card for the
 * featured pool (deterministic by UTC week). Called from the server page
 * for render-time display.
 */
export async function getFeaturedUr(): Promise<{
  id: string;
  name: string;
  eraId: string;
  hasImage: boolean;
} | null> {
  const urs = await prisma.card.findMany({
    where: { rarity: "UR" },
    include: { image: { select: { cardId: true } } },
    orderBy: { id: "asc" },
  });
  const id = pickFeaturedUrId(urs.map((c) => c.id));
  if (!id) return null;
  const hit = urs.find((c) => c.id === id);
  if (!hit) return null;
  return {
    id: hit.id,
    name: hit.name,
    eraId: hit.eraId,
    hasImage: hit.image !== null,
  };
}
