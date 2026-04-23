import { prisma } from "@/lib/prisma";

// Stage structure per era:
//   orderNum 1   Stage1           (normal, easy)
//   orderNum 2   Stage2           (normal, mid)
//   orderNum 3   Elite            (normal, hard)
//   orderNum 4   BOSS             (normal, isBoss)
//   orderNum 5-7 Prime I / II / III (mode=prime, unlocked after BOSS)

export const STAGE_ERAS = [
  {
    id: "primitive",
    names: ["洪荒先知", "火盜餘燼", "薩滿之眼", "歲熊之靈"],
    primeTitle: "洪荒深淵",
  },
  {
    id: "mesopotamia",
    names: ["巴別先驅", "楔形之心", "伊絲塔使者", "雪松林守衛"],
    primeTitle: "巴別深淵",
  },
  {
    id: "egypt",
    names: ["神廟守衛", "法老祭司", "黃金之心", "荷魯斯羽士"],
    primeTitle: "眾神冥界",
  },
  {
    id: "greek",
    names: ["奧林帕斯新手", "美杜莎之影", "德爾菲預言", "狄俄尼索斯僧侶"],
    primeTitle: "塔耳塔洛斯淵",
  },
  {
    id: "han",
    names: ["太學士", "方士副手", "崑崙門徒", "方士頭領"],
    primeTitle: "九幽方陣",
  },
  {
    id: "norse",
    names: ["魯恩見習", "戰士遺魂", "英靈殿門衛", "海姆達爾影子"],
    primeTitle: "霜霧之底",
  },
  {
    id: "medieval",
    names: ["異端審判員", "煉金術士", "十字軍副官", "宗教法庭主審"],
    primeTitle: "地獄第七層",
  },
  {
    id: "sengoku",
    names: ["式神小鬼", "小天狗", "陰陽師門徒", "鎮魂社人"],
    primeTitle: "百鬼夜淵",
  },
  {
    id: "ming",
    names: ["錦衣副隊", "紫禁宮女", "武當門生", "錦衣密探"],
    primeTitle: "紫禁深宮",
  },
  {
    id: "modern",
    names: ["都市傳說獵手", "深網爬蟲", "演算法守門員", "深度偽造工程師"],
    primeTitle: "伺服器煉獄",
  },
] as const;

async function pickNormalDeck(eraId: string, size: number): Promise<string[]> {
  const cards = await prisma.card.findMany({
    where: { eraId, rarity: { in: ["R", "SR"] } },
    select: { id: true },
  });
  const ids: string[] = [];
  let i = 0;
  while (ids.length < size && cards.length > 0) {
    ids.push(cards[i % cards.length].id);
    i++;
  }
  return ids;
}

async function pickEliteDeck(eraId: string, size: number): Promise<string[]> {
  const cards = await prisma.card.findMany({
    where: { eraId, rarity: { in: ["R", "SR", "SSR"] } },
    select: { id: true, rarity: true },
  });
  const ssr = cards.filter((c) => c.rarity === "SSR").slice(0, 2);
  const srR = cards.filter((c) => c.rarity !== "SSR");
  const ids: string[] = ssr.map((c) => c.id);
  let i = 0;
  while (ids.length < size && srR.length > 0) {
    ids.push(srR[i % srR.length].id);
    i++;
  }
  return ids;
}

async function pickBossDeck(
  eraId: string,
  size: number,
  heavy = false,
): Promise<string[]> {
  const cards = await prisma.card.findMany({
    where: { eraId },
    select: { id: true, rarity: true },
  });
  const ssrPlus = cards.filter((c) => c.rarity === "SSR" || c.rarity === "UR");
  const srR = cards.filter((c) => c.rarity === "SR" || c.rarity === "R");
  const ids: string[] = [];
  const jackpotCount = Math.min(heavy ? 8 : 5, ssrPlus.length);
  for (let i = 0; i < jackpotCount; i++) ids.push(ssrPlus[i].id);
  let i = 0;
  while (ids.length < size && srR.length > 0) {
    ids.push(srR[i % srR.length].id);
    i++;
  }
  return ids;
}

interface StageSpec {
  id: string;
  orderNum: number;
  name: string;
  subtitle: string;
  difficulty: number;
  enemyHp: number;
  enemyName: string;
  rewardCrystals: number;
  rewardBelievers: number;
  isBoss: boolean;
  mode: "normal" | "prime";
  deckFn: () => Promise<string[]>;
}

