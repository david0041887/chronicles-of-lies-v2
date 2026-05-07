"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Reduced-motion signal that combines the OS prefers-reduced-motion
 * media query AND the in-app Settings toggle (which writes
 * <html data-reduce-motion="true">). Either source returns true.
 *
 * Framer's built-in useReducedMotion only watches the media query, so
 * any per-component duration / phase / autoplay logic that wants to
 * honour BOTH paths should call this instead.
 *
 * Components that use <motion.*> with framer-managed reduce already
 * get the in-app override through MotionRoot (which flips MotionConfig
 * to "always"); this hook is for components doing manual timing,
 * non-framer animations, or framer's own duration props that aren't
 * touched by reducedMotion mode.
 */
export function useAppReducedMotion(): boolean {
  const osReduced = useFramerReducedMotion();
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const read = () =>
      setInApp(
        document.documentElement.getAttribute("data-reduce-motion") === "true",
      );
    read();
    const handler = () => read();
    window.addEventListener("chronicles:settings-changed", handler);
    return () =>
      window.removeEventListener("chronicles:settings-changed", handler);
  }, []);
  return Boolean(osReduced) || inApp;
}
