"use client";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary for the (game) route group. Next.js renders
 * this when a server or client component inside the group throws.
 *
 * Intentionally minimal: we don't expose stack/digests to the player, only
 * a recoverable state with a retry button + escape hatch to /home.
 */
export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[(game) boundary]", error);
    }
  }, [error]);

  return (
    <main className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="text-5xl mb-4" aria-hidden>💀</div>
      <h1 className="display-serif text-3xl text-blood mb-3">帷幕裂開了</h1>
      <p className="text-sm text-parchment/70 mb-2 font-[family-name:var(--font-noto-serif)]">
        這一頁的敘述無法繼續編織。請稍後重試,或先返回主頁。
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
        <Link href="/home">
          <Button variant="ghost" size="md">
            返回主頁
          </Button>
        </Link>
      </div>
    </main>
  );
}
