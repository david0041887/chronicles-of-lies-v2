import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { ERAS } from "@/lib/constants/eras";
import { requireOnboarded } from "@/lib/auth-helpers";
import { dailyLegendIndex } from "@/lib/daily-legend";
import { prisma } from "@/lib/prisma";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import { WorldGrid } from "./WorldGrid";

export const dynamic = "force-dynamic";

export default async function WorldPage() {
  const user = await requireOnboarded();
  const progressByEra = new Map(user.eraProgress.map((p) => [p.eraId, p]));

  const perks = perksForLevel(weaverLevel(user.totalBelievers));

  // Count stages per era for the progress pips.
  const stageCounts = await prisma.stage.groupBy({
    by: ["eraId"],
    _count: { _all: true },
  });
  const stagesByEra = new Map(
    stageCounts.map((s) => [s.eraId, s._count._all]),
  );

  const tiles = ERAS.map((era) => {
    const progress = progressByEra.get(era.id);
    return {
      era,
      believers: progress?.believers ?? 0,
      highestStage: progress?.highestStage ?? 0,
      totalStages: stagesByEra.get(era.id) ?? 3,
      bossCleared: progress?.bossCleared ?? false,
      dailyLegendName: perks.dailyLegendActive
        ? era.legends[dailyLegendIndex(era.id)]?.name
        : undefined,
    };
  });

  const totalCleared = tiles.filter((t) => t.bossCleared).length;
  const totalStarted = tiles.filter(
    (t) => t.highestStage > 0 || t.bossCleared,
  ).length;

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <VeilBackdrop intensity="high" />

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-3">
            The Weavers&apos; Map
          </p>
          <h1 className="display-serif text-4xl text-sacred mb-2">世界之帷</h1>
          <p className="text-parchment/60 text-sm max-w-lg mx-auto">
            {perks.dailyLegendActive
              ? "每個時代每日輪替一個今日傳說 — 選對時代,牌組發揮極致。"
              : "達到編織者 Lv.3 可啟動「每日傳說」系統。"}
          </p>

          {/* Overall progress summary */}
          <div className="mt-5 flex items-center justify-center gap-6 text-xs">
            <span className="text-parchment/60">
              踏足時代 <span className="font-[family-name:var(--font-mono)] text-parchment tabular-nums">{totalStarted}</span>
              <span className="text-parchment/40"> / {tiles.length}</span>
            </span>
            <span className="text-parchment/20">·</span>
            <span className="text-gold">
              BOSS 擊敗 <span className="font-[family-name:var(--font-mono)] tabular-nums">{totalCleared}</span>
              <span className="text-gold/50"> / {tiles.length}</span>
            </span>
          </div>
        </div>

        <WorldGrid tiles={tiles} />

        <div className="mt-12 text-center text-xs text-parchment/30 tracking-widest">
          10 / 15 時代已開啟 · E10-E15 於後續 phase 加入
        </div>
      </main>
    </div>
  );
}
