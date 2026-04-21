export const SPREAD_COOLDOWN_SEC = 30;
export const SPREAD_BELIEVER_MIN = 30;
export const SPREAD_BELIEVER_MAX = 80;
export const LEGEND_COUNT = 4;

/** Returns seconds remaining on the spread cooldown (0 if ready). */
export function cooldownLeft(lastSpreadAt: Date | null | undefined, now = new Date()): number {
  if (!lastSpreadAt) return 0;
  const elapsed = (now.getTime() - new Date(lastSpreadAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(SPREAD_COOLDOWN_SEC - elapsed));
}

/** Compute dominant legend index from counts, or null if no spreads yet. */
export function dominantIndex(counts: number[]): number | null {
  if (!counts || counts.length === 0) return null;
  let bestIdx = -1;
  let bestCount = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > bestCount) {
      bestCount = counts[i];
      bestIdx = i;
    }
  }
  return bestIdx >= 0 ? bestIdx : null;
}

export function ensureLegendCounts(counts: number[] | null | undefined): number[] {
  const out = [...(counts ?? [])];
  while (out.length < LEGEND_COUNT) out.push(0);
  return out.slice(0, LEGEND_COUNT);
}
