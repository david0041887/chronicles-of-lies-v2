import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ERAS = [
  { id: "primitive", names: ["洪荒先知", "火盜餘燼", "薩滿之眼"] },
  { id: "mesopotamia", names: ["巴別先驅", "楔形之心", "伊絲塔使者"] },
  { id: "egypt", names: ["神廟守衛", "法老祭司", "黃金之心"] },
  { id: "greek", names: ["奧林帕斯新手", "美杜莎之影", "德爾菲預言"] },
  { id: "han", names: ["太學士", "方士副手", "崑崙門徒"] },
  { id: "norse", names: ["魯恩見習", "戰士遺魂", "英靈殿門衛"] },
  { id: "medieval", names: ["異端審判員", "煉金術士", "十字軍副官"] },
  { id: "sengoku", names: ["式神小鬼", "小天狗", "陰陽師門徒"] },
  { id: "ming", names: ["錦衣副隊", "紫禁宮女", "武當門生"] },
  { id: "modern", names: ["都市傳說獵手", "深網爬蟲", "演算法守門員"] },
];

async function pickEraDeck(eraId: string, size = 20): Promise<string[]> {
  // Build from era's R + SR cards (exclude SSR/UR — those are boss-tier)
  const cards = await prisma.card.findMany({
    where: { eraId, rarity: { in: ["R", "SR"] } },
    select: { id: true, rarity: true },
  });
  const ids: string[] = [];
  // Cycle through cards to fill deck, allowing duplicates
  let i = 0;
  while (ids.length < size && cards.length > 0) {
    ids.push(cards[i % cards.length].id);
    i++;
  }
  return ids;
}

async function pickBossDeck(eraId: string, size = 25): Promise<string[]> {
  // Include SSR + UR for boss fights
  const cards = await prisma.card.findMany({
    where: { eraId },
    select: { id: true, rarity: true },
  });
  const ssrPlus = cards.filter((c) => c.rarity === "SSR" || c.rarity === "UR");
  const srR = cards.filter((c) => c.rarity === "SR" || c.rarity === "R");
  const ids: string[] = [];
  // 5 SSR/UR + rest SR/R
  for (let i = 0; i < 5 && i < ssrPlus.length; i++) ids.push(ssrPlus[i].id);
  let i = 0;
  while (ids.length < size && srR.length > 0) {
    ids.push(srR[i % srR.length].id);
    i++;
  }
  return ids;
}

async function main() {
  let count = 0;
  for (const era of ERAS) {
    // Stage 1: intro (easy)
    {
      const deck = await pickEraDeck(era.id, 18);
      if (deck.length === 0) {
        console.log(`skip ${era.id}-1 (no cards)`);
        continue;
      }
      await prisma.stage.upsert({
        where: { id: `${era.id}_1` },
        update: {
          eraId: era.id,
          orderNum: 1,
          name: `${era.names[0]} · 遭遇`,
          subtitle: "第一縷裂痕出現",
          difficulty: 1,
          enemyHp: 40,
          enemyName: era.names[0],
          enemyDeck: deck,
          rewardCrystals: 60,
          rewardExp: 80,
          rewardBelievers: 180,
          isBoss: false,
        },
        create: {
          id: `${era.id}_1`,
          eraId: era.id,
          orderNum: 1,
          name: `${era.names[0]} · 遭遇`,
          subtitle: "第一縷裂痕出現",
          difficulty: 1,
          enemyHp: 40,
          enemyName: era.names[0],
          enemyDeck: deck,
          rewardCrystals: 60,
          rewardExp: 80,
          rewardBelievers: 180,
          isBoss: false,
        },
      });
      count++;
    }

    // Stage 2: mid-tier
    {
      const deck = await pickEraDeck(era.id, 22);
      await prisma.stage.upsert({
        where: { id: `${era.id}_2` },
        update: {
          eraId: era.id,
          orderNum: 2,
          name: `${era.names[1]} · 對峙`,
          subtitle: "帷幕漸薄",
          difficulty: 3,
          enemyHp: 55,
          enemyName: era.names[1],
          enemyDeck: deck,
          rewardCrystals: 120,
          rewardExp: 160,
          rewardBelievers: 400,
          isBoss: false,
        },
        create: {
          id: `${era.id}_2`,
          eraId: era.id,
          orderNum: 2,
          name: `${era.names[1]} · 對峙`,
          subtitle: "帷幕漸薄",
          difficulty: 3,
          enemyHp: 55,
          enemyName: era.names[1],
          enemyDeck: deck,
          rewardCrystals: 120,
          rewardExp: 160,
          rewardBelievers: 400,
          isBoss: false,
        },
      });
      count++;
    }

    // Stage 3: boss (uses SSR/UR mix)
    {
      const deck = await pickBossDeck(era.id, 25);
      await prisma.stage.upsert({
        where: { id: `${era.id}_boss` },
        update: {
          eraId: era.id,
          orderNum: 3,
          name: `${era.names[2]} · 帷幕裂痕`,
          subtitle: "時代首領降臨",
          difficulty: 6,
          enemyHp: 80,
          enemyName: era.names[2],
          enemyDeck: deck,
          rewardCrystals: 300,
          rewardExp: 500,
          rewardBelievers: 1200,
          isBoss: true,
        },
        create: {
          id: `${era.id}_boss`,
          eraId: era.id,
          orderNum: 3,
          name: `${era.names[2]} · 帷幕裂痕`,
          subtitle: "時代首領降臨",
          difficulty: 6,
          enemyHp: 80,
          enemyName: era.names[2],
          enemyDeck: deck,
          rewardCrystals: 300,
          rewardExp: 500,
          rewardBelievers: 1200,
          isBoss: true,
        },
      });
      count++;
    }
  }
  console.log(`✔ Seeded ${count} stages across ${ERAS.length} eras`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