async function upsertStage(eraId: string, spec: StageSpec): Promise<boolean> {
  const deck = await spec.deckFn();
  if (deck.length === 0) return false;
  const data = {
    eraId,
    orderNum: spec.orderNum,
    name: spec.name,
    subtitle: spec.subtitle,
    difficulty: spec.difficulty,
    enemyHp: spec.enemyHp,
    enemyName: spec.enemyName,
    enemyDeck: deck,
    rewardCrystals: spec.rewardCrystals,
    rewardExp: 0,
    rewardBelievers: spec.rewardBelievers,
    isBoss: spec.isBoss,
    mode: spec.mode,
  };
  await prisma.stage.upsert({
    where: { id: spec.id },
    update: data,
    create: { id: spec.id, ...data },
  });
  return true;
}

/**
 * Lazy auto-seed: if total stage count is below the expected 70, run the
 * full seed. Safe to call on every request — upserts are idempotent, and
 * after the first run the check short-circuits.
 */
let _seedPromise: Promise<unknown> | null = null;
export async function ensureStagesSeeded(): Promise<void> {
  const count = await prisma.stage.count();
  if (count >= 70) return;
  // If a seed is already running (concurrent requests), piggyback on it.
  if (_seedPromise) {
    try {
      await _seedPromise;
    } catch {
      /* ignore — we'll just try again */
    }
    return;
  }
  _seedPromise = seedAllStages().finally(() => {
    _seedPromise = null;
  });
  try {
    await _seedPromise;
  } catch {
    /* best-effort — don't block page render on seed failure */
  }
}

export async function seedAllStages(): Promise<{
  created: number;
  eras: number;
  skipped: string[];
}> {
  let count = 0;
  const skipped: string[] = [];
  for (const era of STAGE_ERAS) {
    const n = era.names;
    const specs: StageSpec[] = [
      {
        id: `${era.id}_1`,
        orderNum: 1,
        name: `${n[0]} · 遭遇`,
        subtitle: "第一縷裂痕出現",
        difficulty: 1,
        enemyHp: 40,
        enemyName: n[0],
        rewardCrystals: 60,
        rewardBelievers: 180,
        isBoss: false,
        mode: "normal",
        deckFn: () => pickNormalDeck(era.id, 18),
      },
      {
        id: `${era.id}_2`,
        orderNum: 2,
        name: `${n[1]} · 對峙`,
        subtitle: "帷幕漸薄",
        difficulty: 3,
        enemyHp: 55,
        enemyName: n[1],
        rewardCrystals: 120,
        rewardBelievers: 400,
        isBoss: false,
        mode: "normal",
        deckFn: () => pickNormalDeck(era.id, 22),
      },
      {
        id: `${era.id}_elite`,
        orderNum: 3,
        name: `${n[3]} · 精英`,
        subtitle: "陰影中的第一道考驗",
        difficulty: 5,
        enemyHp: 75,
        enemyName: n[3],
        rewardCrystals: 220,
        rewardBelievers: 800,
        isBoss: false,
        mode: "normal",
        deckFn: () => pickEliteDeck(era.id, 24),
      },
      {
        id: `${era.id}_boss`,
        orderNum: 4,
        name: `${n[2]} · 帷幕裂痕`,
        subtitle: "時代首領降臨",
        difficulty: 7,
        enemyHp: 95,
        enemyName: n[2],
        rewardCrystals: 400,
        rewardBelievers: 1400,
        isBoss: true,
        mode: "normal",
        deckFn: () => pickBossDeck(era.id, 26),
      },
      {
        id: `${era.id}_prime_1`,
        orderNum: 5,
        name: `${era.primeTitle} · 深淵 I`,
        subtitle: "二週目 · 帷幕翻轉",
        difficulty: 8,
        enemyHp: 120,
        enemyName: `${n[2]}(覺醒)`,
        rewardCrystals: 550,
        rewardBelievers: 2000,
        isBoss: false,
        mode: "prime",
        deckFn: () => pickBossDeck(era.id, 26, true),
      },
      {
        id: `${era.id}_prime_2`,
        orderNum: 6,
        name: `${era.primeTitle} · 深淵 II`,
        subtitle: "陰影長出利齒",
        difficulty: 9,
        enemyHp: 150,
        enemyName: `${n[3]}(黑化)`,
        rewardCrystals: 750,
        rewardBelievers: 2800,
        isBoss: false,
        mode: "prime",
        deckFn: () => pickBossDeck(era.id, 28, true),
      },
      {
        id: `${era.id}_prime_3`,
        orderNum: 7,
        name: `${era.primeTitle} · 深淵終`,
        subtitle: "帷幕本身的回應",
        difficulty: 10,
        enemyHp: 200,
        enemyName: `帷幕之影(${era.id})`,
        rewardCrystals: 1100,
        rewardBelievers: 4200,
        isBoss: true,
        mode: "prime",
        deckFn: () => pickBossDeck(era.id, 30, true),
      },
    ];

    for (const spec of specs) {
      const ok = await upsertStage(era.id, spec);
      if (ok) count++;
      else skipped.push(spec.id);
    }
  }
  return { created: count, eras: STAGE_ERAS.length, skipped };
}
