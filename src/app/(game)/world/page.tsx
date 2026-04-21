import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { ERAS } from "@/lib/constants/eras";
import { requireOnboarded } from "@/lib/auth-helpers";
import { dailyLegendIndex } from "@/lib/daily-legend";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import { WorldGrid } from "./WorldGrid";

export default async function WorldPage() {
  const user = await requireOnboarded();
  const progressByEra = new Map(user.eraProgress.map((p) => [p.eraId, p]));

  const perks = perksForLevel(weaverLevel(user.totalBelievers));

  const tiles = ERAS.map((era) => ({
    era,
    believers: progressByEra.get(era.id)?.believers ?? 0,
    dailyLegendName: perks.dailyLegendActive
      ? era.legends[dailyLegendIndex(era.id)]?.name
      : undefined,
  }));

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <VeilBackdrop intensity="high" />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10">
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
        </div>

        <WorldGrid tiles={tiles} />

        <div className="mt-12 text-center text-xs text-parchment/30 tracking-widest">
          10 / 15 時代已開啟 · E10-E15 於後續 phase 加入
        </div>
      </main>
    </div>
  );
}
