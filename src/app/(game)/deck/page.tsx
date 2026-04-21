import { requireOnboarded } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DeckClient } from "./DeckClient";

export const dynamic = "force-dynamic";

export default async function DeckPage() {
  const user = await requireOnboarded();

  const [rawOwned, existingDeck] = await Promise.all([
    prisma.ownedCard.groupBy({
      by: ["cardId"],
      where: { userId: user.id },
      _count: true,
    }),
    prisma.deck.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const cardIds = rawOwned.map((o) => o.cardId);
  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
    include: { image: { select: { cardId: true } } },
  });

  const ownedMap = Object.fromEntries(rawOwned.map((o) => [o.cardId, o._count]));
  const mapped = cards.map(({ image, ...c }) => ({
    ...c,
    hasImage: image !== null,
    ownedCount: ownedMap[c.id] ?? 0,
  }));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <DeckClient
        ownedCards={mapped}
        initialDeck={existingDeck?.cardIds ?? []}
      />
    </main>
  );
}
