import { OrnamentDivider } from "@/components/fx/OrnamentDivider";
import { DailyMissionsPanel } from "@/components/game/DailyMissionsPanel";
import { HomeHud } from "@/components/game/HomeHud";
import { MilestonePanel } from "@/components/game/MilestonePanel";
import { requireOnboarded } from "@/lib/auth-helpers";
import { ensureTodaysMissions } from "@/lib/daily-missions";
import { FUSION_INPUTS } from "@/lib/forge";
import { evaluate } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import { levelProgress, weaverLevel } from "@/lib/weaver";
import Link from "next/link";

const QUICK_ACTIONS = [
  {
    href: "/world",
    label: "進入世界",
    desc: "10 個時代 30 關卡",
    emoji: "🌍",
    tone: "#6B2E8A",
  },
  {
    href: "/gacha",
    label: "召喚儀式",
    desc: "抽卡 / 十連",
    emoji: "🎴",
    tone: "#D4A84B",
  },
  {
    href: "/collection",
    label: "卡牌圖鑑",
    desc: "我的收藏",
    emoji: "📚",
    tone: "#4A90E2",
  },
  {
    href: "/deck",
    label: "牌組編制",
    desc: "組 30 張牌組",
    emoji: "🃏",
    tone: "#22C55E",
  },
  {
    href: "/forge",
    label: "鍛造所",
    desc: "升星 / 融合",
    emoji: "⚒️",
    tone: "#EF4444",
  },
];

export default async function HomePage() {
  const user = await requireOnboarded();

  const bossesCleared = await prisma.eraProgress.count({
    where: { userId: user.id, bossCleared: true },
  });

  // Forge nudge — count upgradable (2+ copies) and fusable (3+ copies of <UR rarity).
  const ownedGroups = await prisma.ownedCard.groupBy({
    by: ["cardId"],
    where: { userId: user.id },
    _count: true,
  });
  const duplicateCardIds = ownedGroups
    .filter((g) => g._count >= 2)
    .map((g) => g.cardId);
  const fusableCardIds = ownedGroups
    .filter((g) => g._count >= FUSION_INPUTS)
    .map((g) => g.cardId);
  let upgradableCount = 0;
  let fusableCount = 0;
  if (duplicateCardIds.length > 0) {
    const cards = await prisma.card.findMany({
      where: { id: { in: duplicateCardIds } },
      select: { id: true, rarity: true },
    });
    upgradableCount = cards.length;
    fusableCount = cards.filter(
      (c) =>
        c.rarity !== "UR" && fusableCardIds.includes(c.id),
    ).length;
  }

  const weaver = levelProgress(user.totalBelievers);

  const missions = await ensureTodaysMissions(user.id);
  const now = new Date();
  const msUntilReset =
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0,
    ) - now.getTime();
  const resetInHours = Math.max(1, Math.ceil(msUntilReset / 3600000));

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

      {(upgradableCount > 0 || fusableCount > 0) && (
        <Link
          href="/forge"
          className="block p-4 rounded-xl border-2 border-rarity-super/60 bg-gradient-to-r from-rarity-super/10 to-rose-500/5 hover:from-rarity-super/15 hover:to-rose-500/10 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="display-serif text-rarity-super text-lg">
                ⚒️ 鍛造所有素材待命
              </div>
              <div className="text-xs text-parchment/70 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                {upgradableCount > 0 && (
                  <span>
                    {upgradableCount} 張卡可<span className="text-gold">升星</span>
                  </span>
                )}
                {fusableCount > 0 && (
                  <span>
                    {fusableCount} 張卡可<span className="text-rose-300">融合升階</span>
                  </span>
                )}
              </div>
            </div>
            <span className="text-parchment/60 text-lg shrink-0">→</span>
          </div>
        </Link>
      )}

      <DailyMissionsPanel
        initialSlots={missions.slots}
        resetInHours={resetInHours}
      />

      <MilestonePanel milestones={milestones} />

      <section>
        <h3 className="display-serif text-xl text-sacred mb-3">今日行動</h3>
        <OrnamentDivider className="mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="relative p-5 rounded-xl border border-parchment/10 bg-veil/40 hover:bg-veil/60 transition-all group overflow-hidden"
              style={{
                boxShadow: `inset 0 1px 0 ${a.tone}22`,
              }}
            >
              {/* top accent bar */}
              <span
                aria-hidden
                className="absolute top-0 left-0 right-0 h-0.5 opacity-60 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `linear-gradient(90deg, transparent, ${a.tone}, transparent)`,
                }}
              />
              {/* bg emoji watermark */}
              <span
                aria-hidden
                className="absolute -right-3 -bottom-4 opacity-[0.08] text-[5rem] group-hover:opacity-20 transition-opacity select-none pointer-events-none"
              >
                {a.emoji}
              </span>
              <div className="relative text-3xl mb-2">{a.emoji}</div>
              <div
                className="relative display-serif text-base text-parchment transition-colors"
                style={{ color: undefined }}
              >
                {a.label}
              </div>
              <div className="relative text-xs text-parchment/50 mt-0.5">
                {a.desc}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h3 className="display-serif text-xl text-sacred mb-3">戰績</h3>
        <OrnamentDivider className="mb-4" glyph="✦" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="戰鬥勝利" value={user.battlesWon} tone="#22C55E" />
          <Stat label="戰鬥失敗" value={user.battlesLost} tone="#EF4444" />
          <Stat label="總信徒" value={user.totalBelievers} tone="#D4A84B" />
          <Stat label="擁有卡牌" value={user.cardsCollected} tone="#6B2E8A" />
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "#D4A84B",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div
      className="relative p-4 rounded-lg border border-parchment/10 bg-veil/30 overflow-hidden"
      style={{ boxShadow: `inset 0 0 20px ${tone}0d` }}
    >
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
        }}
      />
      <div className="relative text-xs text-parchment/50 tracking-wider">
        {label}
      </div>
      <div
        className="relative font-[family-name:var(--font-mono)] text-2xl tabular-nums mt-1"
        style={{ color: tone }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
