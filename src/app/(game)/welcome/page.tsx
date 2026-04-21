import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOrCreateStarter } from "@/lib/starter-pack";
import { redirect } from "next/navigation";
import { WelcomeClient } from "./WelcomeClient";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireUser();

  // Pre-generate or load the starter grid
  const starter = await getOrCreateStarter(user.id);
  if (starter.claimedAt) {
    redirect("/home");
  }

  // Look up card details (name, rarity, era, type, cost, power, etc.)
  const allIds = new Set<string>();
  for (const round of starter.rolls) for (const choice of round) for (const id of choice) allIds.add(id);
  const rawCards = await prisma.card.findMany({
    where: { id: { in: [...allIds] } },
    include: { image: { select: { cardId: true } } },
  });
  const cardsById: Record<string, Record<string, unknown>> = Object.fromEntries(
    rawCards.map(({ image, ...c }) => [
      c.id,
      { ...c, hasImage: image !== null },
    ]),
  );

  return (
    <WelcomeClient
      initialRolls={starter.rolls}
      initialPicks={starter.picks}
      cardsById={cardsById}
    />
  );
}
