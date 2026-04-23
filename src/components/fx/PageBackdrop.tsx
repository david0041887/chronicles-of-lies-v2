"use client";

import { ERAS } from "@/lib/constants/eras";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EraArenaBackdrop } from "./EraArenaBackdrop";
import { VeilBackdrop } from "./VeilBackdrop";

/**
 * Auto-switches the full-viewport backdrop based on the current route so
 * every page has atmosphere instead of the default flat body gradient.
 *
 *   /era/[eraId]           → EraArenaBackdrop for the matched era
 *   /battle/[stageId]      → (skipped — BattleClient mounts its own fullscreen backdrop)
 *   /world                 → VeilBackdrop intensity="high"
 *   /gacha                 → VeilBackdrop intensity="high" (extra particles for ritual feel)
 *   /home, /deck, ...      → VeilBackdrop intensity="medium"
 *   /collection, /forge    → VeilBackdrop intensity="medium"
 *
 * The pathname drives the backdrop identity so AnimatePresence can cross-
 * fade when the player walks between atmospheres (e.g., entering an era
 * from the world map).
 */
export function PageBackdrop() {
  const pathname = usePathname() ?? "/";

  const backdrop = useMemo(() => {
    // Battle screen renders its own full-bleed overlay — suppress the
    // layout-level backdrop so we don't double-paint.
    if (pathname.startsWith("/battle")) return null;

    // Era-specific pages: use the era's arena backdrop so the world feels
    // visually cohesive between era overview and the battles held there.
    const eraMatch = pathname.match(/^\/era\/([a-z0-9_-]+)/i);
    if (eraMatch) {
      const era = ERAS.find((e) => e.id === eraMatch[1]);
      if (era) {
        return {
          kind: "era" as const,
          key: `era-${era.id}`,
          eraId: era.id,
          palette: era.palette,
        };
      }
    }

    const intensity: "medium" | "high" =
      pathname === "/world" || pathname.startsWith("/gacha")
        ? "high"
        : "medium";

    // Subtle palette tint per top-level page so /home vs /deck vs /gacha
    // feel like different rooms in the same temple.
    const tintByRoute: Record<string, { main: string; accent: string; dark: string }> = {
      "/home": { main: "#6B2E8A", accent: "#D4A84B", dark: "#0A0612" },
      "/world": { main: "#6B2E8A", accent: "#D4A84B", dark: "#0A0612" },
      "/gacha": { main: "#8B2E6B", accent: "#F5CA5A", dark: "#120820" },
      "/deck": { main: "#2E6B8A", accent: "#D4A84B", dark: "#06101A" },
      "/collection": { main: "#5A4A7A", accent: "#D4A84B", dark: "#0A0812" },
      "/forge": { main: "#B94A2E", accent: "#F5A52E", dark: "#180805" },
      "/profile": { main: "#4A6B8A", accent: "#D4A84B", dark: "#070C14" },
      "/lore": { main: "#6B2E8A", accent: "#E0C07A", dark: "#0A0612" },
      "/settings": { main: "#3A3A52", accent: "#A0A0B8", dark: "#0A0812" },
    };
    const topLevel = "/" + (pathname.split("/")[1] ?? "");
    const palette = tintByRoute[topLevel] ?? tintByRoute["/home"];

    return {
      kind: "veil" as const,
      key: `veil-${topLevel}`,
      intensity,
      palette,
    };
  }, [pathname]);

  if (!backdrop) return null;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      <AnimatePresence mode="sync">
        <motion.div
          key={backdrop.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {backdrop.kind === "era" ? (
            <EraArenaBackdrop eraId={backdrop.eraId} palette={backdrop.palette} />
          ) : (
            <VeilBackdrop
              main={backdrop.palette.main}
              accent={backdrop.palette.accent}
              dark={backdrop.palette.dark}
              intensity={backdrop.intensity}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
