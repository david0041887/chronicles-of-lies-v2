/**
 * Boss / prime-boss opening lines per era. Surfaced as a brief 2-second
 * overlay right after the battle curtain pulls back, so a boss fight
 * carries some narrative weight instead of just "name + HP bar".
 *
 * Lines are kept short (one sentence, ~12-30 characters) so they read
 * before the player has time to skip. Tone leans on the era's voice —
 * mythic for primitive/han, judicial for medieval, algorithmic for
 * modern — and stays consistent with the Veil Theory framing (you are
 * an editor of falsehoods, your enemies are guardians of stale ones).
 */

const BOSS_OPENERS: Record<string, { normal?: string; prime?: string }> = {
  primitive: {
    normal: "火光既落,影便起 — 我會把你的名字拖進無名之中。",
    prime: "在第一個謊言之前,我便已等候。",
  },
  mesopotamia: {
    normal: "諸神有名,凡人有命。你的名字該如何寫在泥板上?",
    prime: "巴別之塔崩落,不是因為太高 — 是因為有人聽見了真話。",
  },
  egypt: {
    normal: "心臟若比羽毛重,你的名字將被吞食。",
    prime: "來世也是我的領地 — 編織者,你還有多少呼吸?",
  },
  greek: {
    normal: "凡逆神諭者,皆走向自己的注定。",
    prime: "塔耳塔洛斯不饒恕逃避者,你的名字早已寫在底層。",
  },
  han: {
    normal: "真道無形,你卻執於形 — 此戰必敗。",
    prime: "九幽之下,真名不顯;你以何相見?",
  },
  norse: {
    normal: "英靈殿不收編織者。回去吧 — 或留下你的劍。",
    prime: "霜巨人從未死絕,他們只是等候你這樣的人。",
  },
  medieval: {
    normal: "以聖名之名 — 你的帷幕是異端。",
    prime: "地獄第七層,留給說真話的人。歡迎。",
  },
  sengoku: {
    normal: "百鬼正吟唱你的名字 — 你聽見了嗎?",
    prime: "夜淵深處,沒有編織者的位置。",
  },
  ming: {
    normal: "天命已盡,你還在編織什麼?",
    prime: "九重宮闕之外,謊言才是法律。",
  },
  modern: {
    normal: "演算法已預測你的下一步。",
    prime: "真相是過時的協議,我們已經升級。",
  },
};

export function getBossOpener(
  eraId: string,
  mode: "normal" | "prime",
): string | null {
  return BOSS_OPENERS[eraId]?.[mode] ?? null;
}
