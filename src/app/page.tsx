import { auth } from "@/auth";
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
    note: "劇情主視角陣營",
  },
  {
    key: "veritas",
    name: "守真者教團",
    en: "Veritas Ordo",
    tint: "text-veritas",
    border: "border-veritas/40",
    creed: "唯有真實是神聖的。一切虛構皆為褻瀆。",
    note: "主線主要對手",
  },
  {
    key: "faceless",
    name: "無相面者",
    en: "The Faceless",
    tint: "text-faceless",
    border: "border-faceless/50",
    creed: "一切皆謊言,包括『真實』。包括這句話。",
    note: "陰影中的第三方",
  },
] as const;

const pillars = [
  { emoji: "🎴", title: "180 張傳奇卡牌", text: "橫跨 10 個歷史時代與神話" },
  { emoji: "⚔️", title: "策略深度戰鬥", text: "10 種關鍵字 × 7 種狀態疊加" },
  { emoji: "🌍", title: "原創「帷幕理論」", text: "每個時代都是一段被重寫的歷史" },
  { emoji: "✨", title: "免費即可推進", text: "不強迫付費 — 日常任務累積資源" },
];

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative min-h-[80vh] sm:min-h-[88vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <VeilBackdrop intensity="high" />

        <p className="relative font-[family-name:var(--font-cinzel)] text-gold/70 tracking-[0.35em] text-[10px] sm:text-xs uppercase mb-8 animate-hero animate-hero-delay-1">
          Chronicles of Lies · The Veil War
        </p>

        <h1 className="relative display-serif text-5xl sm:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6 animate-hero animate-hero-delay-2">
          <span className="title-sheen">謊言編年者</span>
        </h1>

        <p className="relative max-w-2xl text-parchment/80 text-lg sm:text-xl leading-relaxed mb-4 animate-hero animate-hero-delay-3">
          你相信的一切,可能都是你自己造成的。
        </p>

        <p className="relative max-w-2xl text-parchment/50 text-sm sm:text-base leading-relaxed mb-10 font-[family-name:var(--font-noto-serif)] animate-hero animate-hero-delay-3">
          在帷幕撕裂之前,決定誰是神。
        </p>

        {/* Session-aware CTAs */}
        {isLoggedIn ? (
          <div className="relative flex flex-col sm:flex-row gap-3 animate-hero animate-hero-delay-4 w-full max-w-md sm:w-auto">
            <Link href="/home" className="w-full sm:w-auto">
              <Button size="lg" variant="primary" className="w-full sm:w-auto">
                🌀 回到帷幕
              </Button>
            </Link>
            <Link href="/lore" className="w-full sm:w-auto">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto">
                📖 世界觀
              </Button>
            </Link>
          </div>
        ) : (
          <div className="relative flex flex-col gap-3 animate-hero animate-hero-delay-4 w-full max-w-sm">
            <Link href="/register">
              <Button size="lg" variant="primary" className="w-full">
                🌀 立即開始(註冊)
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href="/login" className="flex-1">
                <Button size="md" variant="ghost" className="w-full">
                  已有帳號 · 登入
                </Button>
              </Link>
              <Link href="/lore" className="flex-1">
                <Button size="md" variant="ghost" className="w-full">
                  📖 世界觀
                </Button>
              </Link>
            </div>
            <p className="text-[11px] text-parchment/40 tracking-wider">
              亦可從登入頁選擇 <span className="text-gold/70">訪客進入</span> — 免註冊,進度綁定此裝置
            </p>
          </div>
        )}
      </section>

      {/* Key selling points */}
      <section className="px-6 py-20 sm:py-24 max-w-6xl mx-auto">
        <h2 className="display-serif text-3xl sm:text-4xl text-sacred text-center mb-14 sm:mb-16">
          這是什麼樣的遊戲
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="p-5 sm:p-6 rounded-xl border border-parchment/10 bg-veil/40 backdrop-blur hover:border-gold/40 transition-colors"
            >
              <div className="text-3xl sm:text-4xl mb-3">{p.emoji}</div>
              <div className="display-serif text-base sm:text-lg text-parchment mb-1">
                {p.title}
              </div>
              <div className="text-xs sm:text-sm text-parchment/60">{p.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Three factions */}
      <section className="px-6 py-20 sm:py-24 max-w-6xl mx-auto">
        <h2 className="display-serif text-3xl sm:text-4xl text-sacred text-center mb-4">
          三方勢力之爭
        </h2>
        <p className="text-parchment/60 text-center mb-12 sm:mb-16 max-w-xl mx-auto text-sm sm:text-base">
          帷幕戰爭持續百年。知曉此事的人類分裂成三個立場,對峙至今。
        </p>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {factions.map((f) => (
            <div
              key={f.key}
              className={`p-6 sm:p-8 rounded-2xl border-2 bg-veil/60 backdrop-blur ${f.border} transition-all`}
            >
              <div className={`display-serif text-xl sm:text-2xl mb-1 ${f.tint}`}>
                {f.name}
              </div>
              <div className="text-[10px] sm:text-xs text-parchment/40 tracking-widest mb-5 sm:mb-6 font-[family-name:var(--font-cinzel)] uppercase">
                {f.en}
              </div>
              <blockquote className="text-parchment/80 italic font-[family-name:var(--font-noto-serif)] mb-4 border-l-2 pl-4 border-parchment/20 text-sm sm:text-base">
                &ldquo;{f.creed}&rdquo;
              </blockquote>
              <div className="text-[11px] text-parchment/40">{f.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Secondary CTA for non-logged-in visitors at the end of the scroll */}
      {!isLoggedIn && (
        <section className="px-6 py-16 max-w-xl mx-auto text-center">
          <h3 className="display-serif text-2xl sm:text-3xl text-parchment mb-3">
            帷幕已薄,等你編織
          </h3>
          <p className="text-parchment/60 text-sm mb-6 font-[family-name:var(--font-noto-serif)]">
            30 秒註冊 → 送 300 水晶 + 30 張起始牌組 + 10 連免費召喚
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" variant="primary">
                🌀 立即開始
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost">
                登入已有帳號
              </Button>
            </Link>
          </div>
        </section>
      )}

      <footer className="px-6 py-8 border-t border-parchment/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-parchment/40 tracking-widest">
          <div>
            © {new Date().getFullYear()} Chronicles of Lies · 謊言編年者
          </div>
          <div className="flex items-center gap-4">
            <Link href="/lore" className="hover:text-parchment">世界觀</Link>
            <Link href="/terms" className="hover:text-parchment">服務條款</Link>
            <Link href="/privacy" className="hover:text-parchment">隱私政策</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
