"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { seedAllStages } from "@/lib/seed-stages";
import { revalidatePath } from "next/cache";

export async function toggleRole(userId: string) {
  await requireAdmin();
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) throw new Error("User not found");
  await prisma.user.update({
    where: { id: userId },
    data: { role: u.role === "ADMIN" ? "USER" : "ADMIN" },
  });
  revalidatePath("/admin");
}

export async function grantCrystals(userId: string, amount: number) {
  await requireAdmin();
  if (!Number.isFinite(amount) || Math.abs(amount) > 100000) {
    throw new Error("Invalid amount");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { crystals: { increment: amount } },
  });
  revalidatePath("/admin");
}

export async function resetUserStats(userId: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: {
      battlesWon: 0,
      battlesLost: 0,
      totalBelievers: 0,
      veilEnergy: 0,
    },
  });
  revalidatePath("/admin");
}

export async function reseedStages(): Promise<{
  ok: boolean;
  created?: number;
  eras?: number;
  skipped?: string[];
  error?: string;
}> {
  await requireAdmin();
  try {
    const res = await seedAllStages();
    revalidatePath("/admin");
    revalidatePath("/world");
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
