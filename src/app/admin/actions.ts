"use server";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { seedAllStages } from "@/lib/seed-stages";
import { revalidatePath } from "next/cache";

export async function toggleRole(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await requireAdmin();
    // Refuse to demote the last admin — prevents locking out the panel.
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!u) return { ok: false, error: "使用者不存在" };
    if (u.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) {
        return { ok: false, error: "無法降級最後一位管理員" };
      }
    }
    // Self-demotion should be intentional — allow but require re-login.
    const nextRole = u.role === "ADMIN" ? "USER" : "ADMIN";
    await prisma.user.update({
      where: { id: userId },
      data: { role: nextRole },
    });
    await audit({
      action: "admin.toggleRole",
      userId: me.id,
      meta: { targetUserId: userId, from: u.role, to: nextRole },
    });
    revalidatePath("/admin");
    if (userId === me.id && u.role === "ADMIN") {
      // No server-side signOut here; page revalidation is enough — next
      // navigation away from /admin will bounce them out per proxy.ts.
    }
    return { ok: true };
  } catch (err) {
    console.error("toggleRole failed", err);
    return { ok: false, error: "操作失敗" };
  }
}

export async function grantCrystals(
  userId: string,
  amount: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await requireAdmin();
    if (!Number.isFinite(amount) || Math.abs(amount) > 100000) {
      return { ok: false, error: "金額超出範圍" };
    }
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "使用者不存在" };
    await prisma.user.update({
      where: { id: userId },
      data: { crystals: { increment: amount } },
    });
    await audit({
      action: "admin.grantCrystals",
      userId: me.id,
      meta: { targetUserId: userId, amount },
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("grantCrystals failed", err);
    return { ok: false, error: "操作失敗" };
  }
}

export async function resetUserStats(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const me = await requireAdmin();
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "使用者不存在" };
    await prisma.user.update({
      where: { id: userId },
      data: {
        battlesWon: 0,
        battlesLost: 0,
        totalBelievers: 0,
        veilEnergy: 0,
      },
    });
    await audit({
      action: "admin.resetUserStats",
      userId: me.id,
      meta: { targetUserId: userId },
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("resetUserStats failed", err);
    return { ok: false, error: "操作失敗" };
  }
}

/**
 * Form-action wrappers — discard the structured return so they match the
 * `(formData: FormData) => void | Promise<void>` shape expected by
 * <form action={...}>. Errors are still logged server-side.
 */
export async function toggleRoleForm(userId: string): Promise<void> {
  await toggleRole(userId);
}
export async function grantCrystalsForm(
  userId: string,
  amount: number,
): Promise<void> {
  await grantCrystals(userId, amount);
}
export async function resetUserStatsForm(userId: string): Promise<void> {
  await resetUserStats(userId);
}

export async function reseedStages(): Promise<{
  ok: boolean;
  created?: number;
  eras?: number;
  skipped?: string[];
  error?: string;
}> {
  try {
    await requireAdmin();
    const res = await seedAllStages();
    revalidatePath("/admin");
    revalidatePath("/world");
    return { ok: true, ...res };
  } catch (err) {
    console.error("reseedStages failed", err);
    return { ok: false, error: (err as Error).message ?? "操作失敗" };
  }
}
