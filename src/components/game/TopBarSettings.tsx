"use client";

import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopBarSettings({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
      {isAdmin && (
        <Link
          href="/admin"
          className={cn(
            "hidden sm:inline-block text-[11px] px-2 py-1 rounded border tracking-wider",
            path.startsWith("/admin")
              ? "border-blood text-blood bg-blood/10"
              : "border-blood/50 text-blood/80 hover:bg-blood/10",
          )}
        >
          後台
        </Link>
      )}
      <Link
        href="/settings"
        className={cn(
          "text-xs w-8 h-8 flex items-center justify-center rounded border transition-colors",
          path.startsWith("/settings")
            ? "border-gold text-gold bg-gold/10"
            : "border-parchment/20 text-parchment/60 hover:border-gold/40",
        )}
        aria-label="設定"
      >
        ⚙︎
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="hidden sm:inline-block text-[11px] text-parchment/50 hover:text-parchment tracking-wider px-2"
        aria-label="登出"
      >
        登出
      </button>
    </div>
  );
}
