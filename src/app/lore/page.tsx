import { VeilBackdrop } from "@/components/fx/VeilBackdrop";
import { Button } from "@/components/ui/Button";
import { ERAS } from "@/lib/constants/eras";
import { CHAPTERS } from "@/lib/story";
import Link from "next/link";

export const metadata = {
  title: "世界觀 · 謊言編年者",
  description: "帷幕理論、三方陣營、十個時代——在踏入戰場前,先讀懂這個世界。",
};

const factions = [
  {
    key: "weavers",
    name: "編織者議會",
    en: "The Weavers Council",
    tint: "text-weavers",
    border: "border-weavers/50",
    creed: "謊言是文明的齒輪,是未來的預演。",
    role: "玩家所屬陣營",
    detail:
      "由史上最會編織謊言的人所組成的秘密議會。他們相信每一個被足夠多人相信的虛構,終將穿透帷幕成為現實——而文明的進步,全賴這些「有用的謊言」。",
  },
  {
    key: "veritas",
    name: "守真者教團",
    en: "Veritas Ordo",
    tint: "text-veritas",
    border: "border-veritas/40",
    creed: "唯有真實是神聖的。一切虛構皆為褻瀆。",
    role: "主要敵對陣營",
    detail:
      "相信世界正被謊言腐蝕,獻身於將每一絲虛構從現實中焚盡。中世紀的獵巫、煉金術士的審判,很多其實是他們動的手。教團至今仍在運作。",
  },
  {
    key: "faceless",
    name: "無相面者",
    en: "The Faceless",
    tint: "text-faceless",
    border: "border-faceless/50",
    creed: "一切皆謊言,包括『真實』。包括這句話。",
    role: "後期可解鎖陣營",
    detail:
      "沒人知道他們何時存在、存在多少人。他們認為真與假都是人類的妄念——真正重要的,是穿過兩者之後剩下的「無」。加入他們的代價,是忘記自己的臉。",
  },
] as const;

const pillars = [
  {
    title: "帷幕 (The Veil)",
    body: "介於「人所想像」與「人所經歷」之間的那層薄膜。帷幕並非完全不可穿透——當一個念頭被夠多人同時相信,它會從帷幕的另一端滲進現實。神話、傳說、都市傳說,都是過去三千年裡穿透帷幕的集體想像。",
  },
  {
    title: "編織 (Weaving)",
    body: "主動推動念頭穿過帷幕的行為。古代的壁畫、楔形文字、金字塔都是帷幕放大器。現代則是:一則病毒 meme、一部深偽影片、一場千萬人觀看的直播。你並不需要是祭司——每一次轉發,都在編織。",
  },
  {
    title: "共鳴 (Resonance)",
    body: "同一個時代的傳說彼此加強。當你持有大量屬於同一時代的傳說卡,它們會在戰場上互相加成——因為在帷幕的另一側,這些故事本來就源自同一片記憶。",
  },
  {
    title: "反噬 (Backlash)",
    body: "編織從不免費。每一個穿透帷幕的謊言,都會吸走編織者的某部分——記憶、情感、健康,甚至一眼換來智慧。最深的秘密是:沒有人知道最後會被收走的是什麼。",
  },
];

