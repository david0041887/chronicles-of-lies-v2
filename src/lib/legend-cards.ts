/**
 * Card ⇄ Legend binding. A card tied to legend[idx] in era E gets:
 *   - +2 Power when (E is the card's era AND it's today's daily legend)
 *   - Haste (draw 1 on play) when the above AND card.rarity >= SSR
 *
 * Also drives the auto-spread mechanic: playing a bound card in any
 * battle increments EraProgress.legendCounts[idx] for that era.
 *
 * A card can belong to at most one legend per era. Unbound cards are
 * passive (no buff, no spread contribution).
 */

import type { EraId } from "@/lib/constants/eras";

/**
 * LEGEND_CARDS[eraId][legendIdx] = card ids bound to that legend.
 * legendIdx matches eras.ts `legends[idx]`.
 */
export const LEGEND_CARDS: Record<EraId, string[][]> = {
  primitive: [
    ["ssr_pr_001", "r_pr_001", "r_pr_004"], // 第一把火
    ["ssr_pr_002", "sr_pr_003", "ur_pr_002"], // 大洪水
    ["sr_pr_001", "r_pr_007", "ur_pr_003"], // 壁畫呼喚
    ["sr_pr_002", "sr_pr_004", "r_pr_005", "r_pr_009", "ur_pr_001"], // 第一個死者
  ],
  mesopotamia: [
    ["ssr_me_001", "sr_me_004", "r_me_006", "ur_me_003"], // 伊絲塔下冥府
    ["ssr_me_002", "sr_me_001", "ur_me_001"], // 吉爾伽美什的不朽
    ["r_me_004", "r_me_001", "r_me_002", "ur_me_002"], // 巴別塔的詛咒
    ["sr_me_002", "sr_me_003", "r_me_007", "r_me_008"], // 雪松林守護者
  ],
  egypt: [
    ["sr_eg_001", "r_eg_006", "ur_eg_003"], // 太陽船
    ["ssr_eg_001", "r_eg_005", "ur_eg_001"], // 死者之書
    ["sr_eg_002", "r_eg_002", "r_eg_007", "ur_eg_002"], // 法老詛咒
    ["r_eg_003", "ssr_eg_002", "sr_eg_003"], // 芭絲特九命
  ],
  greek: [
    ["sr_gr_004", "r_gr_009", "r_gr_007"], // 潘朵拉之盒
    ["ssr_gr_001", "r_gr_005", "r_gr_003", "ur_gr_002"], // 美杜莎之眼
    ["sr_gr_001", "r_gr_004", "r_gr_006", "ur_gr_003"], // 奧菲斯下冥府
    ["ssr_gr_002", "r_gr_001", "r_gr_002", "sr_gr_002", "sr_gr_003", "r_gr_008", "ur_gr_001"], // 克里特迷宮
  ],
  han: [
    ["ssr_ha_001", "r_ha_002", "r_ha_001", "ur_ha_001"], // 嫦娥奔月
    ["ssr_ha_002", "sr_ha_002", "sr_ha_003", "ur_ha_003"], // 蚩尤兵主
    ["r_ha_003", "r_ha_004", "r_ha_005", "r_ha_007", "ur_ha_002"], // 九州劃分
    ["sr_ha_001", "sr_ha_004", "r_ha_006", "r_ha_008", "r_ha_009"], // 西王母桃會
  ],
  norse: [
    ["r_no_001", "r_no_003", "r_no_002"], // 尤格德拉希爾
    ["sr_no_004", "r_no_006", "r_no_004", "ur_no_001"], // 芬里爾脫縛
    ["ssr_no_001", "ssr_no_002", "ur_no_003"], // 米米爾之泉
    ["sr_no_001", "sr_no_002", "sr_no_003", "r_no_005", "r_no_007", "r_no_008", "r_no_009", "ur_no_002"], // 諸神黃昏
  ],
  medieval: [
    ["ssr_md_001", "sr_md_004", "r_md_001", "ur_md_001"], // 德古拉復活
    ["sr_md_001", "r_md_003", "r_md_006", "ur_md_003"], // 聖女之矛
    ["ssr_md_002", "sr_md_003", "r_md_007", "ur_md_002"], // 煉金術的第七秘
    ["sr_md_002", "r_md_002", "r_md_009"], // 莉莉絲的夜訪
  ],
  sengoku: [
    ["ssr_se_002", "r_se_001", "r_se_007", "ur_se_002"], // 大江山鬼王
    ["ssr_se_001", "r_se_002", "ur_se_001"], // 式神契約
    ["sr_se_001", "r_se_005", "r_se_008"], // 玉藻前化身
    ["sr_se_002", "sr_se_003", "sr_se_004", "r_se_003", "r_se_004", "r_se_006", "r_se_009", "ur_se_003"], // 百鬼夜行
  ],
  ming: [
    ["ssr_mg_001", "sr_mg_004"], // 白娘子斷橋
    ["sr_mg_001", "r_mg_005", "r_mg_006", "ur_mg_002"], // 錦衣衛密檔
    ["ssr_mg_002", "sr_mg_003", "r_mg_008", "ur_mg_001", "ur_mg_003"], // 武當劍意
    ["sr_mg_002", "r_mg_001", "r_mg_002"], // 狐仙托夢
  ],
  modern: [
    ["sr_mo_001", "sr_mo_004", "r_mo_003"], // 裂口女的紅口罩
    ["ssr_mo_001", "r_mo_005", "ur_mo_001", "ur_mo_002"], // AI-666 覺醒
    ["sr_mo_002", "sr_mo_003", "r_mo_004", "ur_mo_003"], // 深偽總統
    ["ssr_mo_002", "r_mo_001", "r_mo_006", "r_mo_008", "r_mo_002"], // 影子政府備忘錄
  ],
};

/** Given a card id + era, returns the legend index (0..3) it's bound to, or null. */
export function cardLegendIndex(eraId: string, cardId: string): number | null {
  const bindings = LEGEND_CARDS[eraId as EraId];
  if (!bindings) return null;
  for (let i = 0; i < bindings.length; i++) {
    if (bindings[i].includes(cardId)) return i;
  }
  return null;
}

/** The set of card IDs bound to a given (era, legend). Used for era-page preview. */
export function cardsForLegend(eraId: string, legendIdx: number): string[] {
  return LEGEND_CARDS[eraId as EraId]?.[legendIdx] ?? [];
}
