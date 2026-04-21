"use server";

import { requireAdmin } from "@/lib/auth-helpers";
import { cloudflareConfigured, generateImageCF } from "@/lib/ai/cloudflare";
import { buildPrompt } from "@/lib/ai/prompts";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function generateCardArt(
  cardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  if (!cloudflareConfigured()) {
    return {
      ok: false,
      error: "CF_ACCOUNT_ID 或 CF_API_TOKEN 未設定",
    };
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      name: true,
      nameEn: true,
      eraId: true,
      rarity: true,
      type: true,
      flavor: true,
    },
  });
  if (!card) return { ok: false, error: "卡牌不存在" };

  try {
    const prompt = buildPrompt(card);
    const { bytes, mime } = await generateImageCF(prompt);
    await prisma.cardImage.upsert({
      where: { cardId: card.id },
      update: {
        bytes: Buffer.from(bytes),
        mime,
        prompt,
        provider: "cloudflare",
      },
      create: {
        cardId: card.id,
        bytes: Buffer.from(bytes),
        mime,
        prompt,
        provider: "cloudflare",
      },
    });
    revalidatePath("/admin/ai");
    revalidatePath("/collection");
    revalidatePath("/gacha");
    return { ok: true };
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
  await prisma.cardImage.deleteMany({ where: { cardId } });
  revalidatePath("/admin/ai");
  revalidatePath("/collection");
  revalidatePath("/gacha");
  return { ok: true };
}
