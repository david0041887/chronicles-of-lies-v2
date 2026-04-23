import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const factions = [
  {
    key: "weavers",
    name: "編織者議會",
    en: "The Weavers Council",
    tint: "text-weavers",
    border: "border-weavers/50",
    creed: "謊言是文明的齒輪,是未來的預演。",
    note: "玩家所屬陣營",
  },
  {
    key: "veritas",
    name: "守真者教團",
    en: "Veritas Ordo",
    tint: "text-veritas",
    border: "border-veritas/40",
    creed: "唯有真實是神聖的。一切虛構皆為褻瀆。",
    note: "主要敵人陣營",
  },
  {
    key: "faceless",
    name: "無相面者",
    en: "The Faceless",
    tint: "text-faceless",
    border: "border-faceless/50",
    creed: "一切皆謊言,包括『真實』。包括這句話。",
    note: "後期可解鎖陣營",
  },
] as const;

const pillars = [
  { emoji: "🎴", title: "200+ 傳奇卡牌", text: "橫跨 15 個歷史時代" },
  { emoji: "⚔️", title: "策略深度戰鬥", text: "10 種關鍵字 × 時代共鳴" },
  { emoji: "🌍", title: "宏大世界觀", text: "原創「帷幕理論」神話體系" },
  { emoji: "💎", title: "公平付費", text: "不賣戰力,只賣便利與外觀" },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <VeilBackdrop intensity="high" />

        <p className="relative font-[family-name:var(--font-cinzel)] text-gold/70 tracking-[0.35em] text-xs sm:text-sm uppercase mb-8 animate-hero animate-hero-delay-1">
          Chronicles of Lies · The Veil War
        </p>

        <h1 className="relative display-serif text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6 animate-hero animate-hero-delay-2">
          <span className="title-sheen">謊言編年者</span>
        </h1>

        <p className="relative max-w-2xl text-parchment/80 text-lg sm:text-xl leading-relaxed mb-4 animate-hero animate-hero-delay-3">
          你相信的一切,可能都是你自己造成的。
        </p>

        <p className="relative max-w-2xl text-parchment/50 text-sm sm:text-base leading-relaxed mb-12 font-[family-name:var(--font-noto-serif)] animate-hero animate-hero-delay-3">
          在帷幕撕裂之前,決定誰是神。
        </p>

        <div className="relative flex flex-col sm:flex-row gap-4 animate-hero animate-hero-delay-4">
          <Link href="/home">
            <Button size="lg" variant="primary">
              進入帷幕
            </Button>
          </Link>
          <Link href="/lore">
            <Button size="lg" variant="ghost">
              📖 世界觀
            </Button>
          </Link>
        </div>

        <p className="relative mt-16 text-parchment/30 text-xs tracking-widest animate-hero animate-hero-delay-4">
          Phase 1.3 — 召喚系統已上線
        </p>
      </section>

      {/* Key selling points */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="display-serif text-3xl sm:text-4xl text-sacred text-center mb-16">
          這是什麼樣的遊戲
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-xl border border-parchment/10 bg-veil/40 backdrop-blur hover:border-gold/40 transition-colors"
            >
              <div className="text-4xl mb-3">{p.emoji}</div>
              <div className="display-serif text-lg text-parchment mb-1">
                {p.title}
              </div>
              <div className="text-sm text-parchment/60">{p.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Three factions */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="display-serif text-3xl sm:text-4xl text-sacred text-center mb-4">
          三方勢力之爭
        </h2>
        <p className="text-parchment/60 text-center mb-16 max-w-xl mx-auto">
          帷幕戰爭持續百年。知曉此事的人類分裂成三個立場,對峙至今。
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {factions.map((f) => (
            <div
              key={f.key}
              className={`p-8 rounded-2xl border-2 bg-veil/60 backdrop-blur ${f.border} transition-all`}
            >
              <div className={`display-serif text-2xl mb-1 ${f.tint}`}>
                {f.name}
              </div>
              <div className="text-xs text-parchment/40 tracking-widest mb-6 font-[family-name:var(--font-cinzel)] uppercase">
                {f.en}
              </div>
              <blockquote className="text-parchment/80 italic font-[family-name:var(--font-noto-serif)] mb-4 border-l-2 pl-4 border-parchment/20">
                &ldquo;{f.creed}&rdquo;
              </blockquote>
              <div className="text-xs text-parchment/40">{f.note}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-12 border-t border-parchment/10 text-center text-parchment/30 text-xs tracking-widest">
        © {new Date().getFullYear()} Chronicles of Lies · 謊言編年者 v0.1.0
      </footer>
    </main>
  );
}
