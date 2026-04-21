export type EraId =
  | "primitive"
  | "mesopotamia"
  | "egypt"
  | "greek"
  | "han"
  | "norse"
  | "medieval"
  | "sengoku"
  | "ming"
  | "modern";

export interface Era {
  id: EraId;
  code: string;
  emoji: string;
  name: string;
  en: string;
  theme: string;
  hero: string;
  heroes: string[];
  legends: { name: string; desc: string }[];
  palette: { main: string; accent: string; dark: string };
}

export const ERAS: Era[] = [
  {
    id: "primitive",
    code: "E01",
    emoji: "🔥",
    name: "原始洪荒",
    en: "Primordial Age",
    theme: "薩滿、壁畫、口傳",
    hero: "第一句話,照亮了本不存在的空間。",
    heroes: ["火盜", "大洪水母", "第一個死者"],
    legends: [
      { name: "第一把火", desc: "從天神那裡偷來的火,永遠燒著。" },
      { name: "大洪水", desc: "一場集體想像的實體化,淹沒了第一個世界。" },
      { name: "壁畫呼喚", desc: "畫下的獵物,第二天真的出現了。" },
      { name: "第一個死者", desc: "無名者的告別,揭開了輪迴之秘。" },
    ],
    palette: { main: "#8B4513", accent: "#D97706", dark: "#3D1F0A" },
  },
  {
    id: "mesopotamia",
    code: "E02",
    emoji: "🏛️",
    name: "美索不達米亞",
    en: "Mesopotamia",
    theme: "楔形文字、吉爾伽美什、巴別塔",
    hero: "泥板上的每一道刻痕,都在改寫宇宙的參數。",
    heroes: ["伊絲塔", "吉爾伽美什", "恩奇都"],
    legends: [
      { name: "伊絲塔下冥府", desc: "愛與戰爭女神,穿越七道門。" },
      { name: "吉爾伽美什的不朽", desc: "最古老的英雄史詩,從未真正結束。" },
      { name: "巴別塔的詛咒", desc: "通天之塔,讓語言分裂成千種謊言。" },
      { name: "雪松林守護者", desc: "被斬首的芬巴巴,怨念至今不散。" },
    ],
    palette: { main: "#A0522D", accent: "#DAA520", dark: "#2F1A0A" },
  },
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
    id: "greek",
    code: "E04",
    emoji: "🏺",
    name: "古希臘",
    en: "Ancient Greece",
    theme: "奧林帕斯、神話英雄、悲劇",
    hero: "諸神在山頂俯瞰。悲劇被編織得如此完美,連神自己也無法逃脫。",
    heroes: ["赫卡忒", "美杜莎", "奧菲斯", "阿波羅"],
    legends: [
      { name: "潘朵拉之盒", desc: "打開後飛出的不是災禍,是真實。" },
      { name: "美杜莎之眼", desc: "一眼石化,因為她看見了你真正的樣子。" },
      { name: "奧菲斯下冥府", desc: "歌聲打動了冥王,卻因回頭失去一切。" },
      { name: "克里特迷宮", desc: "迷宮的牆,其實是謊言的厚度。" },
    ],
    palette: { main: "#E8DCC4", accent: "#4A6B8A", dark: "#1A1F2D" },
  },
  {
    id: "han",
    code: "E05",
    emoji: "🐉",
    name: "大漢王朝",
    en: "Han Dynasty",
    theme: "方術、長生、蠻荒",
    hero: "皇帝派方士煉丹,結果煉出了下一個帷幕之子。",
    heroes: ["嫦娥", "西王母", "蚩尤"],
    legends: [
      { name: "嫦娥奔月", desc: "那顆長生藥,吃下後真的飛到月亮。" },
      { name: "蚩尤兵主", desc: "銅頭鐵額的戰神,一口氣殺了整片星空。" },
      { name: "九州劃分", desc: "大禹畫下的九條界線,至今仍在。" },
      { name: "西王母桃會", desc: "三千年一熟的蟠桃,吃一口換一世記憶。" },
    ],
    palette: { main: "#8B0000", accent: "#FFD700", dark: "#1A0505" },
  },
  {
    id: "norse",
    code: "E06",
    emoji: "🪓",
    name: "北歐維京",
    en: "Norse Viking",
    theme: "諸神黃昏、符文、霜巨人",
    hero: "諸神早已知道自己的結局,但仍然一劍劍地揮下去。",
    heroes: ["奧丁", "洛基", "海拉", "瓦爾基麗"],
    legends: [
      { name: "尤格德拉希爾", desc: "世界之樹的九界,連結著所有帷幕。" },
      { name: "芬里爾脫縛", desc: "被魔法鎖鏈綁著的巨狼,終將掙脫。" },
      { name: "米米爾之泉", desc: "奧丁以一眼換取智慧,看見了自己的死。" },
      { name: "諸神黃昏", desc: "不是結束,是所有謊言的結算日。" },
    ],
    palette: { main: "#4682B4", accent: "#C0C0C0", dark: "#0F1A2D" },
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
    id: "sengoku",
    code: "E08",
    emoji: "⛩️",
    name: "日本戰國",
    en: "Sengoku Japan",
    theme: "陰陽師、妖怪、武士道",
    hero: "刀與咒同時出鞘。戰國的亂世,是妖怪最活躍的年代。",
    heroes: ["安倍晴明", "酒吞童子", "九尾狐"],
    legends: [
      { name: "大江山鬼王", desc: "酒吞童子被斬首後,頭顱仍在罵人。" },
      { name: "式神契約", desc: "晴明公呼喚的十二式神,活到了現代。" },
      { name: "玉藻前化身", desc: "九尾狐假扮宮女,差點毀了天皇血脈。" },
      { name: "百鬼夜行", desc: "三百年一次的妖怪遊行,街上人跡盡無。" },
    ],
    palette: { main: "#2D1F1A", accent: "#C72C41", dark: "#0D0505" },
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
