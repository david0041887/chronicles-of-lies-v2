import { CornerFlourish, OrnamentDivider } from "@/components/fx/OrnamentDivider";
import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { requireOnboarded } from "@/lib/auth-helpers";
import { getEra, type EraId } from "@/lib/constants/eras";
import { dailyLegendIndex, msUntilNextRotation } from "@/lib/daily-legend";
import { cardsForLegend } from "@/lib/legend-cards";
import { prisma } from "@/lib/prisma";
import { ensureLegendCounts } from "@/lib/spread";
import { chapterStatus, getChapters } from "@/lib/story";
import { perksForLevel, weaverLevel } from "@/lib/weaver";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegendsPanel } from "./LegendsPanel";
import { StoryStageTimeline } from "./StoryStageTimeline";

interface Props {
  params: Promise<{ eraId: string }>;
}

export const dynamic = "force-dynamic";

export default async function EraPage({ params }: Props) {
  const { eraId } = await params;
  const era = getEra(eraId);
  if (!era) notFound();

  const user = await requireOnboarded();
  const progress = user.eraProgress.find((p) => p.eraId === era.id);
  const believers = progress?.believers ?? 0;
  const highestStage = progress?.highestStage ?? 0;
  const bossCleared = progress?.bossCleared ?? false;
  const legendCounts = ensureLegendCounts(progress?.legendCounts ?? []);
  const spreadsTotal = progress?.spreadsTotal ?? 0;
  const dominantLegend = progress?.dominantLegend ?? null;

  const level = weaverLevel(user.totalBelievers);
  const perks = perksForLevel(level);
  const dailyIdx = perks.dailyLegendActive
    ? dailyLegendIndex(era.id)
    : -1;
  const boundCardIds =
    dailyIdx >= 0 ? cardsForLegend(era.id, dailyIdx) : [];
  // Look up bound cards with rarity and image for preview
  const boundCards =
    boundCardIds.length > 0
      ? await prisma.card.findMany({
          where: { id: { in: boundCardIds } },
          include: { image: { select: { cardId: true } } },
          orderBy: [{ rarity: "desc" }, { cost: "desc" }],
        })
      : [];

  const stages = await prisma.stage.findMany({
    where: { eraId: era.id },
    orderBy: { orderNum: "asc" },
    select: {
      id: true,
      name: true,
      subtitle: true,
      orderNum: true,
      difficulty: true,
      enemyName: true,
      enemyHp: true,
      isBoss: true,
      rewardCrystals: true,
      rewardBelievers: true,
    },
  });

  const chapters = getChapters(era.id as EraId);
  const rotationMs = msUntilNextRotation();

  return (
    <div className="relative">
      <VeilBackdrop
        main={era.palette.main}
        accent={era.palette.accent}
        dark={era.palette.dark}
        intensity="medium"
      />
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div
          className="relative rounded-3xl border border-parchment/10 p-8 sm:p-12 mb-8 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${era.palette.dark} 0%, ${era.palette.main}40 100%)`,
          }}
        >
          <CornerFlourish color={`${era.palette.accent}88`} size={28} />
          {/* faint era emoji watermark */}
          <span
            aria-hidden
            className="absolute -right-6 -bottom-10 select-none pointer-events-none opacity-[0.07]"
            style={{ fontSize: "18rem", lineHeight: 1 }}
          >
            {era.emoji}
          </span>
          <Link
            href="/world"
            className="relative inline-block text-parchment/50 hover:text-parchment text-sm mb-6"
          >
            ← 返回世界
          </Link>
          <div className="relative flex items-center gap-4 mb-4">
            <span className="text-6xl drop-shadow-[0_0_18px_rgba(0,0,0,0.5)]">
              {era.emoji}
            </span>
            <div>
              <span
                className="font-[family-name:var(--font-cinzel)] text-xs tracking-[0.3em]"
                style={{ color: era.palette.main }}
              >
                {era.code}
              </span>
              <h1 className="display-serif text-4xl sm:text-5xl text-parchment">
                {era.name}
              </h1>
            </div>
          </div>
          <p className="relative text-parchment/80 font-[family-name:var(--font-noto-serif)] italic max-w-xl mb-6">
            「{era.hero}」
          </p>
          <OrnamentDivider
            color={`${era.palette.accent}88`}
            glyph={era.emoji}
            className="relative mb-6 max-w-md"
          />
          <div className="relative flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-parchment/50 tracking-wider">已累積信徒</div>
              <div className="font-[family-name:var(--font-mono)] text-3xl text-parchment tabular-nums">
                {believers.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-parchment/50 tracking-wider">關卡進度</div>
              <div className="font-[family-name:var(--font-mono)] text-3xl text-parchment tabular-nums">
                {highestStage} / {stages.length || 3}
              </div>
            </div>
            <div>
              <div className="text-xs text-parchment/50 tracking-wider">傳播累積</div>
              <div className="font-[family-name:var(--font-mono)] text-3xl text-parchment tabular-nums">
                {spreadsTotal}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Legend Banner (if active) */}
        {dailyIdx >= 0 && (
          <section className="mb-8">
            <div
              className="p-5 rounded-2xl border-2 border-gold/60 bg-gradient-to-br from-gold/10 via-veil/40 to-veil/20"
              style={{ backgroundColor: `${era.palette.main}0a` }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-gold tracking-[0.3em] uppercase">
                  ✨ Today&apos;s Legend
                </p>
                <p className="text-[10px] text-parchment/40 tabular-nums">
                  {Math.floor(rotationMs / 3600000)}h {Math.floor((rotationMs % 3600000) / 60000)}m 後輪替
                </p>
              </div>
              <h3 className="display-serif text-2xl text-sacred mb-1">
                {era.legends[dailyIdx].name}
              </h3>
              <p className="text-sm text-parchment/60 italic font-[family-name:var(--font-noto-serif)] mb-3">
                {era.legends[dailyIdx].desc}
              </p>
              <div className="text-xs text-parchment/70 mb-2">
                <span className="text-gold">+2 Power</span> to these cards today
                (SSR+ also gets <span className="text-gold">haste</span>):
              </div>
              <div className="flex flex-wrap gap-2">
                {boundCards.map((c) => (
                  <span
                    key={c.id}
                    className={`text-xs px-2 py-1 rounded border ${
                      c.rarity === "UR" || c.rarity === "SSR"
                        ? "border-gold/60 text-gold bg-gold/5"
                        : "border-parchment/20 text-parchment/70"
                    }`}
                  >
                    {c.name}
                    <span className="ml-1 text-[9px] opacity-70">{c.rarity}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Legends (compact passive display) */}
        <section className="mb-8">
          <h2 className="display-serif text-2xl text-sacred mb-1">📢 四大傳說</h2>
          <p className="text-xs text-parchment/50 tracking-wider mb-4">
            在戰鬥中打出綁定卡 → 該傳說進度自動 +1。被傳最多的會成為該時代主導。
          </p>
          <LegendsPanel
            legends={era.legends}
            eraId={era.id}
            paletteMain={era.palette.main}
            counts={legendCounts}
            dominantIdx={dominantLegend}
            dailyIdx={dailyIdx}
          />
        </section>

        {/* Story-Stage Timeline — chapters and battles interleaved */}
        <section>
          <h2 className="display-serif text-2xl text-sacred mb-1">📖 主線 · 帷幕對決</h2>
          <p className="text-xs text-parchment/50 tracking-wider mb-4">
            每通關一關,下一章劇情解鎖 → 打完 BOSS 完成該時代終章。
          </p>
          <StoryStageTimeline
            chapters={chapters.map((ch) => ({
              ...ch,
              status: chapterStatus(ch.unlockAt, highestStage, bossCleared),
            }))}
            stages={stages}
            highestStage={highestStage}
            palette={era.palette}
          />
        </section>
      </main>
    </div>
  );
}
