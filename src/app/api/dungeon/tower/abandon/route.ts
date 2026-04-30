import { auth } from "@/auth";
import { csrfGate } from "@/lib/csrf";
import { takeBurst } from "@/lib/rate-limit";
import { abandonRun } from "@/lib/dungeon/service";
import { NextResponse } from "next/server";

/**
 * Voluntarily reset a tower run back to floor 0. UI shows this as
 * "撤離塔樓" — the player keeps every reward earned + their high-water
 * mark, but the next entry starts from floor 1 again.
 *
 * Used when the player sees a high-floor matchup they don't want to
 * fight (e.g. a bad SR draw), or when they just want a fresh sweep.
 */
export async function POST(req: Request) {
  const csrf = csrfGate(req);
  if (csrf) return csrf;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!takeBurst(`tower:abandon:${session.user.id}`, 60_000, 10)) {
    return NextResponse.json({ error: "請求太頻繁" }, { status: 429 });
  }

  const run = await abandonRun(session.user.id, "tower");
  return NextResponse.json({
    ok: true,
    run: {
      currentLevel: run.level,
      highestLevel: run.highestLevel,
    },
  });
}
