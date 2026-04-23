"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps page content in an AnimatePresence keyed by pathname so every
 * route change performs a brief fade+rise transition instead of snapping.
 *
 * Kept intentionally subtle (~260ms, 6px vertical offset) so it adds
 * perceived polish without slowing navigation or fighting with per-page
 * entrance animations (e.g., framer hero rises on /home, world grid on
 * /world). Uses `mode="wait"` so the previous page fully exits before
 * the next one enters, preventing z-index/layout stacking flicker.
 *
 * Battle page is full-bleed `fixed inset-0` and has its own entrance
 * animation, so wrapping it here still works — the route wrapper just
 * fades the container div; the battle overlay handles its own reveal.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.26, ease: [0.22, 0.97, 0.32, 1.08] }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
