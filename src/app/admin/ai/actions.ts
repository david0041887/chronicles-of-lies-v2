"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { buildPrompt } from "@/lib/ai/prompts";
import { generateImage, replicateConfigured } from "@/lib/ai/replicate";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function generateCardArt(
  cardId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();

  if (!replicateConfigured()) {
    return {
      ok: false,
      error: "Replicate 未設定。請到 Railway 加環境變數 REPLICATE_API_TOKEN。",
    };
  }

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return { ok: false, error: "卡牌不存在" };

  try {
    const prompt = buildPrompt(card);
    const url = await generateImage(prompt);
    await prisma.card.update({
      where: { id: cardId },
      data: { imageUrl: url },
    });
    revalidatePath("/admin/ai");
    revalidatePath("/collection");
    revalidatePath("/gacha");
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "生成失敗",
    };
  }
}

export async function clearCardArt(
  cardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  await prisma.card.update({ where: { id: cardId }, data: { imageUrl: null } });
  revalidatePath("/admin/ai");
  revalidatePath("/collection");
  revalidatePath("/gacha");
  return { ok: true };
}
