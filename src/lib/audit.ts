import { prisma } from "@/lib/prisma";

/**
 * Append-only audit log for security-sensitive events. Fire-and-forget —
 * a dropped log entry must never block the user action. All writes are
 * wrapped in try/catch; on failure we log to console and move on.
 *
 * Naming convention: `<domain>.<action>`, e.g.:
 *   admin.grantCrystals / admin.toggleRole / admin.resetUserStats
 *   admin.reseedStages
 *   auth.bind / auth.bind.failed
 *   battle.reject.ticket / battle.reject.signature / battle.reject.sanity
 *   battle.reject.rate
 */

export async function audit(args: {
  action: string;
  userId?: string | null;
  ip?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: args.action,
        userId: args.userId ?? null,
        ip: args.ip ?? null,
        meta: (args.meta ?? {}) as object,
      },
    });
  } catch (err) {
    console.error(`[audit] failed to log ${args.action}`, err);
  }
}

/** Extract best-effort IP from a Request. */
export function clientIpOf(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "anon"
  );
}
