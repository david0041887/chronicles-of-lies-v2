import { auth } from "@/auth";
import { csrfGate } from "@/lib/csrf";
import { spendTowerTokens } from "@/lib/dungeon/service";
import { getOffer } from "@/lib/dungeon/tower-shop";
import { takeBurst } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Spend tower tokens on a catalog offer. The catalog is server-side
 * (src/lib/dungeon/tower-shop.ts) so a forged client payload can't
 * inflate rewards — we look up the offer by id and trust ONLY the
 * server-side cost + rewards.
 */
export async function POST(req: Request) {
  const csrf = csrfGate(req);
  if (csrf) return csrf;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!takeBurst(`tower:redeem:${session.user.id}`, 60_000, 30)) {
    return NextResponse.json({ error: "請求太頻繁" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const offerId = (body as Record<string, unknown> | null)?.offerId;
  if (typeof offerId !== "string") {
    return NextResponse.json({ error: "Missing offerId" }, { status: 400 });
  }
  const offer = getOffer(offerId);
  if (!offer) {
    return NextResponse.json({ error: "Unknown offer" }, { status: 400 });
  }

  try {
    const result = await spendTowerTokens(
      session.user.id,
      offer.cost,
      offer.rewards,
    );
    return NextResponse.json({
      ok: true,
      offerId: offer.id,
      cost: offer.cost,
      rewards: offer.rewards,
      remainingTokens: result.remainingTokens,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    if (msg === "INSUFFICIENT_TOKENS") {
      return NextResponse.json(
        { error: "塔幣不足" },
        { status: 400 },
      );
    }
    if (msg === "INVALID_COST") {
      return NextResponse.json(
        { error: "兌換項目錯誤" },
        { status: 400 },
      );
    }
    console.error("tower redeem failed", err);
    return NextResponse.json({ error: "兌換失敗" }, { status: 500 });
  }
}
