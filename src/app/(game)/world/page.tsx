import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { PageHeader } from "@/components/ui/PageHeader";
import { ERAS } from "@/lib/constants/eras";
import { requireOnboarded } from "@/lib/auth-helpers";
import { dailyLegendIndex } from "@/lib/daily-legend";
import { prisma } from "@/lib/prisma";
import { ensureStagesSeeded } from "@/lib/seed-stages";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import { WorldGrid } from "./WorldGrid";

export const dynamic = "force-dynamic";

export default async function WorldPage() {
  const user = await requireOnboarded();
  // Idempotent: if DB has <70 stages, seed the missing Prime/Elite rows.
  await ensureStagesSeeded();
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

  // Progressive unlock chain: era N+1 is locked until era N's BOSS is cleared.
  // Admins bypass the gate so they can test any era directly.
  const isAdmin = user.role === "ADMIN";
  const tiles = ERAS.map((era, idx) => {
    const progress = progressByEra.get(era.id);
    const prevEra = idx > 0 ? ERAS[idx - 1] : null;
    const prevProgress = prevEra ? progressByEra.get(prevEra.id) : null;
    const unlocked =
      isAdmin ||
      idx === 0 ||
      !!prevProgress?.bossCleared;
    return {
      era,
      believers: progress?.believers ?? 0,
      highestStage: progress?.highestStage ?? 0,
      totalStages: stagesByEra.get(era.id) ?? 3,
      bossCleared: progress?.bossCleared ?? false,
      unlocked,
      prevEraName: prevEra?.name ?? null,
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

      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          align="center"
          eyebrow="The Weavers' Map"
          title="世界之帷"
          subtitle={
            perks.dailyLegendActive
              ? "每個時代每日輪替一個今日傳說 — 選對時代,牌組發揮極致。"
              : "達到編織者 Lv.3 可啟動「每日傳說」系統。"
          }
        />

        <div className="mb-8 flex items-center justify-center gap-6 text-xs">
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

        <WorldGrid tiles={tiles} />

        <div className="mt-12 text-center text-xs text-parchment/30 tracking-widest">
          10 個時代 · 每代 4 主線關 + 3 Prime 深淵關
        </div>
      </main>
    </div>
  );
}
