"use client";

import { useEffect } from "react";

/**
 * Reads accessibility / display preferences from localStorage and stamps
 * them onto the <html> element on every client navigation, so any CSS
 * targeting `html[data-reduce-motion="true"]` etc. takes effect
 * immediately. Listens to a window event so the Settings page can flip
 * the value without forcing a full reload.
 *
 * Intentionally side-effect-only — renders nothing.
 */

const REDUCE_MOTION_KEY = "chronicles.reduceMotion";
const HIGH_CONTRAST_KEY = "chronicles.highContrast";

function applyAttr(name: string, on: boolean) {
  if (typeof document === "undefined") return;
  if (on) {
    document.documentElement.setAttribute(name, "true");
  } else {
    document.documentElement.removeAttribute(name);
  }
}

export function SettingsBoot() {
  useEffect(() => {
    const sync = () => {
      try {
        applyAttr(
          "data-reduce-motion",
          localStorage.getItem(REDUCE_MOTION_KEY) === "1",
        );
        applyAttr(
          "data-high-contrast",
          localStorage.getItem(HIGH_CONTRAST_KEY) === "1",
        );
      } catch {
        /* localStorage unavailable — silently no-op */
      }
    };
    sync();
    const handler = () => sync();
    window.addEventListener("chronicles:settings-changed", handler);
    return () => window.removeEventListener("chronicles:settings-changed", handler);
  }, []);

  return null;
}
