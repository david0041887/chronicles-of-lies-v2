"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Wraps the (game) tree in a Framer-motion MotionConfig that honours
 * BOTH the OS prefers-reduced-motion media query AND the in-app
 * Settings toggle (which sets <html data-reduce-motion="true">).
 *
 * Without this wrapper every <motion.*> component in the tree would
 * keep animating even when the player explicitly opted out via
 * Settings — Framer's built-in `reducedMotion="user"` only watches
 * the OS query, not our app-level attribute.
 *
 * Strategy: switch MotionConfig's `reducedMotion` between "user" (let
 * Framer respect OS prefs) and "always" (force-disable, used when the
 * in-app toggle is on). We can't go in the other direction — i.e.
 * "force motion when OS reduce is on" — but that's not a use case we
 * need to support.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  const [forceReduced, setForceReduced] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const read = () =>
      setForceReduced(
        document.documentElement.getAttribute("data-reduce-motion") === "true",
      );
    read();
    const handler = () => read();
    window.addEventListener("chronicles:settings-changed", handler);
    return () =>
      window.removeEventListener("chronicles:settings-changed", handler);
  }, []);

  return (
    <MotionConfig reducedMotion={forceReduced ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
