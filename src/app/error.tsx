"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Root-level error boundary. Catches anything the (game) boundary
 * doesn't — i.e. errors in /lore, /privacy, /terms, /admin, the
 * top-level marketing pages, and any unauthenticated routes that
 * don't sit under (game).
 *
 * Uses the same visual language as (game)/error.tsx but doesn't
 * reference the in-game "veil" lore so it makes sense to a player who
 * hasn't even reached the welcome flow yet.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[root error boundary]", error);
    }
  }, [error]);

  return (
    <main className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-4" aria-hidden>
        ⚠
      </div>
      <h1 className="display-serif text-3xl text-blood mb-3">發生問題</h1>
      <p className="text-sm text-parchment/70 mb-2 font-[family-name:var(--font-noto-serif)]">
        這個頁面暫時無法載入。請稍後重試,或返回首頁。
      </p>
      {error.digest && (
        <p className="text-[10px] text-parchment/30 tracking-widest mb-6 tabular-nums">
          trace · {error.digest}
        </p>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <Button variant="primary" size="md" onClick={reset}>
          重新嘗試
        </Button>
        <Link href="/">
          <Button variant="ghost" size="md">
            返回首頁
          </Button>
        </Link>
      </div>
    </main>
  );
}
