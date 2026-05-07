"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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
 *
 * Respects prefers-reduced-motion AND the in-app Settings toggle.
 * Framer's useReducedMotion only watches the OS media query, so the
 * in-app toggle (which sets <html data-reduce-motion="true">) needs
 * its own observer — see useInAppReducedMotion below. Either signal
 * disables the y-offset and shortens the duration; we still cross-
 * fade because hard-snapping page swaps look broken.
 */
/** Mirror <html data-reduce-motion="true"> so the in-app Settings
 *  toggle reaches React land. SettingsBoot sets the attribute and
 *  fires `chronicles:settings-changed` whenever it changes. */
function useInAppReducedMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const read = () =>
      setOn(
        document.documentElement.getAttribute("data-reduce-motion") === "true",
      );
    read();
    const handler = () => read();
    window.addEventListener("chronicles:settings-changed", handler);
    return () =>
      window.removeEventListener("chronicles:settings-changed", handler);
  }, []);
  return on;
}

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const osReduced = useReducedMotion();
  const inAppReduced = useInAppReducedMotion();
  const reduced = osReduced || inAppReduced;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: reduced ? 0 : -6 }}
        transition={{
          duration: reduced ? 0.18 : 0.26,
          ease: [0.22, 0.97, 0.32, 1.08],
        }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
