import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { ERAS } from "@/lib/constants/eras";
import { requireUser } from "@/lib/auth-helpers";
import { WorldGrid } from "./WorldGrid";

export default async function WorldPage() {
  const user = await requireUser();
  const progressByEra = new Map(user.eraProgress.map((p) => [p.eraId, p]));

  const tiles = ERAS.map((era) => ({
    era,
    believers: progressByEra.get(era.id)?.believers ?? 0,
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
            選擇一個時代傳播謊言。信徒越多,你的帷幕越厚。
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
