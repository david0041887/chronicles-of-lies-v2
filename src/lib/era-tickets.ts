import { prisma } from "@/lib/prisma";

/**
 * Era tickets — per-era premium currency for the time-era gacha pool.
 * Stored on User.eraTickets as { [eraId: string]: number }.
 *
 * Economy:
 *   BOSS first-clear  → +5 tickets for that era
 *   BOSS repeat clear → +1 ticket
 *   Prime BOSS clear  → +3 tickets
 *   Weekly login (TBD)→ +2 tickets (future)
 *
 * Spend:
 *   Single pull on era pool  = 1 ticket
 *   Ten-pull on era pool     = 9 tickets (10% discount)
 */

export const ERA_TICKET_SINGLE = 1;
export const ERA_TICKET_TEN = 9;
export const TICKETS_BOSS_FIRST_CLEAR = 5;
export const TICKETS_BOSS_REPEAT = 1;
export const TICKETS_PRIME_BOSS_CLEAR = 3;

export function parseEraTickets(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      out[k] = Math.floor(v);
    }
  }
  return out;
}

export function getEraTicketCount(
  tickets: Record<string, number>,
  eraId: string,
): number {
  return tickets[eraId] ?? 0;
}

/**
 * Race-safe read-modify-write helper for User.eraTickets.
 *
 * eraTickets is a JSON column, so Prisma can't express "increment only
 * this key" as a typed operator — every grant/spend has to read the
 * whole blob, mutate locally, and write it back. Without serialisation
 * two parallel grants (e.g. boss clear A finishing milliseconds after
 * boss clear B) would each read the same baseline and one write would
 * clobber the other.
 *
 * We avoid Prisma raw SQL by taking a row lock on User via an empty
 * \`update\` at the start of the transaction (Prisma serialises these
 * via Postgres's row-level lock). Subsequent read-modify-write inside
 * the same transaction is then exclusive for this user.
 */
async function withUserLock<T>(
  userId: string,
  body: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // SELECT ... FOR UPDATE on User to acquire a row lock — Postgres
    // holds an exclusive lock on the row for the rest of this
    // transaction so any concurrent withUserLock for the same user has
    // to wait. Using $queryRaw because the User model has no field we
    // can no-op update through Prisma's typed API.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    return body(tx);
  });
}

export async function grantEraTickets(
  userId: string,
  eraId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  await withUserLock(userId, async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { eraTickets: true },
    });
    if (!u) return;
    const current = parseEraTickets(u.eraTickets);
    const next = { ...current, [eraId]: (current[eraId] ?? 0) + amount };
    await tx.user.update({
      where: { id: userId },
      data: { eraTickets: next as unknown as object },
    });
  });
}

/** Atomically check + decrement. Returns false if balance insufficient. */
export async function spendEraTickets(
  userId: string,
  eraId: string,
  amount: number,
): Promise<boolean> {
  if (amount <= 0) return true;
  return withUserLock(userId, async (tx) => {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { eraTickets: true },
    });
    if (!u) return false;
    const current = parseEraTickets(u.eraTickets);
    const have = current[eraId] ?? 0;
    if (have < amount) return false;
    const next = { ...current, [eraId]: have - amount };
    await tx.user.update({
      where: { id: userId },
      data: { eraTickets: next as unknown as object },
    });
    return true;
  });
}
