import { OrnamentDivider } from "@/components/fx/OrnamentDivider";
import { PageHeader } from "@/components/ui/PageHeader";
import { ERAS } from "@/lib/constants/eras";
import { requireOnboarded } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { levelProgress, MILESTONES } from "@/lib/weaver";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FACTION_LABEL: Record<string, { label: string; tint: string }> = {
  weavers: { label: "編織者議會", tint: "#D4A84B" },
  veritas: { label: "守真者教團", tint: "#4A90E2" },
  faceless: { label: "無相面者", tint: "#9B5DE5" },
};

export default async function ProfilePage() {
  const user = await requireOnboarded();

  // One round-trip for everything we need to display. Counts use
  // `.count()` so we never load the heavy rows themselves.
  const [
    uniqueOwnedCards,
    totalOwnedCards,
    totalCardCount,
    bossesCleared,
    totalStageClears,
    eraProgress,
  ] = await Promise.all([
    prisma.ownedCard
      .groupBy({ by: ["cardId"], where: { userId: user.id } })
      .then((g) => g.length),
    prisma.ownedCard.count({ where: { userId: user.id } }),
    prisma.card.count(),
    prisma.eraProgress.count({
      where: { userId: user.id, bossCleared: true },
    }),
    prisma.stageClear
      .aggregate({
        where: { userId: user.id },
        _sum: { clearCount: true },
      })
      .then((a) => a._sum.clearCount ?? 0),
    prisma.eraProgress.findMany({
      where: { userId: user.id },
      select: {
        eraId: true,
        believers: true,
        spreadsTotal: true,
        bossCleared: true,
        highestStage: true,
      },
    }),
  ]);

  const lp = levelProgress(user.totalBelievers);
  const winRate =
    user.battlesWon + user.battlesLost === 0
      ? null
      : Math.round((user.battlesWon / (user.battlesWon + user.battlesLost)) * 100);

  const accountAgeDays = Math.max(
    1,
    Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000),
  );

  const factionMeta = FACTION_LABEL[user.faction] ?? FACTION_LABEL.weavers;

  // Era-keyed progress map for the era-by-era list. Iteration below is
  // driven by the canonical ERAS array, so any eraProgress row with a
  // non-canonical eraId (legacy / pre-whitelist data) is silently
  // ignored — that's intentional. /api/era/spread now whitelists writes
  // so new garbage can't accumulate.
  const eraById = new Map(eraProgress.map((e) => [e.eraId, e]));

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="Weaver Profile"
        title="編織者檔案"
        subtitle="你的旅程紀錄"
        actions={
          <Link
            href="/settings"
            className="text-xs text-parchment/60 hover:text-parchment tracking-widest min-h-[40px] flex items-center px-3 rounded border border-parchment/15"
          >
            ⚙️ 設定
          </Link>
        }
      />

      {/* Identity card */}
      <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-veil/80 to-[#180826]/80 p-6 mb-6 backdrop-blur">
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full border-2 flex items-center justify-center display-serif text-2xl shrink-0"
            style={{
              borderColor: factionMeta.tint,
              background: `${factionMeta.tint}22`,
              color: factionMeta.tint,
            }}
            aria-hidden
          >
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="display-serif text-xl text-sacred truncate">
              {user.username}
            </h2>
            <p className="text-xs text-parchment/60 mt-0.5">
              <span style={{ color: factionMeta.tint }}>● {factionMeta.label}</span>
              <span className="mx-2 text-parchment/30">|</span>
              <span>{user.title}</span>
            </p>
          </div>
        </div>

        {/* Weaver level + progress */}
        <div className="flex items-center justify-between text-xs text-parchment/60 mb-1">
          <span className="font-[family-name:var(--font-cinzel)] tracking-widest">
            Lv.{lp.level}
          </span>
          <span className="font-[family-name:var(--font-mono)] tabular-nums">
            {lp.believers.toLocaleString()} / {lp.maxed ? "∞" : lp.nextThreshold.toLocaleString()} 信徒
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-black/40 overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold/70 to-gold transition-all"
            style={{ width: `${Math.min(100, lp.ratio * 100)}%` }}
          />
        </div>
        {lp.nextBlurb && (
          <p className="text-[11px] text-gold/80 tracking-wide">
            下個里程碑:{lp.nextBlurb}
          </p>
        )}
      </section>

      {/* Battle stats grid */}
      <SectionTitle>戰鬥紀錄</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="勝場" value={user.battlesWon} tone="success" />
        <Stat label="敗場" value={user.battlesLost} tone="danger" />
        <Stat
          label="勝率"
          value={winRate === null ? "—" : `${winRate}%`}
          tone={winRate !== null && winRate >= 70 ? "success" : "neutral"}
        />
        <Stat
          label="總通關"
          value={totalStageClears}
          hint={`${bossesCleared} 個時代 BOSS 已破`}
        />
      </div>

      {/* Collection stats */}
      <SectionTitle>收藏</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat
          label="不同卡牌"
          value={`${uniqueOwnedCards} / ${totalCardCount}`}
          hint={
            totalCardCount > 0
              ? `${Math.round((uniqueOwnedCards / totalCardCount) * 100)}% 完成度`
              : undefined
          }
        />
        <Stat label="持有總張數" value={totalOwnedCards} />
        <Stat label="總抽卡次數" value={user.totalPulls} />
        <Stat
          label="UR 保底"
          value={user.pityUR}
          hint="已連續抽未出 UR"
          tone="legend"
        />
      </div>

      {/* Currency vault */}
      <SectionTitle>資源</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Stat label="💎 水晶" value={user.crystals} tone="info" />
        <Stat label="🕯️ 信念" value={user.faith} tone="legend" />
        <Stat label="🎟️ 免費十連" value={user.freePulls} tone="success" />
        {user.essence > 0 && <Stat label="🌟 精華" value={user.essence} />}
        {user.masks > 0 && <Stat label="🎭 面具" value={user.masks} />}
        {user.scrolls > 0 && <Stat label="📜 卷軸" value={user.scrolls} />}
      </div>

      {/* Era progress */}
      <SectionTitle>時代進度</SectionTitle>
      <div className="rounded-xl border border-parchment/10 bg-veil/40 divide-y divide-parchment/10 mb-6">
        {ERAS.map((era) => {
          const ep = eraById.get(era.id);
          const cleared = ep?.bossCleared ?? false;
          const highest = ep?.highestStage ?? 0;
          const believers = ep?.believers ?? 0;
          return (
            <Link
              key={era.id}
              href={`/era/${era.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-veil/60 transition-colors min-h-[48px]"
            >
              <span
                className="text-xl shrink-0 w-8 text-center"
                style={{ color: era.palette.main }}
              >
                {era.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-parchment truncate">{era.name}</div>
                <div className="text-[11px] text-parchment/50 tabular-nums">
                  進度 {highest} / 9
                  {believers > 0 && ` · 信徒 ${believers.toLocaleString()}`}
                </div>
              </div>
              <span
                className={`text-[10px] tracking-widest font-[family-name:var(--font-cinzel)] shrink-0 px-2 py-1 rounded ${
                  cleared
                    ? "bg-gold/15 text-gold border border-gold/40"
                    : highest > 0
                      ? "text-parchment/60 border border-parchment/20"
                      : "text-parchment/30 border border-parchment/10"
                }`}
              >
                {cleared ? "✓ 通關" : highest > 0 ? "進行中" : "未開啟"}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Milestones progress */}
      <SectionTitle>里程碑</SectionTitle>
      <div className="rounded-xl border border-parchment/10 bg-veil/40 divide-y divide-parchment/10 mb-6">
        {MILESTONES.map((m) => {
          const reached = lp.believers >= m.threshold;
          const isCurrent = lp.level === m.level;
          return (
            <div
              key={m.level}
              className={`flex items-center gap-3 px-4 py-3 ${
                isCurrent ? "bg-gold/5" : ""
              }`}
            >
              <span
                className={`w-8 text-center text-xs font-[family-name:var(--font-cinzel)] tracking-widest shrink-0 ${
                  reached ? "text-gold" : "text-parchment/30"
                }`}
              >
                Lv.{m.level}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm ${
                    reached ? "text-parchment" : "text-parchment/40"
                  }`}
                >
                  {m.title}
                </div>
                <div className="text-[11px] text-parchment/50 tabular-nums">
                  {m.threshold.toLocaleString()} 信徒 · {m.blurb}
                </div>
              </div>
              {reached && (
                <span className="text-gold text-base shrink-0" aria-hidden>
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      <OrnamentDivider />

      {/* Account meta */}
      <section className="text-[11px] text-parchment/40 text-center tracking-widest mt-6 mb-4">
        <div>加入帷幕戰爭已 {accountAgeDays} 天</div>
        <div className="mt-1">建立於 {user.createdAt.toISOString().slice(0, 10)}</div>
      </section>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="display-serif text-xs text-parchment/60 tracking-[0.3em] uppercase mb-3 font-[family-name:var(--font-cinzel)]">
      {children}
    </h3>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "success" | "danger" | "info" | "legend";
}

function Stat({ label, value, hint, tone = "neutral" }: StatProps) {
  const tones: Record<string, string> = {
    neutral: "text-parchment",
    success: "text-success",
    danger: "text-blood",
    info: "text-info",
    legend: "text-rarity-super",
  };
  return (
    <div className="rounded-lg border border-parchment/10 bg-veil/40 px-3 py-3">
      <div className="text-[10px] text-parchment/50 tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`font-[family-name:var(--font-mono)] tabular-nums text-lg ${tones[tone]}`}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {hint && (
        <div className="text-[10px] text-parchment/40 mt-1 leading-tight">
          {hint}
        </div>
      )}
    </div>
  );
}