export default function LorePage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <VeilBackdrop intensity="high" />

        <p className="relative font-[family-name:var(--font-cinzel)] text-gold/70 tracking-[0.35em] text-xs sm:text-sm uppercase mb-6">
          The Veil · Lore Compendium
        </p>

        <h1 className="relative display-serif text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
          <span className="title-sheen">世界觀</span>
        </h1>

        <p className="relative max-w-2xl text-parchment/80 text-base sm:text-lg leading-relaxed mb-4 font-[family-name:var(--font-noto-serif)]">
          在神話出現之前,先有相信神話的人。
          <br />
          在歷史出現之前,先有編寫歷史的手。
        </p>

        <p className="relative max-w-xl text-parchment/50 text-sm sm:text-base leading-relaxed mb-10 font-[family-name:var(--font-noto-serif)]">
          這是一個所有傳說都曾真實、所有真實也曾是傳說的宇宙。
        </p>

        <div className="relative flex flex-col sm:flex-row gap-4">
          <Link href="/">
            <Button variant="ghost" size="md">
              ← 回首頁
            </Button>
          </Link>
          <Link href="/home">
            <Button variant="primary" size="md">
              進入帷幕 →
            </Button>
          </Link>
        </div>
      </section>

      {/* Veil Theory */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="display-serif text-3xl sm:text-4xl text-sacred text-center mb-3">
          帷幕理論 · The Veil Theory
        </h2>
        <p className="text-parchment/60 text-center mb-12 max-w-2xl mx-auto text-sm sm:text-base">
          在這個世界裡,「真」與「假」不是對立,是一道光譜。而光譜上最有力的那一端,屬於被足夠多人相信的故事。
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-2xl border border-parchment/10 bg-veil/40 backdrop-blur hover:border-gold/40 transition-colors"
            >
              <div className="display-serif text-xl text-parchment mb-3">
                {p.title}
              </div>
              <p className="text-sm text-parchment/75 leading-relaxed font-[family-name:var(--font-noto-serif)]">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Three factions */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="display-serif text-3xl sm:text-4xl text-sacred text-center mb-3">
          三方勢力之爭
        </h2>
        <p className="text-parchment/60 text-center mb-12 max-w-xl mx-auto text-sm sm:text-base">
          帷幕戰爭持續百年。知曉此事的人類分裂成三個立場,對峙至今。
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {factions.map((f) => (
            <div
              key={f.key}
              className={`p-7 rounded-2xl border-2 bg-veil/60 backdrop-blur ${f.border} transition-all`}
            >
              <div className={`display-serif text-2xl mb-1 ${f.tint}`}>
                {f.name}
              </div>
              <div className="text-xs text-parchment/40 tracking-widest mb-5 font-[family-name:var(--font-cinzel)] uppercase">
                {f.en}
              </div>
              <blockquote className="text-parchment/85 italic font-[family-name:var(--font-noto-serif)] mb-4 border-l-2 pl-4 border-parchment/20">
                &ldquo;{f.creed}&rdquo;
              </blockquote>
              <div className="text-xs text-gold/70 tracking-widest mb-3">
                {f.role}
              </div>
              <p className="text-sm text-parchment/70 leading-relaxed font-[family-name:var(--font-noto-serif)]">
                {f.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Ten eras */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="display-serif text-3xl sm:text-4xl text-sacred text-center mb-3">
          十個時代 · Ten Eras of the Veil
        </h2>
        <p className="text-parchment/60 text-center mb-12 max-w-2xl mx-auto text-sm sm:text-base">
          帷幕之下,每個時代都有屬於自己的真相與謊言。點進時代卡看序章——後續章節需要親自通關才能看見。
        </p>
        <div className="grid md:grid-cols-2 gap-5">
          {ERAS.map((era) => {
            const intro = CHAPTERS[era.id]?.[0];
            return (
              <article
                key={era.id}
                className="p-6 rounded-2xl border bg-veil/50 backdrop-blur transition-colors"
                style={{
                  borderColor: `${era.palette.main}55`,
                  background: `linear-gradient(135deg, ${era.palette.dark}cc, ${era.palette.main}11)`,
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl shrink-0">{era.emoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[10px] tracking-[0.25em] font-[family-name:var(--font-cinzel)] uppercase"
                        style={{ color: era.palette.accent }}
                      >
                        {era.code}
                      </span>
                      <span className="text-xs text-parchment/40 tracking-widest font-[family-name:var(--font-cinzel)] uppercase">
                        {era.en}
                      </span>
                    </div>
                    <h3
                      className="display-serif text-xl"
                      style={{ color: era.palette.accent }}
                    >
                      {era.name}
                    </h3>
                    <div className="text-xs text-parchment/50 mt-0.5">
                      {era.theme}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-parchment/80 italic font-[family-name:var(--font-noto-serif)] leading-relaxed mb-4 border-l-2 pl-3 border-parchment/20">
                  {era.hero}
                </p>

                {intro && (
                  <div className="mt-3 pt-3 border-t border-parchment/10">
                    <div className="text-[11px] tracking-widest text-gold/60 mb-1">
                      序章 · {intro.title.replace(/^序章 · /, "")}
                    </div>
                    <p className="text-xs text-parchment/65 leading-relaxed font-[family-name:var(--font-noto-serif)]">
                      {intro.body}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {era.heroes.slice(0, 4).map((h) => (
                    <span
                      key={h}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-parchment/15 text-parchment/55"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 max-w-3xl mx-auto text-center">
        <h2 className="display-serif text-2xl sm:text-3xl text-parchment mb-4">
          讀完了神話,該輪到你寫神話了
        </h2>
        <p className="text-parchment/60 mb-8 text-sm sm:text-base font-[family-name:var(--font-noto-serif)]">
          你將在十個時代之間穿梭,用一張張傳說卡牌擊敗守真者,讓那些被遺忘的故事重新成真。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/home">
            <Button variant="primary" size="lg">
              進入帷幕
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="lg">
              返回首頁
            </Button>
          </Link>
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-parchment/10 text-center text-parchment/30 text-xs tracking-widest">
        © {new Date().getFullYear()} Chronicles of Lies · 謊言編年者
      </footer>
    </main>
  );
}
