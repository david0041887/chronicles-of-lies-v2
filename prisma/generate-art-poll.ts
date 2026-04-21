/**
 * Pollinations fallback generator — fills in cards that don't have CardImage yet.
 * No auth needed. Used when CF Workers AI hits daily limit.
 */

import { PrismaClient } from "@prisma/client";
import { generateImagePollinations } from "../src/lib/ai/pollinations";
import { buildPrompt } from "../src/lib/ai/prompts";

const prisma = new PrismaClient();

const CONCURRENCY = 1;
const DELAY_MS = 30000; // Pollinations anon tier processes ~30s/image and allows
// max 1 queued request per IP. Submit slower than processing time to avoid 429.

async function runOne(cardId: string) {
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
    const { bytes, mime } = await generateImagePollinations(prompt);
    await prisma.cardImage.upsert({
      where: { cardId: card.id },
      update: { bytes: Buffer.from(bytes), mime, prompt, provider: "pollinations" },
      create: { cardId: card.id, bytes: Buffer.from(bytes), mime, prompt, provider: "pollinations" },
    });
    return { ok: true, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), ms: Date.now() - start };
  }
}

async function main() {
  const missing = await prisma.card.findMany({
    where: { image: null },
    orderBy: [{ rarity: "desc" }, { eraId: "asc" }],
    select: { id: true, name: true, rarity: true, eraId: true },
  });

  console.log(`Pollinations fallback: ${missing.length} cards missing art`);
  if (missing.length === 0) return;

  let done = 0;
  const queue = [...missing];

  async function worker(_id: number) {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      let res = await runOne(next.id);
      // One retry after a pause for 429s
      if (!res.ok && /429/.test(res.error ?? "")) {
        await new Promise((r) => setTimeout(r, 8000));
        res = await runOne(next.id);
      }
      done++;
      const tag = `[${done}/${missing.length}]`;
      if (res.ok) {
        console.log(`${tag} ✔ ${next.rarity.padEnd(3)} ${next.id.padEnd(14)} ${next.name.padEnd(8)} ${res.ms}ms`);
      } else {
        console.log(`${tag} ✗ ${next.rarity.padEnd(3)} ${next.id.padEnd(14)} ${next.name.padEnd(8)} ${String(res.error).slice(0, 80)}`);
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
