import { requireOnboarded } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DeckClient } from "./DeckClient";
import { MAX_DECK_SLOTS } from "./constants";

export const dynamic = "force-dynamic";

export default async function DeckPage() {
  const user = await requireOnboarded();

  // Pull every saved slot in one query so the client can switch tabs
  // without a server round-trip. Most users will have 1; this is at
  // most 3 rows.
  const [rawOwned, allDecks] = await Promise.all([
    prisma.ownedCard.groupBy({
      by: ["cardId"],
      where: { userId: user.id },
      _count: true,
    }),
    prisma.deck.findMany({
      where: { userId: user.id },
      orderBy: { slot: "asc" },
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

  // Build a slot → cardIds dictionary covering all 3 slots, even
  // unfilled ones, so the client renders empty placeholder slots
  // without a separate "fetch on switch" step.
  const slotDecks: Record<number, string[]> = {};
  for (let i = 1; i <= MAX_DECK_SLOTS; i++) slotDecks[i] = [];
  for (const d of allDecks) {
    if (d.slot >= 1 && d.slot <= MAX_DECK_SLOTS) slotDecks[d.slot] = d.cardIds;
  }

  const activeSlot = user.activeDeckSlot ?? 1;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <DeckClient
        ownedCards={mapped}
        slotDecks={slotDecks}
        activeSlot={activeSlot}
        maxSlots={MAX_DECK_SLOTS}
      />
    </main>
  );
}
