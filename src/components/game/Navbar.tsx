"use client";

import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "主頁", icon: "🏠" },
  { href: "/world", label: "世界", icon: "🌍" },
  { href: "/collection", label: "圖鑑", icon: "📚" },
  { href: "/deck", label: "牌組", icon: "🃏" },
  { href: "/gacha", label: "召喚", icon: "🎴" },
] as const;

export function Navbar({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();

  return (
    <>
      {/* Top bar: logo + settings + logout */}
      <header className="sticky top-0 z-40 border-b border-parchment/10 bg-veil/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <Link href="/home" className="display-serif text-gold text-base tracking-wider">
            謊言編年者
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "text-xs px-2.5 py-1 rounded border tracking-wider",
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
                "text-xs p-1.5 rounded border transition-colors",
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
              className="text-xs text-parchment/50 hover:text-parchment tracking-wider px-2"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-parchment/15 bg-veil/95 backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-5">
          {TABS.map((tab) => {
            const active =
              path === tab.href ||
              (tab.href !== "/home" && path.startsWith(`${tab.href}/`));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 gap-0.5 relative",
                  "transition-colors duration-200",
                  active ? "text-gold" : "text-parchment/55 hover:text-parchment",
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-gold rounded-full" />
                )}
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-[11px] tracking-wider">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
