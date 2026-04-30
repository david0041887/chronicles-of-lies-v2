import { auth } from "@/auth";
import { csrfGate } from "@/lib/csrf";
import { takeBurst } from "@/lib/rate-limit";
import { getOrCreateRun } from "@/lib/dungeon/service";
import { planTowerFloor } from "@/lib/dungeon/tower";
import { NextResponse } from "next/server";

/**
 * Returns the plan for the next floor the player should fight on. Pure
 * read + lazy upsert — no rewards are awarded here; the actual fight
 * runs in the regular battle screen and on victory the battle-complete
 * handler advances the tower run.
 *
 * The route exists so the prep page can show a confirm dialog ("Floor
 * 7 / 試煉 / 木乃伊小弟 / Reward …") before committing to a battle.
 */
export async function POST(req: Request) {
  const csrf = csrfGate(req);
  if (csrf) return csrf;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!takeBurst(`tower:enter:${session.user.id}`, 60_000, 30)) {
    return NextResponse.json({ error: "請求太頻繁" }, { status: 429 });
  }

  const run = await getOrCreateRun(session.user.id, "tower");
  const nextFloor = run.level + 1;
  const plan = planTowerFloor(session.user.id, nextFloor);

  return NextResponse.json({
    ok: true,
    run: {
      currentLevel: run.level,
      highestLevel: run.highestLevel,
      totalClears: run.totalClears,
    },
    plan: {
      floor: plan.floor,
      tierLabel: plan.tierLabel,
      enemyName: plan.enemyName,
      eraId: plan.eraId,
      enemyHp: plan.enemyHp,
      isWingBoss: plan.isWingBoss,
      reward: plan.rewardPreview,
    },
  });
}
