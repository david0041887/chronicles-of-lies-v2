import { HomeHud } from "@/components/game/HomeHud";
import { MilestonePanel } from "@/components/game/MilestonePanel";
import { requireOnboarded } from "@/lib/auth-helpers";
import { evaluate } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import { levelProgress, weaverLevel } from "@/lib/weaver";
import Link from "next/link";

const QUICK_ACTIONS = [
  { href: "/world", label: "進入世界", desc: "10 個時代 30 關卡", emoji: "🌍" },
  { href: "/gacha", label: "召喚儀式", desc: "抽卡 / 十連", emoji: "🎴" },
  { href: "/collection", label: "卡牌圖鑑", desc: "我的收藏", emoji: "📚" },
  { href: "/deck", label: "牌組編制", desc: "組 30 張牌組", emoji: "🃏" },
  { href: "/forge", label: "鍛造所", desc: "升星 / 融合", emoji: "⚒️" },
];

export default async function HomePage() {
  const user = await requireOnboarded();

  const bossesCleared = await prisma.eraProgress.count({
    where: { userId: user.id, bossCleared: true },
  });

  const weaver = levelProgress(user.totalBelievers);

  const milestones = evaluate(
    {
      level: weaverLevel(user.totalBelievers),
      battlesWon: user.battlesWon,
      bossesCleared,
      eraClearCount: 0,
    },
    user.claimedMilestones,
  );

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <HomeHud
        username={user.username}
        faction={user.faction}
        currencies={{
          crystals: user.crystals,
          faith: user.faith,
          essence: user.essence,
          masks: user.masks,
          scrolls: user.scrolls,
        }}
        veilEnergy={user.veilEnergy}
        weaver={weaver}
      />

      {user.freePulls > 0 && (
        <Link
          href="/gacha"
          className="block p-4 rounded-xl border-2 border-gold bg-gold/10 hover:bg-gold/15 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="display-serif text-gold text-lg">
                🎁 您有 {user.freePulls} 次免費抽卡
              </div>
              <div className="text-xs text-parchment/60 mt-0.5">
                前往召喚儀式使用
              </div>
            </div>
            <span className="text-parchment/60 text-lg">→</span>
          </div>
        </Link>
      )}

      <MilestonePanel milestones={milestones} />

      <section>
        <h3 className="display-serif text-xl text-sacred mb-4">今日行動</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="p-5 rounded-xl border border-parchment/10 bg-veil/40 hover:border-gold/40 hover:bg-veil/60 transition-all group"
            >
              <div className="text-3xl mb-2">{a.emoji}</div>
              <div className="display-serif text-base text-parchment group-hover:text-gold transition-colors">
                {a.label}
              </div>
              <div className="text-xs text-parchment/50 mt-0.5">{a.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h3 className="display-serif text-xl text-sacred mb-4">戰績</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="戰鬥勝利" value={user.battlesWon} />
          <Stat label="戰鬥失敗" value={user.battlesLost} />
          <Stat label="總信徒" value={user.totalBelievers} />
          <Stat label="擁有卡牌" value={user.cardsCollected} />
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-lg border border-parchment/10 bg-veil/30">
      <div className="text-xs text-parchment/50 tracking-wider">{label}</div>
      <div className="font-[family-name:var(--font-mono)] text-2xl text-parchment tabular-nums mt-1">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
