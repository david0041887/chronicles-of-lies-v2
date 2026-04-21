import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { requireOnboarded } from "@/lib/auth-helpers";
import { getEra } from "@/lib/constants/eras";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ eraId: string }>;
}

export default async function EraPage({ params }: Props) {
  const { eraId } = await params;
  const era = getEra(eraId);
  if (!era) notFound();

  const user = await requireOnboarded();
  const progress = user.eraProgress.find((p) => p.eraId === era.id);
  const believers = progress?.believers ?? 0;

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
        <Link
          href="/world"
          className="inline-block text-parchment/50 hover:text-parchment text-sm mb-6"
        >
          ← 返回世界
        </Link>
        <div className="flex items-center gap-4 mb-4">
          <span className="text-6xl">{era.emoji}</span>
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
        <p className="text-parchment/80 font-[family-name:var(--font-noto-serif)] italic max-w-xl mb-6">
          「{era.hero}」
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-parchment/50 tracking-wider">
              已累積信徒
            </div>
            <div className="font-[family-name:var(--font-mono)] text-3xl text-parchment tabular-nums">
              {believers.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-parchment/50 tracking-wider">
              關卡進度
            </div>
            <div className="font-[family-name:var(--font-mono)] text-3xl text-parchment tabular-nums">
              {progress?.highestStage ?? 0} / 20
            </div>
          </div>
        </div>
      </div>

      {/* 4 legends (傳播謊言 — Phase 1.3 起可點擊) */}
      <section className="mb-8">
        <h2 className="display-serif text-2xl text-sacred mb-4">本時代四大傳說</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {era.legends.map((lg, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-parchment/10 bg-veil/40"
            >
              <div
                className="text-xs tracking-widest mb-2 font-[family-name:var(--font-cinzel)]"
                style={{ color: era.palette.main }}
              >
                LEGEND {i + 1}
              </div>
              <div className="display-serif text-lg text-parchment mb-1">
                {lg.name}
              </div>
              <p className="text-sm text-parchment/60 italic font-[family-name:var(--font-noto-serif)]">
                {lg.desc}
              </p>
              <button
                disabled
                className="mt-4 text-xs text-parchment/30 tracking-widest cursor-not-allowed"
              >
                📢 傳播謊言(Phase 1.3 解鎖)
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="display-serif text-2xl text-sacred mb-4">帷幕對決</h2>
        <div className="p-8 rounded-xl border border-dashed border-parchment/20 bg-veil/20 text-center">
          <p className="text-parchment/50 mb-2">戰鬥系統規劃中(Phase 1.5)</p>
          <p className="text-xs text-parchment/30 tracking-widest">
            20 主線關卡 + 1 BOSS + 3 隱藏關
          </p>
        </div>
      </section>
      </main>
    </div>
  );
}
