import { BattleClient } from "@/app/(game)/battle/[stageId]/BattleClient";
import { applyDailyLegendBuff, buildPlayerDeck, buildStageDeck } from "@/lib/battle/deck";
import { signTicket } from "@/lib/battle/ticket";
import { ERAS } from "@/lib/constants/eras";
import { dailyLegendIndex } from "@/lib/daily-legend";
import { getOrCreateRun } from "@/lib/dungeon/service";
import { buildTowerEnemyDeckIds, planTowerFloor } from "@/lib/dungeon/tower";
import { LEGEND_CARDS } from "@/lib/legend-cards";
import { prisma } from "@/lib/prisma";
import { requireOnboarded } from "@/lib/auth-helpers";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ floor: string }>;
}

const TOWER_STAGE_PREFIX = "__tower:";

/**
 * Tower battle runner. Validates that the requested floor is exactly
 * the player's next-allowed floor (= currentLevel + 1) so a player
 * can't skip ahead by typing a higher number in the URL.
 *
 * Issues a ticket bound to the synthetic stage id `__tower:<floor>`
 * which the battle-complete handler recognises and routes to the
 * dungeon-specific reward path.
 */
export default async function TowerBattlePage({ params }: Props) {
  const { floor: floorRaw } = await params;
  const floor = parseInt(floorRaw, 10);
  if (!Number.isInteger(floor) || floor < 1 || floor > 200) notFound();

  const user = await requireOnboarded();
  const run = await getOrCreateRun(user.id, "tower");

  // Anti-skip — must be the canonical next floor for this run.
  const expectedFloor = run.level + 1;
  if (floor !== expectedFloor) {
    redirect("/dungeon/tower");
  }

  const plan = planTowerFloor(user.id, floor);
  const era = ERAS.find((e) => e.id === plan.eraId);
  if (!era) notFound();

  // Build enemy deck from the era's R-rarity card pool. We pull all the
  // R-rarity cards for the matched era and let the tower lib pick a
  // deterministic subset (so a given user always faces the same deck on
  // the same floor).
  const eraRPool = await prisma.card.findMany({
    where: { eraId: era.id, rarity: "R" },
    select: { id: true },
  });
  const eraCardIds = eraRPool.map((c) => c.id);
  const enemyCardIds =
    eraCardIds.length > 0
      ? buildTowerEnemyDeckIds(eraCardIds, floor, user.id)
      : [];
  const enemyDeck = await buildStageDeck(enemyCardIds);

  // Player uses their real deck — tower is gear-check content.
  const rawPlayerDeck = await buildPlayerDeck(user.id);

  // Match the campaign battle's < 15-card guard so a brand-new player
  // can't get stuck on a tower-battle screen with no playable hand.
  // Without this they'd hit the BattleClient with too few cards and
  // either OOM the engine or just stare at an empty hand forever.
  if (rawPlayerDeck.length < 15) {
    const { default: Link } = await import("next/link");
    return (
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="display-serif text-2xl text-parchment mb-3">卡牌不足</h1>
        <p className="text-parchment/60 mb-6 text-sm">
          您目前只有 {rawPlayerDeck.length} 張卡,至少需要 15 張才能進入幽音塔。
          <br />
          先到 <Link href="/gacha" className="text-gold underline">召喚</Link>{" "}
          多抽幾張,或返回{" "}
          <Link href="/dungeon/tower" className="text-gold underline">
            幽音塔大廳
          </Link>
          。
        </p>
      </main>
    );
  }

  const { deck: playerDeck } = applyDailyLegendBuff(rawPlayerDeck, era.id);
  const todayLegendIdx = dailyLegendIndex(era.id, new Date());
  const dailyLegend =
    weaverLevel(user.totalBelievers) >= 3 && LEGEND_CARDS[era.id]
      ? {
          index: todayLegendIdx,
          name: era.heroes[todayLegendIdx] ?? "傳說",
          boostedCardNames: [],
        }
      : null;

  const stageId = `${TOWER_STAGE_PREFIX}${floor}`;
  const ticket = signTicket(user.id, stageId);

  const perks = perksForLevel(weaverLevel(user.totalBelievers));

  return (
    <BattleClient
      stage={{
        id: stageId,
        name: `幽音塔 · 第 ${floor} 層`,
        subtitle: plan.tierLabel,
        difficulty: Math.min(10, Math.ceil(floor / 3)),
        enemyHp: plan.enemyHp,
        enemyName: plan.enemyName,
        isBoss: plan.isWingBoss,
        mode: "normal",
        eraId: era.id,
        rewardCrystals: plan.rewardPreview.crystals,
        rewardExp: 0,
        rewardBelievers: 0,
      }}
      era={{
        id: era.id,
        name: era.name,
        palette: era.palette,
        emoji: era.emoji,
      }}
      playerName={user.username}
      playerDeck={playerDeck}
      enemyDeck={enemyDeck}
      playerPerks={perks}
      dailyLegend={dailyLegend}
      enemyMods={plan.enemyMods}
      ticket={ticket}
      returnHref="/dungeon/tower"
    />
  );
}
