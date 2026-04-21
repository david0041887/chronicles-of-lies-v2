/**
 * Batch-generate card art via Cloudflare Workers AI.
 *
 * Usage:
 *   CF_ACCOUNT_ID=... CF_API_TOKEN=... DATABASE_URL=... npx tsx prisma/generate-art.ts [--force]
 *
 * By default skips cards that already have images. Pass --force to regenerate.
 */

import { PrismaClient } from "@prisma/client";
import { generateImageCF, cloudflareConfigured } from "../src/lib/ai/cloudflare";
import { buildPrompt } from "../src/lib/ai/prompts";

const prisma = new PrismaClient();

const FORCE = process.argv.includes("--force");
const CONCURRENCY = 3; // CF Workers AI rate limits; keep modest

async function runOne(cardId: string): Promise<{ ok: boolean; error?: string; ms: number }> {
  const start = Date.now();
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
  if (!card) return { ok: false, error: "card not found", ms: 0 };

  try {
    const prompt = buildPrompt(card);
    const { bytes, mime } = await generateImageCF(prompt);
    await prisma.cardImage.upsert({
      where: { cardId: card.id },
      update: { bytes: Buffer.from(bytes), mime, prompt, provider: "cloudflare" },
      create: { cardId: card.id, bytes: Buffer.from(bytes), mime, prompt, provider: "cloudflare" },
    });
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), ms: Date.now() - start };
  }
}

async function main() {
  if (!cloudflareConfigured()) {
    console.error("❌ CF_ACCOUNT_ID 或 CF_API_TOKEN 未設定");
    process.exit(1);
  }

  const all = await prisma.card.findMany({
    orderBy: [{ rarity: "desc" }, { eraId: "asc" }, { cost: "asc" }],
    include: { image: { select: { cardId: true } } },
  });

  const todo = FORCE ? all : all.filter((c) => !c.image);
  console.log(
    `Generating ${todo.length} / ${all.length} cards${FORCE ? " (force)" : " (missing only)"}`,
  );
  if (todo.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let done = 0;
  let failed = 0;

  // Worker pool
  const queue = [...todo];
  async function worker(_id: number) {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      const res = await runOne(next.id);
      done++;
      const tag = `[${done}/${todo.length}]`;
      if (res.ok) {
        console.log(
          `${tag} ✔ ${next.rarity.padEnd(3)} ${next.id.padEnd(14)} ${next.name.padEnd(8)} ${res.ms}ms`,
        );
      } else {
        failed++;
        console.log(
          `${tag} ✗ ${next.rarity.padEnd(3)} ${next.id.padEnd(14)} ${next.name.padEnd(8)} ${res.error}`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  console.log(`\nDone. ok=${done - failed} failed=${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
