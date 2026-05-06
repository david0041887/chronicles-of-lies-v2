/**
 * Mid-battle state persistence (localStorage). Lets a player refresh
 * the page during a fight without losing progress.
 *
 * Save strategy is conservative — we only persist at SAFE checkpoints
 * (player's turn, post-mulligan, post-opener) so a restored state is
 * a stable resume point. Saving during enemy_turn or mid-resolution
 * could corrupt the run on reload (engine would re-fire effects),
 * so the BattleClient gates the save() calls accordingly.
 *
 * Storage key includes the stageId, so multiple unfinished battles
 * across different stages don't clobber each other (in practice we
 * only have one fight at a time, but the key shape is future-proof).
 *
 * Versioning: bump SCHEMA_VERSION whenever BattleState's shape changes
 * incompatibly, so old saves don't try to deserialise into a new
 * engine and crash. Bumping invalidates every existing local save.
 *
 * Security caveat: localStorage is editable by the player. The
 * existing battle-complete pipeline already trusts client-reported
 * outcomes (HMAC ticket + result-signature is a speed-bump, not a
 * crypto guarantee — see src/lib/battle/ticket.ts). Persistence
 * doesn't open new attack surface; a determined cheater could
 * already forge any state via DevTools. Server-side sanity caps in
 * /api/battle/complete still gate impossible submissions.
 */

import type { BattleState } from "./types";

const SCHEMA_VERSION = 1;
const KEY_PREFIX = "chronicles.battleState.";
/** Saves older than this (in ms) are ignored on restore — matches the
 *  battle ticket TTL so an "abandoned" battle doesn't auto-resume a
 *  day later when its ticket would already be expired. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2h

interface SavedState {
  v: number;
  savedAt: number;
  battle: BattleState;
  /** Whether the player completed the mulligan modal at least once.
   *  Restored alongside battle so a refresh doesn't grant a free
   *  re-mulligan (the engine guard helps, but we belt-and-braces it). */
  mulliganDone: boolean;
  /** Whether the boss opener overlay has already played. Saved so we
   *  don't re-flash it after every refresh. */
  openerSeen: boolean;
}

function keyFor(stageId: string): string {
  return KEY_PREFIX + stageId;
}

export function loadSaved(stageId: string): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(stageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    if (parsed.v !== SCHEMA_VERSION) return null;
    if (typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!parsed.battle || typeof parsed.battle !== "object") return null;
    return parsed as SavedState;
  } catch {
    return null;
  }
}

export function saveBattle(
  stageId: string,
  data: { battle: BattleState; mulliganDone: boolean; openerSeen: boolean },
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedState = {
      v: SCHEMA_VERSION,
      savedAt: Date.now(),
      battle: data.battle,
      mulliganDone: data.mulliganDone,
      openerSeen: data.openerSeen,
    };
    window.localStorage.setItem(keyFor(stageId), JSON.stringify(payload));
  } catch {
    // Quota exceeded / localStorage disabled / private mode — silently
    // skip. Persistence is a QoL feature, not a correctness guarantee.
  }
}

export function clearSaved(stageId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(stageId));
  } catch {
    /* ignore */
  }
}

/** Whether a stageId is eligible for persistence. Tower battles are
 *  intentionally excluded — they're synthetic stage ids that route
 *  through `__tower:N`, and reloading the page goes back through the
 *  /dungeon/tower/battle/[floor] anti-skip check. Restoring a stale
 *  tower battle there could mismatch the run.level + 1 invariant. */
export function isPersistable(stageId: string): boolean {
  return !stageId.startsWith("__tower:");
}
