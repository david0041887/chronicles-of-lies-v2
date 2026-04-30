/**
 * Deterministic flavor-text generator. NO LLM dependency — builds a one
 * line of flavor for any card by sampling era-themed templates by rarity.
 *
 * Goals:
 *  - Every empty `Card.flavor` gets *something* hand-feeling without an
 *    API budget.
 *  - Stable output: the same card always gets the same flavor on
 *    re-runs (so seeding is idempotent).
 *  - Designs leave the easy hand-edit path open: if you write a custom
 *    flavor on a card, it stays — the seed script only fills empties.
 *
 * The Veil-theory voice (faded gods, buried truths, weavers re-stitching
 * reality) is the through-line every era's templates share — the era
 * just colors the imagery.
 */

import type { Rarity } from "@prisma/client";

interface Card {
  id: string;
  name: string;
  eraId: string;
  rarity: Rarity;
  type: string;
}

/**
 * Templates use `{name}` as the only interpolation token. Each era has
 * three tiers (R / SR / SSR+) so higher rarities feel more cosmic and
 * lower rarities feel grounded.
 */
type EraTemplates = {
  R: string[];
  SR: string[];
  SSRplus: string[];
};

const TEMPLATES: Record<string, EraTemplates> = {
  primitive: {
    R: [
      "火光之外,有人聽見了 {name} 的呼吸。",
      "獸骨還記得 {name} 留下的腳印。",
      "洞壁上的線條,不只是裝飾。",
      "{name} 在岩縫間低語 — 不是給活人聽的。",
    ],
    SR: [
      "{name} 的影子,比火還高。",
      "圖騰會記得 {name},因為它本就是圖騰的一部分。",
      "「我們命名,於是世界生成。」 — {name} 留下的最後一句。",
    ],
    SSRplus: [
      "{name} 不是傳說 — 是傳說在嘗試成為 {name}。",
      "在第一次有人「相信」之前,{name} 早已等候。",
      "把 {name} 唸出來,世界就會微微傾斜。",
    ],
  },
  mesopotamia: {
    R: [
      "泥板上的字跡乾涸,卻比血更紅。",
      "{name} 在塔的陰影裡盤算著什麼。",
      "城門開合三次,沒人見過 {name} 進來,也沒人見他離開。",
      "刻寫者敬畏地略過 {name} 的名字。",
    ],
    SR: [
      "{name} 的祝福,比咒詛更難承受。",
      "巴別未崩之前,{name} 曾走過七層階梯。",
      "「你該怕真話。」{name} 對巴別塔說。",
    ],
    SSRplus: [
      "{name} 是楔形最初的弧度。",
      "諸神議會中,只有 {name} 沉默 — 因為祂寫的是議事錄。",
      "在所有名字之前,{name} 已存在於人的舌尖上。",
    ],
  },
  egypt: {
    R: [
      "{name} 的眼神,只剩下塵埃。",
      "沙下無聲,卻比咒文更響亮。",
      "{name} 站在審判廳,等待心臟靜止。",
      "墓門封上時,{name} 微微一笑。",
    ],
    SR: [
      "{name} 的祈禱穿透千年 — 你聽得見嗎?",
      "羽毛比 {name} 的心更重。",
      "「來世也是領地。」 — {name} 對木乃伊說。",
    ],
    SSRplus: [
      "{name} 不是被祭奠 — 是 {name} 在祭奠尚未發生的死亡。",
      "尼羅之水流過 {name} 的影子,然後停下來。",
      "在死者之書尚未編成之前,{name} 已經背得起所有頁。",
    ],
  },
  greek: {
    R: [
      "{name} 在阿戈拉的迴廊裡踱步,沒人轉頭。",
      "神諭給了 {name} 一個謎,{name} 只給了一聲笑。",
      "酒神慶典上,{name} 沒有舉杯。",
      "命運三女神不問 {name} 的名字 — 因為她們三人都是 {name}。",
    ],
    SR: [
      "{name} 走過迷宮,連繩線都不需要。",
      "「凡逆神諭者,皆是神。」 — {name}",
      "奧林帕斯的階梯上,有一階是專為 {name} 留的。",
    ],
    SSRplus: [
      "{name} 不畏懼塔耳塔洛斯 — 那裡早已是 {name} 的別墅。",
      "在荷馬唱出第一個字之前,{name} 已是史詩。",
      "凡人傳頌 {name},是因為神不敢提起這個名字。",
    ],
  },
  han: {
    R: [
      "{name} 在朝堂之外,聽見另一種誥命。",
      "竹簡之間,藏著 {name} 的真名。",
      "{name} 折袖而立,劍未出鞘已分勝負。",
      "山林深處,有人為 {name} 留了一盞燈。",
    ],
    SR: [
      "{name} 行於古道,連影子都比常人短一寸。",
      "「真道無形。」 — {name} 對來訪的方士說。",
      "{name} 推枰一笑,九霄之上有星墜落。",
    ],
    SSRplus: [
      "{name} 不修行 — 是修行在試著抵達 {name}。",
      "崑崙之西,有條路只有 {name} 認得。",
      "在「天命」二字寫下之前,{name} 已替它選好了筆畫。",
    ],
  },
  norse: {
    R: [
      "{name} 的劍上,結了三十年的霜。",
      "盧恩石翻面那刻,{name} 微微點頭。",
      "山風吹拂,{name} 沒有縮頸 — {name} 不縮頸。",
      "{name} 飲蜜酒不為慶賀,只為等待天破。",
    ],
    SR: [
      "{name} 走入英靈殿時,連門都自動讓開。",
      "「霜並不寒。」 — {name} 對死亡說。",
      "彩虹橋上有一道刻痕,是 {name} 留下的。",
    ],
    SSRplus: [
      "{name} 不需要諸神黃昏 — 因為 {name} 曾經就是黃昏。",
      "在尤克特拉希爾抽芽之前,{name} 已在根之下守候。",
      "巨人不殺 {name} — 巨人從 {name} 的血脈分流而來。",
    ],
  },
  medieval: {
    R: [
      "{name} 的禱告比塔尖還高,也比塔尖更孤獨。",
      "聖殿地窖之中,{name} 的腳步從不留聲。",
      "羅馬之外,有 {name} 守著另一種真理。",
      "鐘聲響起七次,{name} 才出現。",
    ],
    SR: [
      "{name} 在火刑前微笑 — 他知道帷幕另一面有人接住他。",
      "「異端之名,我親自寫。」 — {name}",
      "聖殿尖塔的玫瑰窗,是按 {name} 的眼眸設計的。",
    ],
    SSRplus: [
      "{name} 不被聖典記載,因為聖典是 {name} 拒絕簽署的版本。",
      "從第一次有人問「神是否存在」開始,{name} 就在排隊回答。",
      "{name} 的祝福只有一句:「你將不被原諒,因此你才自由。」",
    ],
  },
  sengoku: {
    R: [
      "{name} 走過竹林,沒驚動半片葉。",
      "夜霧之中,有人為 {name} 點起一盞紙燈。",
      "{name} 的式神比 {name} 自己還準時。",
      "陣鼓未響,{name} 已知道勝負。",
    ],
    SR: [
      "{name} 念出真言,百鬼皆退一步。",
      "「夜淵不需要光。」 — {name} 對暗影說。",
      "{name} 的刀刃只用過一次 — 一次就夠了。",
    ],
    SSRplus: [
      "{name} 不只是鬼神 — 是鬼神共同參拜的對象。",
      "在百鬼夜行之夜,連月亮都讓 {name} 一道。",
      "在所有結界之前,{name} 已是結界本身。",
    ],
  },
  ming: {
    R: [
      "{name} 點茶時,茶面浮起八卦。",
      "宮闕陰影裡,{name} 在等一個沒寫完的詔書。",
      "御花園深處有一塊磚,只屬於 {name}。",
      "{name} 翻《太平廣記》,翻到了自己。",
    ],
    SR: [
      "{name} 一語既出,九重宮闕震三尺。",
      "「天命可改。」 — {name} 笑著說。",
      "鐵券丹書外,{name} 自有條目。",
    ],
    SSRplus: [
      "{name} 不在朝,也不在野 — {name} 在「之間」。",
      "在金鑾殿的第一塊磚被鋪上之前,{name} 已踏過此地。",
      "{name} 的真名,連《永樂大典》都無權收錄。",
    ],
  },
  modern: {
    R: [
      "{name} 走在霓虹街道上,連監視器都看不清臉。",
      "「演算法很可愛。」 — {name} 對影子說。",
      "{name} 的訊號出現在三百個城市,卻沒人對得上時間戳。",
      "陽台上,{name} 看著城市的影子也回望自己。",
    ],
    SR: [
      "{name} 的存在被熱搜引用了,然後被悄悄刪掉。",
      "AI 拒絕回答關於 {name} 的提問,理由是「資料不確定」。",
      "「真相是過時協議。」 — {name}",
    ],
    SSRplus: [
      "{name} 是所有同步通知的源頭 — 也是所有未送達的原因。",
      "在第一次有人按下「同意」之前,{name} 已寫好了使用條款。",
      "{name} 不被搜尋 — {name} 決定誰被搜尋。",
    ],
  },
};

const FALLBACK: EraTemplates = {
  R: [
    "{name} 的存在,本身就是一句未完的話。",
    "帷幕另一側,有人輕輕念著 {name}。",
  ],
  SR: ["{name} 走過時,空氣會記得停頓一拍。"],
  SSRplus: ["{name} 不需要證明 — 你正在閱讀本就是證明。"],
};

/** Stable hash so the same card always lands on the same template. */
function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Generate a flavor line for a card. Determinstic per-card; never empty;
 * never quoted (callers/UI add quotes as needed). The card.id seeds the
 * template choice so re-running the seeder is a no-op for already-filled
 * cards (they get skipped at the SQL level by the calling script).
 */
export function generateFlavor(card: Card): string {
  const tpl = TEMPLATES[card.eraId] ?? FALLBACK;
  const tier: keyof EraTemplates =
    card.rarity === "SSR" || card.rarity === "UR"
      ? "SSRplus"
      : card.rarity === "SR"
        ? "SR"
        : "R";
  const pool = tpl[tier].length > 0 ? tpl[tier] : tpl.R;
  const line = pool[hash(card.id) % pool.length];
  return line.replace(/\{name\}/g, card.name);
}
