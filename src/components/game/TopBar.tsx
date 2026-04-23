import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { weaverLevel } from "@/lib/weaver";
import Link from "next/link";
import { TopBarSettings } from "./TopBarSettings";

/**
 * Server component — persistent HUD above every (game) page.
 *
 * Shows: brand · weaver level pill · crystals / faith / free-pulls.
 * Admin, Settings, Logout live in TopBarSettings (client side).
 */
export async function TopBar() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      username: true,
      crystals: true,
      faith: true,
      freePulls: true,
      totalBelievers: true,
    },
  });
  if (!user) return null;

  const level = weaverLevel(user.totalBelievers);
  const isAdmin = user.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-parchment/10 bg-veil/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-12 flex items-center justify-between gap-3">
        <Link
          href="/home"
          className="display-serif text-gold text-sm sm:text-base tracking-wider shrink-0 flex items-center gap-2"
        >
          <span className="hidden sm:inline">謊言編年者</span>
          <span className="sm:hidden">謊言</span>
        </Link>

        {/* Currency strip */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto text-[11px] sm:text-xs tabular-nums font-[family-name:var(--font-mono)] min-w-0 flex-1 justify-end">
          <Pill
            emoji="🎖️"
            value={`Lv.${level}`}
            tint="text-gold"
            title={`編織者 · ${user.username}`}
          />
          <Pill
            emoji="💎"
            value={user.crystals.toLocaleString()}
            tint="text-rarity-super"
            title="水晶"
          />
          <Pill
            emoji="🕯️"
            value={user.faith.toLocaleString()}
            tint="text-weavers"
            title="信念幣"
          />
          {user.freePulls > 0 && (
            <Pill
              emoji="🎁"
              value={`×${user.freePulls}`}
              tint="text-gold"
              title="免費抽數"
              glow
            />
          )}
        </div>

        <TopBarSettings isAdmin={isAdmin} />
      </div>
    </header>
  );
}

function Pill({
  emoji,
  value,
  tint,
  title,
  glow = false,
}: {
  emoji: string;
  value: string;
  tint: string;
  title: string;
  glow?: boolean;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md border border-parchment/10 bg-veil/60 ${tint} ${
        glow ? "shadow-[0_0_12px_rgba(212,168,75,0.35)] border-gold/50" : ""
      }`}
    >
      <span className="text-sm leading-none">{emoji}</span>
      <span className="leading-none">{value}</span>
    </span>
  );
}
