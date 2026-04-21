import { EraCard } from "@/components/game/EraCard";
import { ERAS } from "@/lib/constants/eras";
import { requireUser } from "@/lib/auth-helpers";

export default async function WorldPage() {
  const user = await requireUser();
  const progressByEra = new Map(user.eraProgress.map((p) => [p.eraId, p]));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-10">
        <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-3">
          The Weavers&apos; Map
        </p>
        <h1 className="display-serif text-4xl text-sacred mb-2">世界之帷</h1>
        <p className="text-parchment/60 text-sm max-w-lg mx-auto">
          選擇一個時代傳播謊言。信徒越多,你的帷幕越厚。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ERAS.map((era) => {
          const p = progressByEra.get(era.id);
          return (
            <EraCard
              key={era.id}
              era={era}
              believers={p?.believers ?? 0}
            />
          );
        })}
      </div>

      <div className="mt-12 text-center text-xs text-parchment/30 tracking-widest">
        其他 11 個時代將於 Phase 2 起陸續開放
      </div>
    </main>
  );
}
