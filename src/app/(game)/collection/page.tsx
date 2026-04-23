import { PageHeader } from "@/components/ui/PageHeader";
import { requireOnboarded } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { CollectionClient } from "./CollectionClient";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const user = await requireOnboarded();

  const [rawCards, owned] = await Promise.all([
    prisma.card.findMany({
      orderBy: [{ rarity: "desc" }, { eraId: "asc" }, { cost: "asc" }],
      include: { image: { select: { cardId: true } } },
    }),
    prisma.ownedCard.groupBy({
      by: ["cardId"],
      where: { userId: user.id },
      _count: true,
    }),
  ]);

  // Strip image relation + add hasImage flag
  const allCards = rawCards.map(({ image, ...c }) => ({
    ...c,
    hasImage: image !== null,
  }));

  const ownedMap = Object.fromEntries(
    owned.map((o) => [o.cardId, o._count]),
  ) as Record<string, number>;

  const uniqueOwned = owned.length;
  const totalPulls = allCards.reduce((s, c) => s + (ownedMap[c.id] ?? 0), 0);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="Grimoire"
        title="卡牌圖鑑"
        subtitle="你已喚出的,與尚未相遇的存在。"
        actions={
          <div className="flex gap-4">
            <Stat label="收藏" value={`${uniqueOwned} / ${allCards.length}`} />
            <Stat label="總抽出" value={totalPulls} />
          </div>
        }
      />

      <CollectionClient cards={allCards} ownedMap={ownedMap} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <div className="text-xs text-parchment/50 tracking-wider">{label}</div>
      <div className="font-[family-name:var(--font-mono)] text-xl text-parchment tabular-nums">
        {value}
      </div>
    </div>
  );
}
