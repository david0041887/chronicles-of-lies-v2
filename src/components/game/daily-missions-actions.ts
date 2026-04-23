"use server";

import { requireUser } from "@/lib/auth-helpers";
import { claimMission } from "@/lib/daily-missions";
import { revalidatePath } from "next/cache";

export async function claimMissionAction(
  slotId: string,
): Promise<
  | { ok: true; crystals: number; faith: number }
  | { ok: false; error: string }
> {
  const user = await requireUser();
  const res = await claimMission(user.id, slotId);
  if (res.ok) revalidatePath("/home");
  return res;
}
