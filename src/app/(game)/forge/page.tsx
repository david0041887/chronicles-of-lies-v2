import { requireOnboarded } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ForgeClient } from "./ForgeClient";

export const dynamic = "force-dynamic";

export default async function ForgePage() {
  const user = await requireOnboarded();

  const owned = await prisma.ownedCard.findMany({
    where: { userId: user.id },
    include: {
      card: { include: { image: { select: { cardId: true } } } },
    },
    orderBy: { stars: "desc" },
  });

  // Group by card template to compute best star & count
  type Group = {
    cardId: string;
    best: number;
    count: number;
    instances: { id: string; stars: number }[];
    card: {
      id: string;
      name: string;
      nameEn: string | null;
      eraId: string;
      rarity: "R" | "SR" | "SSR" | "UR";
      type: string;
      cost: number;
      power: number;
      keywords: string[];
      flavor: string | null;
      imageUrl: string | null;
      hasImage: boolean;
    };
  };
  const byCard = new Map<string, Group>();
  for (const o of owned) {
    const g = byCard.get(o.cardId);
    if (g) {
      g.count++;
      g.best = Math.max(g.best, o.stars);
      g.instances.push({ id: o.id, stars: o.stars });
    } else {
      const { image, ...cardRest } = o.card;
      byCard.set(o.cardId, {
        cardId: o.cardId,
        best: o.stars,
        count: 1,
        instances: [{ id: o.id, stars: o.stars }],
        card: { ...cardRest, hasImage: image !== null },
      });
    }
  }
  const groups = [...byCard.values()];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <ForgeClient groups={groups} />
    </main>
  );
}
