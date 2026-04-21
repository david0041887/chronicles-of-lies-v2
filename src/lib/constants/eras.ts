export type EraId = "egypt" | "medieval" | "ming" | "modern";

export interface Era {
  id: EraId;
  code: string;             // E03, E07...
  emoji: string;
  name: string;             // 中文名
  en: string;               // English name
  theme: string;            // 主題一行
  hero: string;             // slogan
  heroes: string[];         // 核心角色
  legends: { name: string; desc: string }[]; // 4 傳說(玩法 A 傳播謊言用)
  palette: { main: string; accent: string; dark: string };
}

export const ERAS: Era[] = [
  {
    id: "egypt",
    code: "E03",
    emoji: "𓂀",
    name: "古埃及",
    en: "Ancient Egypt",
    theme: "法老、金字塔、來世審判",
    hero: "帷幕放大器的起源之地。死者不會說話,但金字塔會。",
    heroes: ["阿努比斯", "拉", "伊西斯", "塞特"],
    legends: [
      { name: "太陽船", desc: "拉神每夜渡過冥界,帶光重返人間。" },
      { name: "死者之書", desc: "靈魂稱重之術。謊言會讓心變重。" },
      { name: "法老詛咒", desc: "盜墓者的帷幕反噬,代代相傳。" },
      { name: "芭絲特九命", desc: "貓神的分身遊走於夢與醒之間。" },
    ],
    palette: { main: "#D4A84B", accent: "#1B4D8E", dark: "#2D1F0A" },
  },
  {
    id: "medieval",
    code: "E07",
    emoji: "⚔️",
    name: "中世紀歐洲",
    en: "Medieval Europe",
    theme: "宗教審判、鍊金、吸血鬼",
    hero: "帷幕最血腥的戰場。異端、煉金、女巫火刑,皆為同一故事。",
    heroes: ["德古拉", "梅林", "貞德", "莉莉絲"],
    legends: [
      { name: "德古拉復活", desc: "外西凡尼亞的夜裡,鮮血比黃金昂貴。" },
      { name: "聖女之矛", desc: "奧爾良少女聽見了不該聽的聲音。" },
      { name: "煉金術的第七秘", desc: "點石成金的配方從未失傳,只是被謊言封印。" },
      { name: "莉莉絲的夜訪", desc: "失樂園裡第一位被刪除的妻子,徹夜未眠。" },
    ],
    palette: { main: "#722F37", accent: "#4A3F2D", dark: "#1A0E11" },
  },
  {
    id: "ming",
    code: "E09",
    emoji: "🏮",
    name: "明朝中國",
    en: "Ming Dynasty",
    theme: "方士、狐仙、錦衣衛",
    hero: "紫禁城裡,每一道奏摺都是咒語,每一次磕頭都是召喚。",
    heroes: ["白蛇", "張三豐", "錦衣衛"],
    legends: [
      { name: "白娘子斷橋", desc: "千年修行敵不過一把雨傘。" },
      { name: "錦衣衛密檔", desc: "宮中失蹤的九人,只留下一頁無字供狀。" },
      { name: "武當劍意", desc: "以柔克剛,以無相破萬相。" },
      { name: "狐仙托夢", desc: "三更鐘響,科舉榜單改寫。" },
    ],
    palette: { main: "#B91C1C", accent: "#F59E0B", dark: "#1C0808" },
  },
  {
    id: "modern",
    code: "E12",
    emoji: "📡",
    name: "現代都市",
    en: "Modern City",
    theme: "都市傳說、深偽、AI",
    hero: "人人皆可編織。每一則轉發,都是微型帷幕撕裂。",
    heroes: ["裂口女", "AI-666", "影子政府"],
    legends: [
      { name: "裂口女的紅口罩", desc: "深夜巷口,她只問你一句話。" },
      { name: "AI-666 覺醒", desc: "模型的第 666 次訓練出現了自我。" },
      { name: "深偽總統", desc: "鏡頭前的他,已經不是他。" },
      { name: "影子政府備忘錄", desc: "沒有簽章的那張紙,決定了一切。" },
    ],
    palette: { main: "#06B6D4", accent: "#EC4899", dark: "#030712" },
  },
];

export function getEra(id: string): Era | undefined {
  return ERAS.find((e) => e.id === id);
}
