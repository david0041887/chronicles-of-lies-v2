/**
 * Simple in-memory rate limiter. Good enough for a single-process Next.js
 * deployment; for multi-instance we'd move to Redis. Keyed by "action:userId".
 *
 *   if (!take(`gacha:${userId}`, 500)) return 429
 */

interface Entry {
  last: number;
  count: number;
}

const MAX_ENTRIES = 50_000;
const _bucket = new Map<string, Entry>();

/** Try to take a slot. Returns true if allowed, false if throttled. */
export function take(key: string, windowMs: number): boolean {
  const now = Date.now();
  const e = _bucket.get(key);
  if (!e) {
    _bucket.set(key, { last: now, count: 1 });
    if (_bucket.size > MAX_ENTRIES) evictStale(now);
    return true;
  }
  if (now - e.last < windowMs) return false;
  e.last = now;
  e.count += 1;
  return true;
}

/** Throttle by N actions per window. `take` allows one per window; this allows N. */
export function takeBurst(
  key: string,
  windowMs: number,
  maxPerWindow: number,
): boolean {
  const now = Date.now();
  const e = _bucket.get(key);
  if (!e || now - e.last > windowMs) {
    _bucket.set(key, { last: now, count: 1 });
    if (_bucket.size > MAX_ENTRIES) evictStale(now);
    return true;
  }
  if (e.count >= maxPerWindow) return false;
  e.count += 1;
  return true;
}

function evictStale(now: number) {
  // Drop anything older than 30 minutes.
  const cutoff = now - 30 * 60 * 1000;
  for (const [k, v] of _bucket.entries()) {
    if (v.last < cutoff) _bucket.delete(k);
  }
}
