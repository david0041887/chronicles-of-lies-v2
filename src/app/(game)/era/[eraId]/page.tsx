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

  const allStages = await prisma.stage.findMany({
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
      mode: true,
    },
  });
  const stages = allStages.filter((s) => s.mode === "normal");
  const primeStages = allStages.filter((s) => s.mode === "prime");

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

        {/* Prime Mode — unlocked after BOSS cleared */}
        {primeStages.length > 0 && (
          <section className="mt-10">
            <h2 className="display-serif text-2xl mb-1 flex items-center gap-2">
              <span style={{ color: era.palette.accent }}>🌀 Prime Mode · 深淵</span>
              {!bossCleared && (
                <span className="text-[10px] tracking-widest px-2 py-0.5 rounded border border-parchment/20 text-parchment/40">
                  BOSS 後解鎖
                </span>
              )}
            </h2>
            <p className="text-xs text-parchment/50 tracking-wider mb-4">
              二週目 · 帷幕翻轉後的黑化版本。難度 +3,敵人牌組高濃度 SSR/UR,獎勵 1.5-3×。
            </p>
            <div className="space-y-3">
              {primeStages.map((stage, idx) => {
                // First Prime stage is always open once BOSS is down;
                // subsequent ones need the previous Prime cleared.
                const unlocked =
                  bossCleared &&
                  (idx === 0 || highestStage >= stage.orderNum - 1);
                return (
                  <PrimeStageRow
                    key={stage.id}
                    stage={stage}
                    unlocked={unlocked}
                    cleared={highestStage >= stage.orderNum}
                    palette={era.palette}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PrimeStageRow({
  stage,
  unlocked,
  cleared,
  palette,
}: {
  stage: {
    id: string;
    name: string;
    subtitle: string | null;
    orderNum: number;
    difficulty: number;
    enemyName: string;
    enemyHp: number;
    isBoss: boolean;
    rewardCrystals: number;
    rewardBelievers: number;
  };
  unlocked: boolean;
  cleared: boolean;
  palette: { main: string; accent: string; dark: string };
}) {
  return (
    <div
      className="relative pl-14 rounded-xl border transition-colors overflow-hidden"
      style={{
        borderColor: unlocked ? `${palette.main}aa` : "rgba(244,230,193,0.15)",
        background: unlocked
          ? `linear-gradient(135deg, ${palette.dark} 0%, ${palette.main}22 100%)`
          : "rgba(18,8,32,0.4)",
        opacity: unlocked ? 1 : 0.55,
      }}
    >
      <div
        className="absolute left-2 top-4 w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm"
        style={{
          borderColor: stage.isBoss ? "#FFD700" : palette.accent,
          background: stage.isBoss
            ? `${palette.main}44`
            : `${palette.dark}`,
        }}
      >
        {unlocked ? (stage.isBoss ? "👑" : "🌀") : "🔒"}
      </div>
      <div className="flex items-center gap-3 pr-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="display-serif text-base text-parchment truncate">
              {stage.name}
            </span>
            {cleared && (
              <span className="text-[9px] text-success tracking-wider">✓ 征服</span>
            )}
            {stage.isBoss && (
              <span
                className="text-[9px] tracking-widest border px-1.5 py-0.5 rounded"
                style={{
                  color: palette.accent,
                  borderColor: `${palette.accent}80`,
                }}
              >
                PRIME BOSS
              </span>
            )}
          </div>
          {stage.subtitle && (
            <div className="text-[11px] text-parchment/50">{stage.subtitle}</div>
          )}
          <div className="flex items-center gap-3 text-[11px] text-parchment/60 mt-1 flex-wrap">
            <span>難度 ×{stage.difficulty}</span>
            <span>敵 HP {stage.enemyHp}</span>
            <span className="text-rarity-super">💎 +{stage.rewardCrystals}</span>
            <span className="text-gold">🪙 +{stage.rewardBelievers}</span>
          </div>
        </div>
        {unlocked ? (
          <Link
            href={`/battle/${stage.id}`}
            className="px-4 py-2 rounded-lg text-sm font-semibold shrink-0 transition-all"
            style={{
              background: palette.accent,
              color: palette.dark,
            }}
          >
            {cleared ? "再戰" : "進入深淵"}
          </Link>
        ) : (
          <span className="text-xs text-parchment/30 tracking-widest shrink-0">
            🔒
          </span>
        )}
      </div>
    </div>
  );
}
