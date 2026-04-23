import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("newbie123", 10);

  // Clean any existing newbie (lookup userId first)
  const existing = await p.user.findUnique({
    where: { email: "newbie@example.com" },
    select: { id: true },
  });
  if (existing) {
    await p.ownedCard.deleteMany({ where: { userId: existing.id } });
    await p.startingReward.deleteMany({ where: { userId: existing.id } });
    await p.eraProgress.deleteMany({ where: { userId: existing.id } });
    await p.stageClear.deleteMany({ where: { userId: existing.id } });
    await p.deck.deleteMany({ where: { userId: existing.id } });
    await p.user.delete({ where: { id: existing.id } });
  }

  const u = await p.user.create({
    data: {
      username: "newbie",
      email: "newbie@example.com",
      passwordHash: hash,
      role: "USER",
      title: "新生編織者",
      crystals: 300,
      tutorialDone: false,
      totalBelievers: 0,
    },
  });
  console.log("✔ Created:", u.username, u.email, "tutorialDone=", u.tutorialDone);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
