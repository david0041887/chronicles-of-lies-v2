"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "主頁", icon: "🏠" },
  { href: "/world", label: "世界", icon: "🌍" },
  { href: "/collection", label: "圖鑑", icon: "📚" },
  { href: "/deck", label: "牌組", icon: "🃏" },
  { href: "/forge", label: "鍛造", icon: "⚒️" },
  { href: "/gacha", label: "召喚", icon: "🎴" },
] as const;

export function BottomTabs() {
  const path = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-parchment/15 bg-veil/95 backdrop-blur-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-6">
        {TABS.map((tab) => {
          const active =
            path === tab.href ||
            (tab.href !== "/home" && path.startsWith(`${tab.href}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 gap-0.5 relative min-h-[56px]",
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
  );
}
