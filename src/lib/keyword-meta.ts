/**
 * Shared keyword copy — title (tooltip) + full description.
 * Used by CardTile (hover title) and CardDetailModal (expanded list).
 */

export interface KeywordMeta {
  zh: string;
  desc: string;
}

export const KEYWORDS: Record<string, KeywordMeta> = {
  whisper: { zh: "低語", desc: "出牌時偷看對手 1 張手牌" },
  ritual: { zh: "儀式", desc: "高投入回合強力發動" },
  charm: { zh: "魅惑", desc: "敵人下張攻擊/儀式有 50% 反傷自己" },
  curse: { zh: "詛咒", desc: "2-3 疊,每回合遞減 1 點傷害" },
  resonance: { zh: "共鳴", desc: "同時代牌同場效果提升" },
  sacrifice: { zh: "獻祭", desc: "棄 1 張手牌 → 本牌 +3 威力" },
  echo: { zh: "回響", desc: "下回合自動以 50% 威力重現" },
  pierce: { zh: "穿透", desc: "無視敵方護盾" },
  shield: { zh: "護盾", desc: "獲得一次性傷害吸收" },
  haste: { zh: "迅捷", desc: "出牌後立即再抽 1 張" },
  lifesteal: { zh: "吸血", desc: "本次傷害回復等量信徒(上限 6)" },
  poison: { zh: "中毒", desc: "敵人每回合 −N 信徒,不衰減" },
  vulnerable: { zh: "破綻", desc: "敵人 2 回合內受到 +50% 傷害" },
  weaken: { zh: "虛弱", desc: "敵人 2 回合內輸出 −25%" },
  strength: { zh: "力量", desc: "永久為每張後續牌 +1 威力" },
  combo: { zh: "連擊", desc: "本回合第 3 張起 +50% 威力" },
};

export function keywordTitle(k: string): string {
  const m = KEYWORDS[k];
  return m ? `${m.zh} — ${m.desc}` : k;
}
