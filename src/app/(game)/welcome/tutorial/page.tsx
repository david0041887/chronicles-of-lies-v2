import { TutorialClient } from "./TutorialClient";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { enrichCardKeywords } from "@/lib/battle/keyword-enrichment";
import type { BattleCard } from "@/lib/battle/types";
import { getEra } from "@/lib/constants/eras";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Tutorial demo deck — 5 high-tier egypt + 25 R filler across eras
const TUTORIAL_PLAYER_CARDS = [
  "ssr_eg_001", // 阿努比斯
  "ssr_eg_002", // 伊西斯
  "sr_eg_001",  // 拉
  "sr_eg_002",  // 塞特
  "sr_eg_004",  // 荷魯斯之眼
  "r_eg_001", "r_eg_002", "r_eg_003", "r_eg_004", "r_eg_005",
  "r_eg_006", "r_eg_007", "r_eg_008", "r_eg_009",
  "r_md_001", "r_md_003", "r_md_007",
  "r_mg_001", "r_mg_004", "r_mg_006", "r_mg_007",
  "r_mo_001", "r_mo_003", "r_mo_005",
  "r_ha_001", "r_ha_004", "r_ha_005",
  "r_pr_001", "r_pr_006", "r_no_001",
] satisfies string[];

const TUTORIAL_ENEMY_CARDS = [
  "r_eg_001", "r_eg_001", "r_eg_002", "r_eg_002",
  "r_eg_003", "r_eg_004", "r_eg_007", "r_eg_008",
  "r_eg_001", "r_eg_002", "r_eg_003", "r_eg_007",
] satisfies string[];

export default async function TutorialBattlePage() {
  const user = await requireUser();
  if (user.tutorialDone) redirect("/home");

  const allIds = [...new Set([...TUTORIAL_PLAYER_CARDS, ...TUTORIAL_ENEMY_CARDS])];
  const rows = await prisma.card.findMany({
    where: { id: { in: allIds } },
    include: { image: { select: { cardId: true } } },
  });
  const byId = new Map(rows.map((c) => [c.id, c]));

  const toBattleCard = (id: string, uid: string): BattleCard | null => {
    const c = byId.get(id);
    if (!c) return null;
    return enrichCardKeywords({
      id: c.id,
      uid,
      name: c.name,
      nameEn: c.nameEn,
      eraId: c.eraId,
      rarity: c.rarity,
      type: c.type,
      cost: c.cost,
      power: c.power,
      keywords: c.keywords,
      flavor: c.flavor,
      hasImage: c.image !== null,
      imageUrl: c.imageUrl,
    });
  };

  const playerDeck = TUTORIAL_PLAYER_CARDS
    .map((id, i) => toBattleCard(id, `tut-p-${i}`))
    .filter((c): c is BattleCard => c !== null);
  const enemyDeck = TUTORIAL_ENEMY_CARDS
    .map((id, i) => toBattleCard(id, `tut-e-${i}`))
    .filter((c): c is BattleCard => c !== null);

  const era = getEra("egypt")!;

  return (
    <TutorialClient
      stage={{
        id: "tutorial",
        name: "教學 · 初次召喚",
        subtitle: "學會如何編織帷幕",
        difficulty: 1,
        enemyHp: 20,
        enemyName: "木乃伊小弟",
        isBoss: false,
        eraId: "egypt",
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
    />
  );
}
