import { OrnamentDivider } from "@/components/fx/OrnamentDivider";
import { PageHeader } from "@/components/ui/PageHeader";
import { ERAS } from "@/lib/constants/eras";
import { requireOnboarded } from "@/lib/auth-helpers";
import { getOrCreateRun, readTowerState } from "@/lib/dungeon/service";
import {
  TOWER_FLOORS_PER_WING,
  planTowerFloor,
} from "@/lib/dungeon/tower";
import { TowerHubClient } from "./TowerHubClient";

export const dynamic = "force-dynamic";

export default async function TowerHubPage() {
  const user = await requireOnboarded();
  const run = await getOrCreateRun(user.id, "tower");
  const { towerTokens } = readTowerState(run);

  const nextFloor = run.level + 1;
  const upcoming = planTowerFloor(user.id, nextFloor);
  const eraMeta = ERAS.find((e) => e.id === upcoming.eraId);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="Tower of Whispers"
        title="幽音塔"
        subtitle="低語層層上升 — 每 5 層為一段守關"
      />

      <TowerHubClient
        run={{
          currentLevel: run.level,
          highestLevel: run.highestLevel,
          totalClears: run.totalClears,
          towerTokens,
          floorsPerWing: TOWER_FLOORS_PER_WING,
        }}
        nextFloor={{
          floor: upcoming.floor,
          tierLabel: upcoming.tierLabel,
          enemyName: upcoming.enemyName,
          eraName: eraMeta?.name ?? upcoming.eraId,
          eraEmoji: eraMeta?.emoji ?? "·",
          eraTint: eraMeta?.palette.main ?? "#888",
          enemyHp: upcoming.enemyHp,
          isWingBoss: upcoming.isWingBoss,
          modBadges: modBadges(upcoming.enemyMods),
          reward: upcoming.rewardPreview,
        }}
      />

      <OrnamentDivider />

      <section className="text-[11px] text-parchment/40 text-center mt-6 leading-relaxed">
        <p>幽音塔不會結束 — 你能爬多高,就走多遠。</p>
        <p className="mt-1">
          失敗後本次層數歸零,但最高紀錄與已獲取的素材會保留。
        </p>
      </section>
    </main>
  );
}

function modBadges(mods: {
  startShield?: number;
  extraStartMana?: number;
  enrageAt?: number;
  label?: string;
}): { label: string; tint: string }[] {
  const out: { label: string; tint: string }[] = [];
  if (mods.startShield) {
    out.push({ label: `🛡 護盾 ${mods.startShield}`, tint: "info" });
  }
  if (mods.extraStartMana) {
    out.push({ label: `⚡ 信仰 +${mods.extraStartMana}`, tint: "gold" });
  }
  if (mods.enrageAt) {
    out.push({
      label: `⚠️ ${Math.round(mods.enrageAt * 100)}% HP 狂暴`,
      tint: "danger",
    });
  }
  return out;
}
