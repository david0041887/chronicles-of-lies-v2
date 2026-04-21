import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  id: string;
  name: string;
  nameEn?: string;
  eraId:
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

  // =========================================================
  // E01 原始洪荒 Primitive (15)
  // =========================================================
  { id: "ssr_pr_001", name: "火盜", nameEn: "Firestealer", eraId: "primitive", rarity: "SSR", type: "attack", element: "light", cost: 6, power: 13, keywords: ["pierce"], flavor: "偷自天神的火焰,不曾熄滅。" },
  { id: "ssr_pr_002", name: "大洪水母", nameEn: "Flood Matriarch", eraId: "primitive", rarity: "SSR", type: "spread", element: "flux", cost: 6, power: 11, keywords: ["resonance"], flavor: "第一位母親,淹沒第一個世界。" },
  { id: "sr_pr_001", name: "薩滿王", nameEn: "Shaman King", eraId: "primitive", rarity: "SR", type: "buff", element: "order", cost: 4, power: 0, keywords: ["resonance"], flavor: "通靈之舞,連結祖先與未來。" },
  { id: "sr_pr_002", name: "第一個獵人", nameEn: "First Hunter", eraId: "primitive", rarity: "SR", type: "attack", element: "end", cost: 4, power: 8, keywords: ["pierce"], flavor: "弓與獵物的關係,早於言語。" },
  { id: "sr_pr_003", name: "洪荒巨木", nameEn: "Primordial Tree", eraId: "primitive", rarity: "SR", type: "heal", element: "light", cost: 4, power: 7, keywords: ["shield"], flavor: "根深入帷幕的源頭。" },
  { id: "sr_pr_004", name: "祖靈使者", nameEn: "Ancestor Envoy", eraId: "primitive", rarity: "SR", type: "ritual", element: "end", cost: 3, power: 6, keywords: ["ritual", "whisper"], flavor: "死者從未離去,只是等待被召喚。" },
  { id: "r_pr_001", name: "燧石", nameEn: "Flint Stone", eraId: "primitive", rarity: "R", type: "attack", element: "flux", cost: 1, power: 2, flavor: "一敲一火花,照亮原始黑夜。" },
  { id: "r_pr_002", name: "石斧", nameEn: "Stone Axe", eraId: "primitive", rarity: "R", type: "attack", element: "order", cost: 2, power: 4, flavor: "最古老的答案,也是最直接的。" },
  { id: "r_pr_003", name: "猛獁", nameEn: "Mammoth", eraId: "primitive", rarity: "R", type: "attack", element: "end", cost: 3, power: 5, flavor: "肉山倒下時,整個部落都在歡呼。" },
  { id: "r_pr_004", name: "野火", nameEn: "Wildfire", eraId: "primitive", rarity: "R", type: "debuff", element: "dark", cost: 2, power: 3, keywords: ["curse"], flavor: "火不只是工具,也是憤怒的神。" },
  { id: "r_pr_005", name: "骨笛", nameEn: "Bone Flute", eraId: "primitive", rarity: "R", type: "confuse", element: "illusion", cost: 2, power: 2, flavor: "用祖先的骨頭吹出的音調,能迷惑獸群。" },
  { id: "r_pr_006", name: "圖騰柱", nameEn: "Totem Pole", eraId: "primitive", rarity: "R", type: "buff", element: "order", cost: 2, power: 0, keywords: ["shield"], flavor: "刻上神獸,族人便獲其力。" },
  { id: "r_pr_007", name: "壁畫獵物", nameEn: "Cave Painting Beast", eraId: "primitive", rarity: "R", type: "spread", element: "illusion", cost: 2, power: 3, flavor: "畫下的獵物,第二天真的出現。" },
  { id: "r_pr_008", name: "野人", nameEn: "Wild Tribesman", eraId: "primitive", rarity: "R", type: "attack", element: "desire", cost: 1, power: 3, keywords: ["haste"], flavor: "未命名的憤怒,赤足而行。" },
  { id: "r_pr_009", name: "祖靈面具", nameEn: "Spirit Mask", eraId: "primitive", rarity: "R", type: "debuff", element: "illusion", cost: 2, power: 3, flavor: "戴上它的人,說的不再是自己的話。" },

  // =========================================================
  // E02 美索不達米亞 Mesopotamia (15)
  // =========================================================
  { id: "ssr_me_001", name: "伊絲塔", nameEn: "Ishtar", eraId: "mesopotamia", rarity: "SSR", type: "attack", element: "desire", cost: 6, power: 13, keywords: ["charm"], flavor: "愛之矢穿心,戰之矢穿城。" },
  { id: "ssr_me_002", name: "吉爾伽美什", nameEn: "Gilgamesh", eraId: "mesopotamia", rarity: "SSR", type: "buff", element: "order", cost: 6, power: 0, keywords: ["resonance", "shield"], flavor: "尋找永生的王,最終明白時間就是敵人。" },
  { id: "sr_me_001", name: "恩奇都", nameEn: "Enkidu", eraId: "mesopotamia", rarity: "SR", type: "attack", element: "end", cost: 5, power: 9, flavor: "自森林而生的野人,為王而死的朋友。" },
  { id: "sr_me_002", name: "馬杜克", nameEn: "Marduk", eraId: "mesopotamia", rarity: "SR", type: "attack", element: "light", cost: 5, power: 8, keywords: ["pierce"], flavor: "劈開提亞馬特,以屍骨造就天地。" },
  { id: "sr_me_003", name: "烏爾大祭司", nameEn: "High Priest of Ur", eraId: "mesopotamia", rarity: "SR", type: "ritual", element: "order", cost: 4, power: 6, keywords: ["ritual"], flavor: "泥板上的每一道咒語,都在改寫宇宙。" },
  { id: "sr_me_004", name: "獅龍", nameEn: "Mushussu", eraId: "mesopotamia", rarity: "SR", type: "debuff", element: "dark", cost: 4, power: 7, keywords: ["curse"], flavor: "巴比倫城門的守獸,獅爪蛇身鷹尾。" },
  { id: "r_me_001", name: "楔形文字", nameEn: "Cuneiform", eraId: "mesopotamia", rarity: "R", type: "spread", element: "order", cost: 1, power: 2, keywords: ["whisper"], flavor: "最古老的謊言,刻在泥裡更加堅硬。" },
  { id: "r_me_002", name: "泥板占卜", nameEn: "Clay Tablet Oracle", eraId: "mesopotamia", rarity: "R", type: "ritual", element: "flux", cost: 2, power: 3, flavor: "燒製的泥板,比記憶可靠。" },
  { id: "r_me_003", name: "獸首守衛", nameEn: "Lamassu", eraId: "mesopotamia", rarity: "R", type: "buff", element: "order", cost: 3, power: 4, keywords: ["shield"], flavor: "人首獸身,守護宮門千年。" },
  { id: "r_me_004", name: "巴別塔匠人", nameEn: "Babel Mason", eraId: "mesopotamia", rarity: "R", type: "spread", element: "flux", cost: 2, power: 3, flavor: "堆砌的每塊磚,都是通天的謊言。" },
  { id: "r_me_005", name: "星象師", nameEn: "Astrologer", eraId: "mesopotamia", rarity: "R", type: "buff", element: "illusion", cost: 2, power: 2, keywords: ["whisper"], flavor: "最早的星圖,同時也是最早的咒文。" },
  { id: "r_me_006", name: "烏爾之獅", nameEn: "Lion of Ur", eraId: "mesopotamia", rarity: "R", type: "attack", element: "desire", cost: 2, power: 4, flavor: "烏爾國王的獵物,也是戰爭之神的坐騎。" },
  { id: "r_me_007", name: "雪松林", nameEn: "Cedar Grove", eraId: "mesopotamia", rarity: "R", type: "heal", element: "light", cost: 2, power: 3, flavor: "神所鍾愛的聖林,被斬倒時世界為之顫抖。" },
  { id: "r_me_008", name: "巫醫", nameEn: "Akkadian Healer", eraId: "mesopotamia", rarity: "R", type: "heal", element: "light", cost: 2, power: 3, flavor: "以草藥與咒語,驅散病魔。" },
  { id: "r_me_009", name: "黑曜石匕首", nameEn: "Obsidian Dagger", eraId: "mesopotamia", rarity: "R", type: "attack", element: "dark", cost: 1, power: 2, keywords: ["pierce"], flavor: "獻祭神明的刃,比神更鋒利。" },

  // =========================================================
  // E04 古希臘 Greek (15)
  // =========================================================
  { id: "ssr_gr_001", name: "美杜莎", nameEn: "Medusa", eraId: "greek", rarity: "SSR", type: "debuff", element: "dark", cost: 5, power: 11, keywords: ["curse"], flavor: "她的頭髮不是蛇,是她看穿過的所有目光。" },
  { id: "ssr_gr_002", name: "赫卡忒", nameEn: "Hecate", eraId: "greek", rarity: "SSR", type: "ritual", element: "illusion", cost: 6, power: 12, keywords: ["ritual", "echo"], flavor: "三面女神,同時立於三界之門。" },
  { id: "sr_gr_001", name: "奧菲斯", nameEn: "Orpheus", eraId: "greek", rarity: "SR", type: "heal", element: "desire", cost: 4, power: 7, flavor: "琴聲說服了冥王,卻說服不了自己不回頭。" },
  { id: "sr_gr_002", name: "阿波羅", nameEn: "Apollo", eraId: "greek", rarity: "SR", type: "attack", element: "light", cost: 5, power: 9, flavor: "光明、音樂、預言三位一體的神。" },
  { id: "sr_gr_003", name: "赫密士", nameEn: "Hermes", eraId: "greek", rarity: "SR", type: "spread", element: "flux", cost: 3, power: 5, keywords: ["haste", "whisper"], flavor: "諸神的信使,謊言與真實之間的邊界。" },
  { id: "sr_gr_004", name: "雅典娜之梟", nameEn: "Athena's Owl", eraId: "greek", rarity: "SR", type: "confuse", element: "illusion", cost: 3, power: 5, keywords: ["whisper"], flavor: "智慧女神的眼睛,總在暗中注視。" },
  { id: "r_gr_001", name: "米諾陶", nameEn: "Minotaur", eraId: "greek", rarity: "R", type: "attack", element: "dark", cost: 2, power: 4, flavor: "迷宮之心的野獸,也是國王的恥辱。" },
  { id: "r_gr_002", name: "賽倫", nameEn: "Siren", eraId: "greek", rarity: "R", type: "confuse", element: "desire", cost: 2, power: 3, keywords: ["charm"], flavor: "歌聲美得足以讓水手自沉。" },
  { id: "r_gr_003", name: "獨眼巨人", nameEn: "Cyclops", eraId: "greek", rarity: "R", type: "attack", element: "end", cost: 3, power: 5, flavor: "鐵匠之神的打鐵夥伴,亦是英雄的惡夢。" },
  { id: "r_gr_004", name: "哈耳庇厄", nameEn: "Harpy", eraId: "greek", rarity: "R", type: "attack", element: "flux", cost: 2, power: 3, keywords: ["haste"], flavor: "翼如刀,爪如鉤,饑餓如宙斯的怒。" },
  { id: "r_gr_005", name: "蛇髮絲", nameEn: "Serpent Lock", eraId: "greek", rarity: "R", type: "debuff", element: "dark", cost: 1, power: 2, keywords: ["curse"], flavor: "從蛇頭落下的一根絲,仍能石化。" },
  { id: "r_gr_006", name: "三頭犬", nameEn: "Cerberus", eraId: "greek", rarity: "R", type: "attack", element: "end", cost: 3, power: 5, keywords: ["pierce"], flavor: "冥府門衛,吠聲可使活人失心。" },
  { id: "r_gr_007", name: "命運三女神", nameEn: "The Fates", eraId: "greek", rarity: "R", type: "ritual", element: "order", cost: 3, power: 4, keywords: ["ritual"], flavor: "紡紗、量尺、剪線,縱是宙斯也躲不過。" },
  { id: "r_gr_008", name: "酒神", nameEn: "Dionysus", eraId: "greek", rarity: "R", type: "confuse", element: "desire", cost: 2, power: 3, flavor: "狂宴與瘋狂之神,真理只在醉者舌尖。" },
  { id: "r_gr_009", name: "神諭女祭司", nameEn: "Oracle of Delphi", eraId: "greek", rarity: "R", type: "spread", element: "illusion", cost: 2, power: 2, keywords: ["whisper"], flavor: "蒸氣升起,謎語落下。" },

  // =========================================================
  // E05 大漢王朝 Han (15)
  // =========================================================
  { id: "ssr_ha_001", name: "嫦娥", nameEn: "Chang'e", eraId: "han", rarity: "SSR", type: "heal", element: "light", cost: 5, power: 11, keywords: ["resonance"], flavor: "吞下仙藥那一刻,她成了月亮。" },
  { id: "ssr_ha_002", name: "蚩尤", nameEn: "Chiyou", eraId: "han", rarity: "SSR", type: "attack", element: "end", cost: 7, power: 15, keywords: ["pierce", "curse"], flavor: "銅頭鐵額,八十一弟兄,戰神的原型。" },
  { id: "sr_ha_001", name: "西王母", nameEn: "Queen Mother of the West", eraId: "han", rarity: "SR", type: "buff", element: "order", cost: 5, power: 0, keywords: ["resonance"], flavor: "崑崙山主,蟠桃園的主人。" },
  { id: "sr_ha_002", name: "東皇太一", nameEn: "Tai Yi", eraId: "han", rarity: "SR", type: "attack", element: "light", cost: 5, power: 10, flavor: "至高天帝,星宿之主。" },
  { id: "sr_ha_003", name: "白虎", nameEn: "White Tiger", eraId: "han", rarity: "SR", type: "attack", element: "order", cost: 4, power: 7, keywords: ["pierce"], flavor: "西方七宿之神,秋氣殺戮。" },
  { id: "sr_ha_004", name: "煉丹方士", nameEn: "Fangshi Alchemist", eraId: "han", rarity: "SR", type: "ritual", element: "flux", cost: 3, power: 5, keywords: ["ritual"], flavor: "九轉還魂丹,煉的是皇帝的欲望。" },
  { id: "r_ha_001", name: "夸父", nameEn: "Kua Fu", eraId: "han", rarity: "R", type: "attack", element: "light", cost: 2, power: 4, flavor: "逐日不成,化身為林。" },
  { id: "r_ha_002", name: "后羿", nameEn: "Hou Yi", eraId: "han", rarity: "R", type: "attack", element: "order", cost: 3, power: 5, keywords: ["pierce"], flavor: "射下九日的英雄,最終被徒弟所殺。" },
  { id: "r_ha_003", name: "玄武", nameEn: "Black Tortoise", eraId: "han", rarity: "R", type: "heal", element: "order", cost: 3, power: 4, keywords: ["shield"], flavor: "北方七宿之神,水與冬的主宰。" },
  { id: "r_ha_004", name: "青龍", nameEn: "Azure Dragon", eraId: "han", rarity: "R", type: "attack", element: "flux", cost: 3, power: 5, flavor: "東方七宿之神,春雷與生機。" },
  { id: "r_ha_005", name: "朱雀", nameEn: "Vermilion Bird", eraId: "han", rarity: "R", type: "attack", element: "desire", cost: 3, power: 5, flavor: "南方七宿之神,火與夏日。" },
  { id: "r_ha_006", name: "銅鏡", nameEn: "Bronze Mirror", eraId: "han", rarity: "R", type: "confuse", element: "illusion", cost: 2, power: 2, flavor: "照妖的鏡子,也映出使用者的心。" },
  { id: "r_ha_007", name: "五帝", nameEn: "Five Emperors", eraId: "han", rarity: "R", type: "buff", element: "order", cost: 2, power: 3, flavor: "黃、青、赤、白、黑,五方之帝。" },
  { id: "r_ha_008", name: "巫蠱娃娃", nameEn: "Gu Doll", eraId: "han", rarity: "R", type: "debuff", element: "dark", cost: 2, power: 3, keywords: ["curse"], flavor: "咒術娃娃,一針一世的詛咒。" },
  { id: "r_ha_009", name: "魔星", nameEn: "Demon Star", eraId: "han", rarity: "R", type: "spread", element: "flux", cost: 1, power: 2, flavor: "異星出現之夜,王朝必有大亂。" },

  // =========================================================
  // E06 北歐維京 Norse (15)
  // =========================================================
  { id: "ssr_no_001", name: "奧丁", nameEn: "Odin", eraId: "norse", rarity: "SSR", type: "buff", element: "order", cost: 6, power: 12, keywords: ["whisper", "resonance"], flavor: "以一眼換智慧,仍看不清自己的死。" },
  { id: "ssr_no_002", name: "洛基", nameEn: "Loki", eraId: "norse", rarity: "SSR", type: "confuse", element: "illusion", cost: 5, power: 10, keywords: ["charm", "echo"], flavor: "諸神的玩笑,也是末日的配方。" },
  { id: "sr_no_001", name: "托爾", nameEn: "Thor", eraId: "norse", rarity: "SR", type: "attack", element: "light", cost: 5, power: 10, keywords: ["pierce"], flavor: "錘聲即雷鳴,雷鳴即審判。" },
  { id: "sr_no_002", name: "海拉", nameEn: "Hel", eraId: "norse", rarity: "SR", type: "debuff", element: "end", cost: 5, power: 8, keywords: ["curse"], flavor: "冥界女王,左半身美、右半身朽。" },
  { id: "sr_no_003", name: "瓦爾基麗", nameEn: "Valkyrie", eraId: "norse", rarity: "SR", type: "attack", element: "light", cost: 4, power: 8, flavor: "戰場上撿選亡靈,送上英靈殿。" },
  { id: "sr_no_004", name: "芬里爾", nameEn: "Fenrir", eraId: "norse", rarity: "SR", type: "attack", element: "dark", cost: 5, power: 9, keywords: ["curse"], flavor: "被鎖著的狼,諸神黃昏時將吞噬奧丁。" },
  { id: "r_no_001", name: "渡鴉", nameEn: "Raven", eraId: "norse", rarity: "R", type: "spread", element: "flux", cost: 1, power: 2, keywords: ["whisper"], flavor: "飛遍九界,向奧丁彙報。" },
  { id: "r_no_002", name: "符文石", nameEn: "Rune Stone", eraId: "norse", rarity: "R", type: "ritual", element: "order", cost: 2, power: 3, keywords: ["ritual"], flavor: "雕刻於石的字母,每一個都是咒語。" },
  { id: "r_no_003", name: "世界之樹", nameEn: "Yggdrasil", eraId: "norse", rarity: "R", type: "heal", element: "light", cost: 3, power: 4, keywords: ["shield"], flavor: "九界的根,從不會枯死。" },
  { id: "r_no_004", name: "冰霜巨人", nameEn: "Frost Giant", eraId: "norse", rarity: "R", type: "attack", element: "end", cost: 3, power: 5, flavor: "宇宙最早的存在,霜與虛空之子。" },
  { id: "r_no_005", name: "北歐戰士", nameEn: "Viking Warrior", eraId: "norse", rarity: "R", type: "attack", element: "desire", cost: 2, power: 4, keywords: ["haste"], flavor: "死於劍下才算榮耀。" },
  { id: "r_no_006", name: "耶夢加得", nameEn: "Jormungandr", eraId: "norse", rarity: "R", type: "attack", element: "dark", cost: 3, power: 5, keywords: ["curse"], flavor: "環繞中土的巨蛇,與托爾的宿敵。" },
  { id: "r_no_007", name: "瓦爾哈拉門", nameEn: "Valhalla Gate", eraId: "norse", rarity: "R", type: "buff", element: "order", cost: 2, power: 0, keywords: ["shield"], flavor: "英靈殿的門,只向勇者開啟。" },
  { id: "r_no_008", name: "敬畏頭盔", nameEn: "Helm of Awe", eraId: "norse", rarity: "R", type: "buff", element: "illusion", cost: 2, power: 0, flavor: "戴上它,敵人見你即膽寒。" },
  { id: "r_no_009", name: "北歐盾牌", nameEn: "Viking Shield", eraId: "norse", rarity: "R", type: "heal", element: "order", cost: 2, power: 2, keywords: ["shield"], flavor: "圓木包鐵,擋過無數冬日與刀。" },

  // =========================================================
  // E08 日本戰國 Sengoku (15)
  // =========================================================
  { id: "ssr_se_001", name: "安倍晴明", nameEn: "Abe no Seimei", eraId: "sengoku", rarity: "SSR", type: "ritual", element: "order", cost: 6, power: 12, keywords: ["ritual", "whisper"], flavor: "平安京最強陰陽師,人狐所生。" },
  { id: "ssr_se_002", name: "酒吞童子", nameEn: "Shuten Doji", eraId: "sengoku", rarity: "SSR", type: "attack", element: "dark", cost: 6, power: 13, keywords: ["pierce"], flavor: "大江山鬼王,被斬首後仍咒罵三日。" },
  { id: "sr_se_001", name: "玉藻前", nameEn: "Tamamo-no-Mae", eraId: "sengoku", rarity: "SR", type: "confuse", element: "desire", cost: 5, power: 9, keywords: ["charm"], flavor: "九條尾巴,九世身分,最近一世是宮女。" },
  { id: "sr_se_002", name: "土蜘蛛", nameEn: "Tsuchigumo", eraId: "sengoku", rarity: "SR", type: "ritual", element: "dark", cost: 4, power: 7, keywords: ["ritual"], flavor: "山中結網的妖,吃過武將的魂。" },
  { id: "sr_se_003", name: "座敷童子", nameEn: "Zashiki Warashi", eraId: "sengoku", rarity: "SR", type: "confuse", element: "illusion", cost: 3, power: 5, flavor: "屋敷的幽童,帶來好運或厄運。" },
  { id: "sr_se_004", name: "人魂", nameEn: "Hitodama", eraId: "sengoku", rarity: "SR", type: "spread", element: "end", cost: 3, power: 4, keywords: ["echo"], flavor: "亡者的靈火,夜半飄過稻田。" },
  { id: "r_se_001", name: "妖刀", nameEn: "Cursed Katana", eraId: "sengoku", rarity: "R", type: "attack", element: "dark", cost: 2, power: 4, keywords: ["pierce"], flavor: "刀有名,名招禍,禍不斷。" },
  { id: "r_se_002", name: "付喪神", nameEn: "Tsukumogami", eraId: "sengoku", rarity: "R", type: "buff", element: "illusion", cost: 2, power: 3, flavor: "百年老物,自行生神,不可輕易丟棄。" },
  { id: "r_se_003", name: "河童", nameEn: "Kappa", eraId: "sengoku", rarity: "R", type: "attack", element: "flux", cost: 2, power: 3, flavor: "頭頂碟子乾枯,力氣全失。" },
  { id: "r_se_004", name: "天狗", nameEn: "Tengu", eraId: "sengoku", rarity: "R", type: "attack", element: "flux", cost: 3, power: 5, keywords: ["haste"], flavor: "山中修行者的墮落形態,羽扇生風。" },
  { id: "r_se_005", name: "化貓", nameEn: "Bakeneko", eraId: "sengoku", rarity: "R", type: "confuse", element: "desire", cost: 2, power: 3, keywords: ["charm"], flavor: "老貓成妖,能說人話、行人事。" },
  { id: "r_se_006", name: "紅燈籠鬼", nameEn: "Chochin Obake", eraId: "sengoku", rarity: "R", type: "confuse", element: "illusion", cost: 1, power: 2, flavor: "破舊燈籠開了眼睛,要人做伴。" },
  { id: "r_se_007", name: "骸骨武士", nameEn: "Skeleton Samurai", eraId: "sengoku", rarity: "R", type: "attack", element: "end", cost: 2, power: 4, flavor: "戰死沙場的武士,不願離去。" },
  { id: "r_se_008", name: "井戶姬", nameEn: "Well Maiden", eraId: "sengoku", rarity: "R", type: "debuff", element: "dark", cost: 2, power: 3, keywords: ["curse"], flavor: "井底的女鬼,叫喚路人名字。" },
  { id: "r_se_009", name: "牛鬼", nameEn: "Ushi-oni", eraId: "sengoku", rarity: "R", type: "attack", element: "dark", cost: 3, power: 5, flavor: "牛頭鬼身,出沒於海岸與山寺。" },
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
