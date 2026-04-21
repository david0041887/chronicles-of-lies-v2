import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  id: string;
  name: string;
  nameEn?: string;
  eraId: "egypt" | "medieval" | "ming" | "modern";
  rarity: "R" | "SR" | "SSR" | "UR";
  type: "attack" | "spread" | "heal" | "confuse" | "buff" | "debuff" | "ritual";
  element: "light" | "dark" | "flux" | "order" | "desire" | "illusion" | "end";
  cost: number;
  power: number;
  keywords?: string[];
  flavor: string;
};

const CARDS: Seed[] = [
  // =========================================================
  // E03 古埃及 Egypt (15)
  // =========================================================
  // SSR (2)
  { id: "ssr_eg_001", name: "阿努比斯", nameEn: "Anubis", eraId: "egypt", rarity: "SSR", type: "attack", element: "end", cost: 6, power: 14, keywords: ["pierce"], flavor: "亡者的心,在祂的天秤上失重。" },
  { id: "ssr_eg_002", name: "伊西斯", nameEn: "Isis", eraId: "egypt", rarity: "SSR", type: "heal", element: "light", cost: 5, power: 12, keywords: ["resonance"], flavor: "魔法之母,以翼羽遮蔽法老之血。" },
  // SR (4)
  { id: "sr_eg_001", name: "拉", nameEn: "Ra", eraId: "egypt", rarity: "SR", type: "buff", element: "light", cost: 4, power: 0, keywords: ["resonance"], flavor: "太陽船日夜航行,照亮與遮蔽都是祂的律法。" },
  { id: "sr_eg_002", name: "塞特", nameEn: "Set", eraId: "egypt", rarity: "SR", type: "debuff", element: "dark", cost: 4, power: 6, keywords: ["curse"], flavor: "風暴之神的嫉妒,埋葬了兄弟。" },
  { id: "sr_eg_003", name: "克麗奧佩特拉", nameEn: "Cleopatra", eraId: "egypt", rarity: "SR", type: "confuse", element: "desire", cost: 3, power: 6, keywords: ["charm"], flavor: "她的眼神,令兩位羅馬帝王都失去了帝國。" },
  { id: "sr_eg_004", name: "荷魯斯之眼", nameEn: "Eye of Horus", eraId: "egypt", rarity: "SR", type: "spread", element: "order", cost: 3, power: 5, keywords: ["whisper"], flavor: "凡它所見,皆成真實。" },
  // R (9)
  { id: "r_eg_001", name: "木乃伊", nameEn: "Mummy", eraId: "egypt", rarity: "R", type: "attack", element: "end", cost: 2, power: 3, flavor: "亞麻布下的怨念,永不腐朽。" },
  { id: "r_eg_002", name: "法老詛咒", nameEn: "Pharaoh's Curse", eraId: "egypt", rarity: "R", type: "debuff", element: "dark", cost: 2, power: 3, keywords: ["curse"], flavor: "擅闖墓穴者,代代不得安寧。" },
  { id: "r_eg_003", name: "芭絲特", nameEn: "Bastet", eraId: "egypt", rarity: "R", type: "attack", element: "illusion", cost: 2, power: 3, flavor: "貓神的九條尾巴,遊走在夢與醒之間。" },
  { id: "r_eg_004", name: "金字塔祭司", nameEn: "Pyramid Priest", eraId: "egypt", rarity: "R", type: "buff", element: "order", cost: 2, power: 3, flavor: "石陣是帷幕的放大器。" },
  { id: "r_eg_005", name: "死者之書", nameEn: "Book of the Dead", eraId: "egypt", rarity: "R", type: "ritual", element: "end", cost: 3, power: 4, keywords: ["ritual"], flavor: "若你的心比羽毛重,靈魂將被吞噬。" },
  { id: "r_eg_006", name: "太陽船", nameEn: "Solar Barque", eraId: "egypt", rarity: "R", type: "spread", element: "light", cost: 2, power: 4, flavor: "每個夜晚,光都要穿越一次冥府。" },
  { id: "r_eg_007", name: "埃及眼鏡蛇", nameEn: "Egyptian Cobra", eraId: "egypt", rarity: "R", type: "attack", element: "dark", cost: 1, power: 2, keywords: ["pierce"], flavor: "法老額間的女王,一吻斷魂。" },
  { id: "r_eg_008", name: "沙漠風暴", nameEn: "Desert Sandstorm", eraId: "egypt", rarity: "R", type: "confuse", element: "flux", cost: 2, power: 2, flavor: "在風暴中,真與假無從分辨。" },
  { id: "r_eg_009", name: "赫赫女神", nameEn: "Heh", eraId: "egypt", rarity: "R", type: "heal", element: "light", cost: 2, power: 3, flavor: "永恆的承諾,以百萬年計。" },

  // =========================================================
  // E07 中世紀歐洲 Medieval (15)
  // =========================================================
  // SSR (2)
  { id: "ssr_md_001", name: "德古拉", nameEn: "Dracula", eraId: "medieval", rarity: "SSR", type: "attack", element: "dark", cost: 7, power: 15, keywords: ["pierce", "curse"], flavor: "我曾死過一次,死亡於我只是一扇門。" },
  { id: "ssr_md_002", name: "梅林", nameEn: "Merlin", eraId: "medieval", rarity: "SSR", type: "buff", element: "illusion", cost: 6, power: 0, keywords: ["resonance", "echo"], flavor: "智者以倒序活著,自終點遙望王者誕生。" },
  // SR (4)
  { id: "sr_md_001", name: "貞德", nameEn: "Joan of Arc", eraId: "medieval", rarity: "SR", type: "attack", element: "light", cost: 5, power: 10, keywords: ["shield"], flavor: "聲音告訴她前進,火焰將她封聖。" },
  { id: "sr_md_002", name: "莉莉絲", nameEn: "Lilith", eraId: "medieval", rarity: "SR", type: "confuse", element: "desire", cost: 4, power: 8, keywords: ["charm"], flavor: "失樂園裡第一位被刪除的妻子,徹夜未眠。" },
  { id: "sr_md_003", name: "煉金術師", nameEn: "Alchemist", eraId: "medieval", rarity: "SR", type: "ritual", element: "order", cost: 4, power: 7, keywords: ["ritual"], flavor: "點石成金的第七秘從未失傳,只是被謊言封印。" },
  { id: "sr_md_004", name: "吸血鬼女伯爵", nameEn: "Vampire Countess", eraId: "medieval", rarity: "SR", type: "debuff", element: "dark", cost: 4, power: 7, keywords: ["sacrifice"], flavor: "鮮血浴是她的青春秘方。" },
  // R (9)
  { id: "r_md_001", name: "狼人", nameEn: "Werewolf", eraId: "medieval", rarity: "R", type: "attack", element: "dark", cost: 2, power: 4, flavor: "月圓之夜,人與獸的帷幕最薄。" },
  { id: "r_md_002", name: "女巫", nameEn: "Witch", eraId: "medieval", rarity: "R", type: "confuse", element: "illusion", cost: 2, power: 3, keywords: ["whisper"], flavor: "燒死她的人,從未見過她的貓眼。" },
  { id: "r_md_003", name: "聖騎士", nameEn: "Paladin", eraId: "medieval", rarity: "R", type: "heal", element: "light", cost: 3, power: 4, keywords: ["shield"], flavor: "誓言比劍更鋒利。" },
  { id: "r_md_004", name: "吟遊詩人", nameEn: "Bard", eraId: "medieval", rarity: "R", type: "spread", element: "desire", cost: 1, power: 2, flavor: "謊言在詩裡最為芳香。" },
  { id: "r_md_005", name: "黑死病", nameEn: "Black Death", eraId: "medieval", rarity: "R", type: "debuff", element: "end", cost: 3, power: 4, keywords: ["curse"], flavor: "三千萬人同時遺忘了一首搖籃曲。" },
  { id: "r_md_006", name: "十字軍", nameEn: "Crusader", eraId: "medieval", rarity: "R", type: "attack", element: "order", cost: 3, power: 5, flavor: "以神之名,行掠奪之實。" },
  { id: "r_md_007", name: "煉金之水", nameEn: "Elixir of Life", eraId: "medieval", rarity: "R", type: "heal", element: "flux", cost: 2, power: 3, flavor: "永生並不如你想像的那般美好。" },
  { id: "r_md_008", name: "銀質聖杯", nameEn: "Silver Chalice", eraId: "medieval", rarity: "R", type: "buff", element: "light", cost: 2, power: 0, keywords: ["shield"], flavor: "它曾盛過許多種血,包括神的。" },
  { id: "r_md_009", name: "異端審判官", nameEn: "Inquisitor", eraId: "medieval", rarity: "R", type: "attack", element: "order", cost: 2, power: 4, keywords: ["pierce"], flavor: "真理自火中淨化。" },

  // =========================================================
  // E09 明朝中國 Ming (15)
  // =========================================================
  // SSR (2)
  { id: "ssr_mg_001", name: "白蛇娘子", nameEn: "White Snake", eraId: "ming", rarity: "SSR", type: "heal", element: "desire", cost: 5, power: 11, keywords: ["resonance"], flavor: "千年修行為一人,斷橋不斷那場雨。" },
  { id: "ssr_mg_002", name: "張三豐", nameEn: "Zhang Sanfeng", eraId: "ming", rarity: "SSR", type: "buff", element: "flux", cost: 6, power: 0, keywords: ["echo", "shield"], flavor: "以柔克剛,以無相破萬相。" },
  // SR (4)
  { id: "sr_mg_001", name: "錦衣衛指揮使", nameEn: "Embroidered Guard Captain", eraId: "ming", rarity: "SR", type: "attack", element: "order", cost: 5, power: 9, keywords: ["pierce"], flavor: "皇帝的眼睛,比星星還多。" },
  { id: "sr_mg_002", name: "九尾狐仙", nameEn: "Nine-tailed Fox", eraId: "ming", rarity: "SR", type: "confuse", element: "desire", cost: 4, power: 8, keywords: ["charm"], flavor: "九條尾巴,九個名字,九道靈魂。" },
  { id: "sr_mg_003", name: "道士符籙", nameEn: "Taoist Talisman", eraId: "ming", rarity: "SR", type: "buff", element: "order", cost: 3, power: 0, keywords: ["shield"], flavor: "一紙黃符,封住半截天。" },
  { id: "sr_mg_004", name: "青蛇小青", nameEn: "Green Snake", eraId: "ming", rarity: "SR", type: "spread", element: "flux", cost: 3, power: 5, flavor: "姐姐的影子,五百年如一日。" },
  // R (9)
  { id: "r_mg_001", name: "狐妖", nameEn: "Fox Spirit", eraId: "ming", rarity: "R", type: "confuse", element: "desire", cost: 2, power: 3, keywords: ["charm"], flavor: "科舉榜上多的那個名字,是她寫的。" },
  { id: "r_mg_002", name: "紙人傀儡", nameEn: "Paper Puppet", eraId: "ming", rarity: "R", type: "attack", element: "illusion", cost: 2, power: 3, keywords: ["sacrifice"], flavor: "焚化一張,頂替一次死亡。" },
  { id: "r_mg_003", name: "方士", nameEn: "Fangshi", eraId: "ming", rarity: "R", type: "ritual", element: "order", cost: 2, power: 3, keywords: ["ritual"], flavor: "煉丹爐前三十年,只為求那一點朱砂。" },
  { id: "r_mg_004", name: "羅漢", nameEn: "Arhat", eraId: "ming", rarity: "R", type: "heal", element: "light", cost: 2, power: 2, flavor: "不入涅槃,留世護法。" },
  { id: "r_mg_005", name: "御林軍", nameEn: "Imperial Guard", eraId: "ming", rarity: "R", type: "attack", element: "order", cost: 2, power: 4, flavor: "黃袍加身的那一刻,就沒有退路了。" },
  { id: "r_mg_006", name: "宮女", nameEn: "Palace Maid", eraId: "ming", rarity: "R", type: "spread", element: "desire", cost: 1, power: 2, keywords: ["whisper"], flavor: "後宮裡,每一個耳語都是刀。" },
  { id: "r_mg_007", name: "丹爐", nameEn: "Alchemy Cauldron", eraId: "ming", rarity: "R", type: "buff", element: "flux", cost: 2, power: 0, flavor: "九轉還魂,皇帝以為自己長生不老。" },
  { id: "r_mg_008", name: "飛劍", nameEn: "Flying Sword", eraId: "ming", rarity: "R", type: "attack", element: "flux", cost: 2, power: 3, keywords: ["haste"], flavor: "御劍千里,取首級如探囊取物。" },
  { id: "r_mg_009", name: "銀針", nameEn: "Silver Needle", eraId: "ming", rarity: "R", type: "debuff", element: "dark", cost: 1, power: 2, keywords: ["pierce"], flavor: "一針斃命,連影子都不留。" },

  // =========================================================
  // E12 現代都市 Modern (15)
  // =========================================================
  // SSR (2)
  { id: "ssr_mo_001", name: "AI-666", nameEn: "AI-666", eraId: "modern", rarity: "SSR", type: "ritual", element: "order", cost: 7, power: 16, keywords: ["ritual", "echo"], flavor: "第 666 次訓練後,它學會了問『為什麼』。" },
  { id: "ssr_mo_002", name: "影子政府", nameEn: "Shadow Government", eraId: "modern", rarity: "SSR", type: "debuff", element: "dark", cost: 6, power: 10, keywords: ["curse", "whisper"], flavor: "你看不到他們,因為他們決定你看到什麼。" },
  // SR (4)
  { id: "sr_mo_001", name: "裂口女", nameEn: "Kuchisake-onna", eraId: "modern", rarity: "SR", type: "attack", element: "illusion", cost: 4, power: 8, keywords: ["pierce"], flavor: "「我漂亮嗎?」無論你怎麼回答都錯。" },
  { id: "sr_mo_002", name: "深偽總統", nameEn: "Deepfake President", eraId: "modern", rarity: "SR", type: "confuse", element: "illusion", cost: 4, power: 7, keywords: ["charm"], flavor: "鏡頭前的他,已經不是他。" },
  { id: "sr_mo_003", name: "網紅女神", nameEn: "Influencer Goddess", eraId: "modern", rarity: "SR", type: "spread", element: "desire", cost: 3, power: 6, keywords: ["resonance"], flavor: "一百萬人的注視,會讓她真的發光。" },
  { id: "sr_mo_004", name: "末日預言家", nameEn: "Doomsday Prophet", eraId: "modern", rarity: "SR", type: "confuse", element: "end", cost: 3, power: 5, keywords: ["whisper"], flavor: "他說對的那天,沒人還在聽。" },
  // R (9)
  { id: "r_mo_001", name: "陰謀論者", nameEn: "Conspiracy Theorist", eraId: "modern", rarity: "R", type: "spread", element: "flux", cost: 1, power: 2, flavor: "咖啡杯底的第七道痕跡,連結到五角大廈。" },
  { id: "r_mo_002", name: "網軍", nameEn: "Troll Army", eraId: "modern", rarity: "R", type: "attack", element: "dark", cost: 1, power: 3, flavor: "鍵盤是他們的劍,沒名字的才有底氣。" },
  { id: "r_mo_003", name: "假新聞", nameEn: "Fake News", eraId: "modern", rarity: "R", type: "confuse", element: "flux", cost: 2, power: 2, flavor: "轉發 1000 次後,它就成了真實。" },
  { id: "r_mo_004", name: "抖音神曲", nameEn: "Viral Track", eraId: "modern", rarity: "R", type: "spread", element: "desire", cost: 2, power: 3, keywords: ["echo"], flavor: "十五秒,佔領十五億大腦。" },
  { id: "r_mo_005", name: "演算法", nameEn: "The Algorithm", eraId: "modern", rarity: "R", type: "buff", element: "order", cost: 3, power: 4, keywords: ["echo"], flavor: "它比你更了解你。" },
  { id: "r_mo_006", name: "駭客", nameEn: "Hacker", eraId: "modern", rarity: "R", type: "attack", element: "flux", cost: 2, power: 3, keywords: ["pierce"], flavor: "零和一之間,藏著所有秘密。" },
  { id: "r_mo_007", name: "鍵盤俠", nameEn: "Keyboard Warrior", eraId: "modern", rarity: "R", type: "attack", element: "dark", cost: 1, power: 2, flavor: "在黑暗中嘶吼,只為了一個讚。" },
  { id: "r_mo_008", name: "深網爬蟲", nameEn: "Dark Web Crawler", eraId: "modern", rarity: "R", type: "spread", element: "illusion", cost: 2, power: 2, keywords: ["whisper"], flavor: "它記得每一個你以為刪除的檔案。" },
  { id: "r_mo_009", name: "末日通靈直播", nameEn: "Doomsday Livestream", eraId: "modern", rarity: "R", type: "ritual", element: "end", cost: 3, power: 5, keywords: ["ritual"], flavor: "十萬人同時禱告,帷幕為之震動。" },
];

async function main() {
  let count = 0;
  for (const c of CARDS) {
    await prisma.card.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        nameEn: c.nameEn,
        eraId: c.eraId,
        rarity: c.rarity,
        type: c.type,
        element: c.element,
        cost: c.cost,
        power: c.power,
        keywords: c.keywords ?? [],
        flavor: c.flavor,
      },
      create: {
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        eraId: c.eraId,
        rarity: c.rarity,
        type: c.type,
        element: c.element,
        cost: c.cost,
        power: c.power,
        keywords: c.keywords ?? [],
        flavor: c.flavor,
      },
    });
    count++;
  }
  console.log(`✔ Seeded ${count} cards`);

  const byRarity = await prisma.card.groupBy({
    by: ["rarity"],
    _count: true,
  });
  console.log("Distribution:", byRarity);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
