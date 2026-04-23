import { prisma } from "@/lib/prisma";

/**
 * Stage layout per era (9 stages, expanded from the original 7):
 *
 *   orderNum 1   Stage 1           (normal, easy)       — names[0] · 遭遇
 *   orderNum 2   Stage 2           (normal, mid)        — names[1] · 對峙
 *   orderNum 3   Trial I           (normal, hard-ish)   — names[4] · 試煉 (NEW)
 *   orderNum 4   Elite             (normal, hard)       — names[3] · 精英   [was 3]
 *   orderNum 5   Trial II          (normal, pre-boss)   — names[5] · 先兆 (NEW)
 *   orderNum 6   BOSS              (normal, isBoss)     — names[2] · 帷幕裂痕 [was 4]
 *   orderNum 7   Prime I           (prime)              [was 5]
 *   orderNum 8   Prime II          (prime)              [was 6]
 *   orderNum 9   Prime III (boss)  (prime)              [was 7]
 *
 * First run of the new layout migrates existing EraProgress.highestStage so
 * that users who previously cleared elite (old=3) or boss (old=4) stay in
 * the right place under the new numbering:
 *   - old highestStage 3 → 4
 *   - old highestStage >= 4 → +2
 */

export const STAGE_ERAS = [
  {
    id: "primitive",
    names: [
      "洪荒先知", "火盜餘燼", "薩滿之眼", "歲熊之靈",
      "獸骨巫師", "冰河幽靈",
    ],
    primeTitle: "洪荒深淵",
  },
  {
    id: "mesopotamia",
    names: [
      "巴別先驅", "楔形之心", "伊絲塔使者", "雪松林守衛",
      "泥板咒師", "塔影追獵",
    ],
    primeTitle: "巴別深淵",
  },
  {
    id: "egypt",
    names: [
      "神廟守衛", "法老祭司", "黃金之心", "荷魯斯羽士",
      "墓穴守護", "亡者之靈",
    ],
    primeTitle: "眾神冥界",
  },
  {
    id: "greek",
    names: [
      "奧林帕斯新手", "美杜莎之影", "德爾菲預言", "狄俄尼索斯僧侶",
      "迷宮守衛", "神諭回聲",
    ],
    primeTitle: "塔耳塔洛斯淵",
  },
  {
    id: "han",
    names: [
      "太學士", "方士副手", "崑崙門徒", "方士頭領",
      "宮廷術士", "龍影幻術",
    ],
    primeTitle: "九幽方陣",
  },
  {
    id: "norse",
    names: [
      "魯恩見習", "戰士遺魂", "英靈殿門衛", "海姆達爾影子",
      "狼群斥候", "瓦爾哈拉先兆",
    ],
    primeTitle: "霜霧之底",
  },
  {
    id: "medieval",
    names: [
      "異端審判員", "煉金術士", "十字軍副官", "宗教法庭主審",
      "地牢獄卒", "黑彌撒信徒",
    ],
    primeTitle: "地獄第七層",
  },
  {
    id: "sengoku",
    names: [
      "式神小鬼", "小天狗", "陰陽師門徒", "鎮魂社人",
      "忍者監視", "妖怪先遣",
    ],
    primeTitle: "百鬼夜淵",
  },
  {
    id: "ming",
    names: [
      "錦衣副隊", "紫禁宮女", "武當門生", "錦衣密探",
      "宮廷術士", "帝夢幻影",
    ],
    primeTitle: "紫禁深宮",
  },
  {
    id: "modern",
    names: [
      "都市傳說獵手", "深網爬蟲", "演算法守門員", "深度偽造工程師",
      "監控閘口", "AI 先驅",
    ],
    primeTitle: "伺服器煉獄",
  },
] as const;

// Total stages after expansion. Used by ensureStagesSeeded() as the "is the
// DB fully seeded" short-circuit.
export const EXPECTED_STAGE_COUNT = STAGE_ERAS.length * 9;

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

/** Is this the first run with the new 9-stage layout? */
async function needsExpansionMigration(): Promise<boolean> {
  const probe = await prisma.stage.findUnique({
    where: { id: "primitive_trial_1" },
  });
  return probe === null;
}

/**
 * Shift every user's highestStage so prior progress stays correctly aligned
 * with the new orderNum scheme:
 *   - users at old highestStage==3 (cleared elite) → new 4
 *   - users at old highestStage>=4 (cleared boss or Prime) → +2
 *
 * Run order: call BEFORE upserting stages so that when we then update
 * existing rows' orderNum, user progress already matches the new mapping.
 */
async function migrateHighestStageShift(): Promise<void> {
  // >= 4 first (otherwise the += 2 would catch users who were 3 before we
  // updated them). Run in descending bands.
  await prisma.eraProgress.updateMany({
    where: { highestStage: { gte: 4 } },
    data: { highestStage: { increment: 2 } },
  });
  await prisma.eraProgress.updateMany({
    where: { highestStage: 3 },
    data: { highestStage: { increment: 1 } },
  });
}

/**
 * Lazy auto-seed: if total stage count is below the expected size, run the
 * full seed. Idempotent — upserts are by id, and the one-shot migration is
 * gated on the `primitive_trial_1` row not yet existing.
 */
let _seedPromise: Promise<unknown> | null = null;
export async function ensureStagesSeeded(): Promise<void> {
  const count = await prisma.stage.count();
  if (count >= EXPECTED_STAGE_COUNT) return;
  if (_seedPromise) {
    try {
      await _seedPromise;
    } catch {
      /* ignore */
    }
    return;
  }
  _seedPromise = seedAllStages().finally(() => {
    _seedPromise = null;
  });
  try {
    await _seedPromise;
  } catch {
    /* best-effort */
  }
}

export async function seedAllStages(): Promise<{
  created: number;
  eras: number;
  skipped: string[];
  migrated: boolean;
}> {
  // Run the shift migration first if we're transitioning from 7→9 stages.
  const migrated = await needsExpansionMigration();
  if (migrated) await migrateHighestStageShift();

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
        id: `${era.id}_trial_1`,
        orderNum: 3,
        name: `${n[4]} · 試煉`,
        subtitle: "帷幕邊緣的挑戰者",
        difficulty: 4,
        enemyHp: 65,
        enemyName: n[4],
        rewardCrystals: 170,
        rewardBelievers: 600,
        isBoss: false,
        mode: "normal",
        deckFn: () => pickNormalDeck(era.id, 22),
      },
      {
        id: `${era.id}_elite`,
        orderNum: 4,
        name: `${n[3]} · 精英`,
        subtitle: "陰影中的考驗",
        difficulty: 5,
        enemyHp: 75,
        enemyName: n[3],
        rewardCrystals: 230,
        rewardBelievers: 850,
        isBoss: false,
        mode: "normal",
        deckFn: () => pickEliteDeck(era.id, 24),
      },
      {
        id: `${era.id}_trial_2`,
        orderNum: 5,
        name: `${n[5]} · 先兆`,
        subtitle: "BOSS 先遣探路",
        difficulty: 6,
        enemyHp: 85,
        enemyName: n[5],
        rewardCrystals: 310,
        rewardBelievers: 1100,
        isBoss: false,
        mode: "normal",
        deckFn: () => pickEliteDeck(era.id, 25),
      },
      {
        id: `${era.id}_boss`,
        orderNum: 6,
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
        orderNum: 7,
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
        orderNum: 8,
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
        orderNum: 9,
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
  return { created: count, eras: STAGE_ERAS.length, skipped, migrated };
}
