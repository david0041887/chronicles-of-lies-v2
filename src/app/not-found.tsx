import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const metadata = {
  title: "頁面不存在 · 謊言編年者",
};

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-4" aria-hidden>🌀</div>
      <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-2">
        404 · Lost in the Veil
      </p>
      <h1 className="display-serif text-4xl text-sacred mb-3">這頁尚未被編織</h1>
      <p className="text-parchment/60 max-w-md mx-auto mb-8 text-sm font-[family-name:var(--font-noto-serif)]">
        你來到了帷幕未延伸到的空白。也許是鏈接失效,也許是這個故事還沒寫。
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link href="/">
          <Button variant="primary" size="md">
            回到首頁
          </Button>
        </Link>
        <Link href="/home">
          <Button variant="ghost" size="md">
            進入帷幕
          </Button>
        </Link>
      </div>
    </main>
  );
}
