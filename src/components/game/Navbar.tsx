"use client";

import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/home", label: "主頁" },
  { href: "/world", label: "世界" },
  { href: "/collection", label: "圖鑑" },
  { href: "/deck", label: "牌組" },
  { href: "/gacha", label: "召喚" },
];

export function Navbar({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-parchment/10 bg-veil/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link
          href="/home"
          className="display-serif text-gold text-lg tracking-wider"
        >
          謊言編年者
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              path === link.href || path.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-gold/15 text-gold"
                    : "text-parchment/70 hover:text-parchment hover:bg-parchment/5",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "ml-2 px-3 py-1.5 rounded-md text-sm transition-colors border",
                path.startsWith("/admin")
                  ? "border-blood text-blood bg-blood/10"
                  : "border-blood/50 text-blood/80 hover:bg-blood/10",
              )}
            >
              後台
            </Link>
          )}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs text-parchment/50 hover:text-parchment tracking-wider"
        >
          登出
        </button>
      </div>
    </header>
  );
}
