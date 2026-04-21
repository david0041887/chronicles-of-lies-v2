import { requireUser } from "@/lib/auth-helpers";
import { COST_SINGLE, COST_TEN } from "@/lib/gacha";
import { GachaClient } from "./GachaClient";

export const dynamic = "force-dynamic";

export default async function GachaPage() {
  const user = await requireUser();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-3">
          Summoning Ritual
        </p>
        <h1 className="display-serif text-4xl text-sacred mb-2">召喚儀式</h1>
        <p className="text-parchment/60 text-sm">
          從帷幕彼岸喚來沉睡的存在。
        </p>
      </div>

      <GachaClient
        initialCrystals={user.crystals}
        initialPitySR={user.pitySR}
        initialPitySSR={user.pitySSR}
        initialTotalPulls={user.totalPulls}
        costSingle={COST_SINGLE}
        costTen={COST_TEN}
      />

      <section className="mt-10 rounded-xl border border-parchment/10 bg-veil/30 p-5 text-xs text-parchment/60">
        <h3 className="display-serif text-base text-sacred mb-3">機率與保底</h3>
        <ul className="space-y-1.5 leading-relaxed">
          <li>• R {`85%`} / SR {`12%`} / SSR {`3%`}(MVP 池無 UR)</li>
          <li>• 50 連內未出 SR → 下次保底 SR 以上</li>
          <li>• 90 連內未出 SSR → 下次保底 SSR</li>
          <li>• 十連抽保底至少 1 張 SR 以上</li>
        </ul>
      </section>
    </main>
  );
}
