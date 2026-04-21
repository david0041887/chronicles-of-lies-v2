/**
 * Daily legend rotation — deterministic per (date, eraId).
 * All players see the same daily legend for a given era on a given UTC day.
 */

import { LEGEND_COUNT } from "./spread";

/** Days since Unix epoch, UTC. */
function utcDayNumber(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

/** Hash an era id deterministically. */
function hashEra(eraId: string): number {
  let h = 2166136261;
  for (let i = 0; i < eraId.length; i++) {
    h ^= eraId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns 0..3 — the legend index of the day for a given era.
 * Mixing the day and era with a bit of prime arithmetic so consecutive
 * days don't feel like a simple rotation.
 */
export function dailyLegendIndex(eraId: string, date: Date = new Date()): number {
  const day = utcDayNumber(date);
  const h = (hashEra(eraId) + day * 2654435761) >>> 0;
  return h % LEGEND_COUNT;
}

/** Milliseconds until UTC midnight (next daily rotation). */
export function msUntilNextRotation(now: Date = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
