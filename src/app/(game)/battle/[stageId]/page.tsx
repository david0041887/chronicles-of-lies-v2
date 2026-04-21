import { requireOnboarded } from "@/lib/auth-helpers";
import { buildPlayerDeck, buildStageDeck } from "@/lib/battle/deck";
import { prisma } from "@/lib/prisma";
import { getEra } from "@/lib/constants/eras";
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

  const [playerDeck, enemyDeck] = await Promise.all([
    buildPlayerDeck(user.id),
    buildStageDeck(stage.enemyDeck),
  ]);

  if (playerDeck.length < 15) {
    return (
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="display-serif text-2xl text-parchment mb-3">卡牌不足</h1>
        <p className="text-parchment/60 mb-6 text-sm">
          您目前只有 {playerDeck.length} 張卡,至少需要 15 張才能進入戰場。
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
        eraId: stage.eraId,
        rewardCrystals: stage.rewardCrystals,
        rewardExp: stage.rewardExp,
        rewardBelievers: stage.rewardBelievers,
      }}
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
      playerDeck={playerDeck}
      enemyDeck={enemyDeck}
    />
  );
}
