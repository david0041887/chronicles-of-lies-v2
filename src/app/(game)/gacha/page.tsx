import { requireOnboarded } from "@/lib/auth-helpers";
import { PITY_SR, PITY_SSR, PITY_UR } from "@/lib/gacha";
import { msUntilNextWeekRotation, POOLS } from "@/lib/gacha-pools";
import { getFeaturedUr } from "./actions";
import { GachaClient } from "./GachaClient";

export const dynamic = "force-dynamic";

export default async function GachaPage() {
  const user = await requireOnboarded();
  const featuredUr = await getFeaturedUr();
  const featuredRotationMs = msUntilNextWeekRotation();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-3">
          Summoning Ritual · Four Pools
        </p>
        <h1 className="display-serif text-4xl text-sacred mb-2">召喚儀式</h1>
        <p className="text-parchment/60 text-sm">
          從帷幕彼岸喚來沉睡的存在。每個池子,皆是不同的捷徑。
        </p>
      </div>

      <GachaClient
        initialCrystals={user.crystals}
        initialFaith={user.faith}
        initialFreePulls={user.freePulls}
        initialPitySR={user.pitySR}
        initialPitySSR={user.pitySSR}
        initialPityUR={user.pityUR}
        initialTotalPulls={user.totalPulls}
        featuredUr={featuredUr}
        featuredRotationMs={featuredRotationMs}
      />

      <section className="mt-10 rounded-xl border border-parchment/10 bg-veil/30 p-5 text-xs text-parchment/60">
        <h3 className="display-serif text-base text-sacred mb-3">四池與保底</h3>
        <ul className="space-y-1.5 leading-relaxed">
          {(["standard", "featured", "era", "basic"] as const).map((id) => (
            <li key={id}>
              • <span className="text-parchment/80">{POOLS[id].emoji} {POOLS[id].name}</span> — {POOLS[id].rateHint}
              <span className="text-parchment/40 ml-2">
                ({POOLS[id].currency === "crystals" ? "💎" : "🕯️"} {POOLS[id].costSingle} / {POOLS[id].costTen})
              </span>
            </li>
          ))}
          <li className="pt-2 border-t border-parchment/10 mt-2">
            • 保底(四池共用計數):{PITY_SR} 連保 SR / {PITY_SSR} 連保 SSR / {PITY_UR} 連保 UR
          </li>
          <li>• 十連抽必出至少 2 張 SR,並享 10% 折扣</li>
          <li>• 免費抽僅在標準池自動抵扣,其他池為有意識的選擇</li>
        </ul>
      </section>
    </main>
  );
}
