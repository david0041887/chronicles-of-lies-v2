import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED = [
  {
    username: "admin",
    email: "admin@example.com",
    password: "admin123",
    role: "ADMIN" as const,
    title: "議會長老",
    crystals: 10000,
  },
  {
    username: "test",
    email: "test@example.com",
    password: "test123",
    role: "USER" as const,
    title: "測試編織者",
    crystals: 500,
  },
];

async function main() {
  for (const u of SEED) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const saved = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, passwordHash, title: u.title },
      create: {
        username: u.username,
        email: u.email,
        passwordHash,
        role: u.role,
        title: u.title,
        crystals: u.crystals,
      },
    });
    console.log(`✔ ${saved.role.padEnd(6)} ${saved.email} (${saved.username})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
