/**
 * Postgres row-lock helpers for race-prone read-modify-write paths.
 *
 * Use when a JSON column on User (eraTickets, dailyMissions, etc.)
 * needs to be read, mutated client-side, and written back. Without a
 * lock two parallel requests would each read the same baseline and
 * one write would clobber the other — a typical lost-update bug.
 *
 * The helpers acquire `SELECT ... FOR UPDATE` on the User row at the
 * top of an interactive transaction. Postgres holds an exclusive row
 * lock until commit/rollback, so a second concurrent caller has to
 * wait. The body sees a serialised view of the row.
 *
 * Don't pull this into hot paths that already have safe atomic
 * operators (e.g. `crystals: { increment }`) — those run on the DB
 * without needing application-level locking and the lock would just
 * serialise unrelated traffic.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Run `body` inside a transaction that holds an exclusive row lock on
 * User(id). Returns whatever `body` returns. Any throw inside aborts
 * the transaction and releases the lock.
 *
 * Uses $queryRaw for the lock because the User model has no
 * incidentally-touchable column we can no-op update through Prisma's
 * typed API (no updatedAt on User). `${userId}` is a tagged-template
 * parameter, so no SQL-injection risk.
 */
export async function withUserLock<T>(
  userId: string,
  body: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    return body(tx);
  });
}
