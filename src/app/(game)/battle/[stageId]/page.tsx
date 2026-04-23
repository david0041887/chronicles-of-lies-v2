import { requireOnboarded } from "@/lib/auth-helpers";
import { applyDailyLegendBuff, buildPlayerDeck, buildStageDeck } from "@/lib/battle/deck";
import { modifiersForStage } from "@/lib/battle/engine";
import { prisma } from "@/lib/prisma";
import { getEra } from "@/lib/constants/eras";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BattleClient } from "./BattleClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ stageId: string }>;
}

export default async function BattlePage({ params }: Props) {
  const { stageId } = await params;
  const user = await requireOnboarded();

  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) notFound();

  const era = getEra(stage.eraId);

  const [rawPlayerDeck, enemyDeck, nextStage] = await Promise.all([
    buildPlayerDeck(user.id),
    buildStageDeck(stage.enemyDeck),
    // Find the next stage in the same mode+era by orderNum, for auto-advance.
    prisma.stage.findFirst({
      where: {
        eraId: stage.eraId,
        mode: stage.mode,
        orderNum: { gt: stage.orderNum },
      },
      orderBy: { orderNum: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (rawPlayerDeck.length < 15) {
    return (
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="display-serif text-2xl text-parchment mb-3">卡牌不足</h1>
        <p className="text-parchment/60 mb-6 text-sm">
          您目前只有 {rawPlayerDeck.length} 張卡,至少需要 15 張才能進入戰場。
          <br />
          先到 <Link href="/gacha" className="text-gold underline">召喚</Link>{" "}
          多抽幾張,或返回{" "}
          <Link href={`/era/${stage.eraId}`} className="text-gold underline">
            時代選單
          </Link>
          。
        </p>
      </main>
    );
  }

  // Compute weaver-level perks
  const level = weaverLevel(user.totalBelievers);
  const perks = perksForLevel(level);

  // Apply daily legend buff (only if the player's weaver level is Lv.3+)
  const buffed = perks.dailyLegendActive
    ? applyDailyLegendBuff(rawPlayerDeck, stage.eraId)
    : { deck: rawPlayerDeck, legendIdx: -1, boostedCards: [] as string[] };

  const enemyMods = modifiersForStage({
    isBoss: stage.isBoss,
    mode: stage.mode as "normal" | "prime",
  });

  return (
    <BattleClient
      stage={{
        id: stage.id,
        name: stage.name,
        subtitle: stage.subtitle,
        difficulty: stage.difficulty,
        enemyHp: stage.enemyHp,
        enemyName: stage.enemyName,
        isBoss: stage.isBoss,
        mode: stage.mode as "normal" | "prime",
        eraId: stage.eraId,
        rewardCrystals: stage.rewardCrystals,
        rewardExp: 0,
        rewardBelievers: stage.rewardBelievers,
      }}
      nextStage={nextStage}
      enemyMods={enemyMods}
      era={
        era
          ? {
              id: era.id,
              name: era.name,
              palette: era.palette,
              emoji: era.emoji,
            }
          : null
      }
      playerName={user.username}
      playerDeck={buffed.deck}
      enemyDeck={enemyDeck}
      playerPerks={{
        startHandBonus: perks.startHandBonus,
        startManaBonus: perks.startManaBonus,
        maxManaBonus: perks.maxManaBonus,
      }}
      dailyLegend={
        perks.dailyLegendActive && era && buffed.legendIdx >= 0
          ? {
              index: buffed.legendIdx,
              name: era.legends[buffed.legendIdx].name,
              boostedCardNames: buffed.deck
                .filter((c) => buffed.boostedCards.includes(c.id))
                .map((c) => c.name),
            }
          : null
      }
    />
  );
}
