/**
 * Idempotent flavor-text seeder.
 *
 *   npm run db:seed-flavor             — fills empty Card.flavor only
 *   npm run db:seed-flavor -- --dry    — print what would change, no writes
 *   npm run db:seed-flavor -- --force  — also overwrite existing flavors
 *                                         (use sparingly — destructive)
 *
 * Default behaviour skips any card that already has flavor text, so
 * hand-tuned lines (and the existing AI-generated ones) are preserved.
 */

import { PrismaClient } from "@prisma/client";
import { generateFlavor } from "../src/lib/ai/flavor";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");
  const force = args.includes("--force");

  console.log(
    `[seed-flavor] starting (${dryRun ? "DRY RUN" : "writing"}${force ? ", FORCE-OVERWRITE" : ""})`,
  );

  const cards = await prisma.card.findMany({
    where: force
      ? {}
      : {
          OR: [{ flavor: null }, { flavor: "" }],
        },
    select: {
      id: true,
      name: true,
      eraId: true,
      rarity: true,
      type: true,
      flavor: true,
    },
    orderBy: [{ eraId: "asc" }, { rarity: "desc" }, { id: "asc" }],
  });

  console.log(`[seed-flavor] ${cards.length} card(s) need flavor`);

  if (cards.length === 0) {
    console.log("[seed-flavor] nothing to do — every card already has flavor");
    return;
  }

  let written = 0;
  let skipped = 0;
  // Stat per era for a tidy summary at the end.
  const perEra: Record<string, number> = {};

  for (const card of cards) {
    const flavor = generateFlavor(card);
    if (!flavor || flavor === card.flavor) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `  [${card.rarity.padEnd(3)}] ${card.eraId.padEnd(11)} ${card.id}  →  ${flavor}`,
      );
    } else {
      await prisma.card.update({
        where: { id: card.id },
        data: { flavor },
      });
    }
    perEra[card.eraId] = (perEra[card.eraId] ?? 0) + 1;
    written++;
  }

  console.log(`\n[seed-flavor] summary`);
  console.log(`  ${dryRun ? "would write" : "wrote"}: ${written}`);
  console.log(`  skipped (no change): ${skipped}`);
  for (const [era, n] of Object.entries(perEra).sort()) {
    console.log(`    ${era.padEnd(12)} ${n}`);
  }
  console.log(
    dryRun
      ? "[seed-flavor] DRY RUN — no rows touched. Re-run without --dry to apply."
      : "[seed-flavor] done.",
  );
}

main()
  .catch((e) => {
    console.error("[seed-flavor] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
