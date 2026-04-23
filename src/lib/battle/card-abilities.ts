import type { BattleState, Minion, SideState } from "./types";

/**
 * Per-card ability registry — YGO/Hearthstone-style.
 *
 * Each card can declare abilities keyed by trigger. Engine fires them at
 * the right moment:
 *   battlecry      — on summon (right after the minion hits the board)
 *   deathrattle    — on death (just before being removed)
 *   end_of_turn    — at the end of the owner's turn
 *   start_of_turn  — at the start of the owner's turn
 *   on_attack      — after this minion attacks (target already resolved)
 *   on_damaged     — after this minion takes damage but before death check
 *
 * The framework is open: add a new trigger + effect kind + handler call
 * inside the engine and every card auto-benefits. Signature cards can
 * opt in by registering entries in CARD_ABILITIES below; most cards use
 * the rarity/type-derived defaults in the enrichment layer.
 */

export type AbilityTrigger =
  | "battlecry"
  | "deathrattle"
  | "end_of_turn"
  | "start_of_turn"
  | "on_attack"
  | "on_damaged";

export interface AbilityContext {
  state: BattleState;
  sideName: "player" | "enemy";
  self: SideState;
  other: SideState;
  source: Minion; // the minion whose ability is firing
}

export interface CardAbility {
  trigger: AbilityTrigger;
  effect: (ctx: AbilityContext) => void;
  /** Human-readable description shown on card preview. */
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Effect helpers — reusable ability bodies.
// ─────────────────────────────────────────────────────────────────────────

function log(ctx: AbilityContext, text: string, kind: "buff" | "debuff" | "damage" | "heal" = "buff") {
  ctx.state.log.push({
    turn: ctx.state.turn,
    side: ctx.sideName,
    kind,
    text,
  });
}

function damageEnemyFace(ctx: AbilityContext, amount: number) {
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg === 0) return;
  ctx.other.hp = Math.max(0, ctx.other.hp - dmg);
  log(ctx, `${ctx.source.name} 直擊 ${ctx.other.name} −${dmg}`, "damage");
}

function damageAllEnemyMinions(ctx: AbilityContext, amount: number) {
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg === 0) return;
  for (const m of ctx.other.board) {
    if (m.shielded) {
      m.shielded = false;
    } else {
      m.hp -= dmg;
    }
  }
  if (ctx.other.board.length > 0) {
    log(ctx, `${ctx.source.name} 群體波及 ${dmg} 傷害`, "damage");
  }
}

function damageRandomEnemyMinion(ctx: AbilityContext, amount: number) {
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg === 0 || ctx.other.board.length === 0) return;
  const target = ctx.other.board[Math.floor(Math.random() * ctx.other.board.length)];
  if (target.shielded) {
    target.shielded = false;
    log(ctx, `${target.name} 聖盾吸收`, "buff");
  } else {
    target.hp -= dmg;
    log(ctx, `${ctx.source.name} → ${target.name} ${dmg} 傷害`, "damage");
  }
}

function healFriendlyFace(ctx: AbilityContext, amount: number) {
  const before = ctx.self.hp;
  ctx.self.hp = Math.min(ctx.self.hpMax, ctx.self.hp + amount);
  const got = ctx.self.hp - before;
  if (got > 0) {
    log(ctx, `${ctx.source.name} 回復 +${got} 信徒`, "heal");
  }
}

function buffRandomFriendlyMinion(
  ctx: AbilityContext,
  atk: number,
  hp: number,
) {
  const others = ctx.self.board.filter((m) => m.uid !== ctx.source.uid);
  if (others.length === 0) return;
  const target = others[Math.floor(Math.random() * others.length)];
  target.atk += atk;
  target.hpMax += hp;
  target.hp += hp;
  log(ctx, `${target.name} +${atk}/+${hp}`, "buff");
}

function buffAllFriendlyMinions(
  ctx: AbilityContext,
  atk: number,
  hp: number,
) {
  for (const m of ctx.self.board) {
    if (m.uid === ctx.source.uid) continue;
    m.atk += atk;
    m.hpMax += hp;
    m.hp += hp;
  }
  if (ctx.self.board.length > 1) {
    log(ctx, `${ctx.source.name} 號令友軍 +${atk}/+${hp}`, "buff");
  }
}

function drawCards(ctx: AbilityContext, count: number) {
  for (let i = 0; i < count; i++) {
    if (ctx.self.hand.length >= 5) break;
    if (ctx.self.deck.length === 0 && ctx.self.discard.length > 0) {
      ctx.self.deck = [...ctx.self.discard];
      ctx.self.discard = [];
    }
    const card = ctx.self.deck.shift();
    if (!card) break;
    ctx.self.hand.push(card);
  }
  log(ctx, `${ctx.source.name} 抽 ${count} 張牌`);
}

function applyPoisonEnemyFace(ctx: AbilityContext, stacks: number) {
  ctx.other.poison = Math.min(10, ctx.other.poison + stacks);
  log(ctx, `${ctx.other.name} 中毒 +${stacks} 疊`, "debuff");
}

function applyVulnerableEnemyFace(ctx: AbilityContext, turns: number) {
  ctx.other.vulnerableTurns = Math.max(ctx.other.vulnerableTurns, turns);
  log(ctx, `${ctx.other.name} 破綻 ${turns} 回`, "debuff");
}

function gainMana(ctx: AbilityContext, amount: number) {
  ctx.self.mana = Math.min(ctx.self.manaCeiling, ctx.self.mana + amount);
  log(ctx, `${ctx.source.name} 祈禱獲得 +${amount} 信仰`);
}

function silenceRandomEnemyMinion(ctx: AbilityContext) {
  if (ctx.other.board.length === 0) return;
  const target = ctx.other.board[Math.floor(Math.random() * ctx.other.board.length)];
  silenceMinion(ctx, target);
}

function silenceMinion(ctx: AbilityContext, target: Minion) {
  target.keywords = target.keywords.filter(
    (k) =>
      k !== "taunt" &&
      k !== "divine_shield" &&
      k !== "windfury" &&
      k !== "lifesteal" &&
      k !== "pierce",
  );
  target.shielded = false;
  log(ctx, `${target.name} 被沈默`, "debuff");
}

function silenceAllEnemyMinions(ctx: AbilityContext) {
  for (const m of ctx.other.board) silenceMinion(ctx, m);
}

function damageAllMinions(ctx: AbilityContext, amount: number) {
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg === 0) return;
  for (const m of [...ctx.self.board, ...ctx.other.board]) {
    if (m.uid === ctx.source.uid) continue;
    if (m.shielded) {
      m.shielded = false;
    } else {
      m.hp -= dmg;
    }
  }
  log(ctx, `${ctx.source.name} 波及全場 ${dmg} 傷害`, "damage");
}

function healAllFriendlyMinions(ctx: AbilityContext, amount: number) {
  for (const m of ctx.self.board) {
    m.hp = Math.min(m.hpMax, m.hp + amount);
  }
  if (ctx.self.board.length > 0) {
    log(ctx, `${ctx.source.name} 治癒友軍 +${amount}`, "heal");
  }
}

function divineShieldAllFriendly(ctx: AbilityContext) {
  let count = 0;
  for (const m of ctx.self.board) {
    if (!m.shielded) {
      m.shielded = true;
      count++;
    }
  }
  if (count > 0) log(ctx, `${count} 位友軍獲得聖盾`, "buff");
}

function freezeAllEnemyMinions(ctx: AbilityContext) {
  let count = 0;
  for (const m of ctx.other.board) {
    if (m.attacksRemaining > 0) {
      m.attacksRemaining = 0;
      count++;
    }
  }
  if (count > 0) log(ctx, `${count} 位敵軍凍結,本回合無法再攻擊`, "debuff");
}

function applyCurseEnemyFace(ctx: AbilityContext, stacks: number) {
  ctx.other.curseStacks += stacks;
  log(ctx, `${ctx.other.name} 詛咒 +${stacks} 疊`, "debuff");
}

function gainManaCeiling(ctx: AbilityContext, amount: number) {
  const before = ctx.self.manaCeiling;
  ctx.self.manaCeiling = Math.min(15, ctx.self.manaCeiling + amount);
  const delta = ctx.self.manaCeiling - before;
  if (delta > 0) {
    ctx.self.manaMax = Math.min(ctx.self.manaCeiling, ctx.self.manaMax + delta);
    ctx.self.mana = Math.min(ctx.self.manaMax, ctx.self.mana + delta);
    log(ctx, `${ctx.source.name} 擴展信仰池上限 +${delta}`, "buff");
  }
}

function cleanseSelf(ctx: AbilityContext) {
  ctx.self.poison = 0;
  ctx.self.vulnerableTurns = 0;
  ctx.self.weakTurns = 0;
  ctx.self.curseStacks = 0;
  ctx.self.confusedTurns = 0;
  log(ctx, `${ctx.source.name} 聖光淨化所有負面狀態`, "buff");
}

function damageFacePerEnemyMinion(ctx: AbilityContext, perMinion: number) {
  const n = ctx.other.board.length;
  if (n === 0) return;
  damageEnemyFace(ctx, n * perMinion);
}

function sacrificeSelfDamage(ctx: AbilityContext, amount: number) {
  ctx.self.hp = Math.max(1, ctx.self.hp - amount);
  log(ctx, `${ctx.source.name} 自損 ${amount} 信徒`, "damage");
}

function revealEnemyHand(ctx: AbilityContext) {
  if (ctx.other.hand.length === 0) return;
  const names = ctx.other.hand.map((c) => c.name).join(", ");
  log(ctx, `👁️‍🗨️ 窺見對方手牌:${names}`, "buff");
}

function summonToken(ctx: AbilityContext, name: string, atk: number, hp: number, keywords: string[] = []) {
  if (ctx.self.board.length >= 5) return;
  const token: Minion = {
    uid: `tok-${ctx.state.turn}-${Math.random().toString(36).slice(2, 8)}`,
    cardId: "__token__",
    name,
    rarity: "R",
    eraId: ctx.source.eraId,
    hpMax: hp,
    hp,
    atk,
    keywords: [...keywords],
    summonedThisTurn: true,
    attacksRemaining: keywords.includes("charge") ? 1 : 0,
    shielded: keywords.includes("divine_shield"),
  };
  ctx.self.board.push(token);
  log(ctx, `召喚衍生物 ${name}(${atk}/${hp})`, "buff");
}

// ─────────────────────────────────────────────────────────────────────────
// Signature card effects — YGO/Hearthstone-style unique abilities.
// Add more over time; cards without an entry here just use their enriched
// keyword set.
// ─────────────────────────────────────────────────────────────────────────

export const CARD_ABILITIES: Record<string, CardAbility[]> = {
  // Egypt — Anubis: weighs souls, poisons the enemy face on summon
  ssr_eg_001: [
    {
      trigger: "battlecry",
      description: "戰吼:讓對方中毒 4 疊(心若過重,毒如細沙)",
      effect: (ctx) => applyPoisonEnemyFace(ctx, 4),
    },
  ],
  // Egypt — Isis: heals friendly face on death (raised her brother)
  ssr_eg_002: [
    {
      trigger: "deathrattle",
      description: "亡語:回復我方 8 點信徒(魔法之母,起死回生)",
      effect: (ctx) => healFriendlyFace(ctx, 8),
    },
  ],
  // Medieval — Dracula: on attack, heals himself for damage dealt to face (already has lifesteal but this is extra for his own damage)
  ssr_md_001: [
    {
      trigger: "battlecry",
      description: "戰吼:敵方失 3 血,我方回復 3 信徒",
      effect: (ctx) => {
        damageEnemyFace(ctx, 3);
        healFriendlyFace(ctx, 3);
      },
    },
  ],
  // Medieval — Merlin: draws cards (knows the future)
  ssr_md_002: [
    {
      trigger: "battlecry",
      description: "戰吼:抽 2 張牌(以倒序活著,預先得知)",
      effect: (ctx) => drawCards(ctx, 2),
    },
  ],
  // Ming — White Snake: heals all friendly minions on end of turn
  ssr_mg_001: [
    {
      trigger: "end_of_turn",
      description: "回合結束:所有友軍 +0/+2(斷橋相遇)",
      effect: (ctx) => {
        for (const m of ctx.self.board) {
          if (m.uid === ctx.source.uid) continue;
          m.hpMax += 2;
          m.hp += 2;
        }
      },
    },
  ],
  // Ming — Zhang Sanfeng: on damaged, damage attacker (reflect)
  ssr_mg_002: [
    {
      trigger: "start_of_turn",
      description: "回合開始:所有友軍 +1/+0(以柔克剛)",
      effect: (ctx) => buffAllFriendlyMinions(ctx, 1, 0),
    },
  ],
  // Modern — AI-666: on summon, silence a random enemy minion
  ssr_mo_001: [
    {
      trigger: "battlecry",
      description: "戰吼:沉默一隻隨機敵方怪物(演算法壓制)",
      effect: (ctx) => silenceRandomEnemyMinion(ctx),
    },
  ],
  // Modern — Shadow Government: whispers, steal a card (simplified: draws for self)
  ssr_mo_002: [
    {
      trigger: "battlecry",
      description: "戰吼:敵方失 2 血 · 我方抽 1 張(暗中操作)",
      effect: (ctx) => {
        damageEnemyFace(ctx, 2);
        drawCards(ctx, 1);
      },
    },
  ],
  // Primitive — Firestealer: deals 2 splash to all enemy minions
  ssr_pr_001: [
    {
      trigger: "battlecry",
      description: "戰吼:敵方所有怪物 −2 HP(火焰蔓延)",
      effect: (ctx) => damageAllEnemyMinions(ctx, 2),
    },
  ],
  // Mesopotamia — Ishtar: on attack, apply vulnerable to enemy face
  ssr_me_001: [
    {
      trigger: "on_attack",
      description: "攻擊後:敵方破綻 2 回合(愛之矢穿心)",
      effect: (ctx) => applyVulnerableEnemyFace(ctx, 2),
    },
  ],
  // Greek — Medusa: deathrattle damages all enemy minions
  ssr_gr_001: [
    {
      trigger: "deathrattle",
      description: "亡語:敵方所有怪物 −3 HP(最後一眼)",
      effect: (ctx) => damageAllEnemyMinions(ctx, 3),
    },
  ],
  // Greek — Hecate: start of turn gives +1 mana (ritual magic)
  ssr_gr_002: [
    {
      trigger: "start_of_turn",
      description: "回合開始:獲得 +1 信仰池(三面咒術)",
      effect: (ctx) => gainMana(ctx, 1),
    },
  ],
  // Han — Chang'e: on summon heal 8 + draw 1 (flew to moon, saw far)
  ssr_ha_001: [
    {
      trigger: "battlecry",
      description: "戰吼:回復 8 信徒 + 抽 1 張牌(奔月望遠)",
      effect: (ctx) => {
        healFriendlyFace(ctx, 8);
        drawCards(ctx, 1);
      },
    },
  ],

  // ═══════════════════════════════════════════════════════════════════
  // UR 卡牌招牌效果 (30 張)
  // ═══════════════════════════════════════════════════════════════════

  // Primitive
  ur_pr_001: [
    {
      trigger: "battlecry",
      description: "戰吼:召喚兩隻 3/3「原初陰影」(在光之前的黑暗)",
      effect: (ctx) => {
        summonToken(ctx, "原初陰影", 3, 3);
        summonToken(ctx, "原初陰影", 3, 3);
      },
    },
  ],
  ur_pr_002: [
    {
      trigger: "battlecry",
      description: "戰吼:回復 10 信徒 + 抽 2 張牌(第一個子宮)",
      effect: (ctx) => {
        healFriendlyFace(ctx, 10);
        drawCards(ctx, 2);
      },
    },
  ],
  ur_pr_003: [
    {
      trigger: "battlecry",
      description: "戰吼:沉默所有敵方怪物(一句話撕裂帷幕)",
      effect: (ctx) => silenceAllEnemyMinions(ctx),
    },
  ],

  // Mesopotamia
  ur_me_001: [
    {
      trigger: "battlecry",
      description: "戰吼:所有友軍 +1/+2(智慧塑身)",
      effect: (ctx) => buffAllFriendlyMinions(ctx, 1, 2),
    },
  ],
  ur_me_002: [
    {
      trigger: "deathrattle",
      description: "亡語:召喚一隻 5/5「提亞馬特碎片」(屍化為天地)",
      effect: (ctx) => summonToken(ctx, "提亞馬特碎片", 5, 5),
    },
  ],
  ur_me_003: [
    {
      trigger: "battlecry",
      description: "戰吼:信仰池上限 +2(天空之父)",
      effect: (ctx) => gainManaCeiling(ctx, 2),
    },
  ],

  // Egypt
  ur_eg_001: [
    {
      trigger: "battlecry",
      description: "戰吼:回復 10 信徒,所有友軍 +0/+3(冥界之王歸來)",
      effect: (ctx) => {
        healFriendlyFace(ctx, 10);
        buffAllFriendlyMinions(ctx, 0, 3);
      },
    },
  ],
  ur_eg_002: [
    {
      trigger: "battlecry",
      description: "戰吼:抽 3 張牌 + 窺見對方手牌(書寫宇宙者)",
      effect: (ctx) => {
        drawCards(ctx, 3);
        revealEnemyHand(ctx);
      },
    },
  ],
  ur_eg_003: [
    {
      trigger: "battlecry",
      description: "戰吼:敵方所有怪物 −5(無名之陽)",
      effect: (ctx) => damageAllEnemyMinions(ctx, 5),
    },
  ],

  // Greek
  ur_gr_001: [
    {
      trigger: "battlecry",
      description: "戰吼:對敵方面部 8 點雷擊(雷霆之王)",
      effect: (ctx) => damageEnemyFace(ctx, 8),
    },
  ],
  ur_gr_002: [
    {
      trigger: "battlecry",
      description: "戰吼:凍結所有敵方怪物 + 敵方詛咒 5 疊(時間吞噬)",
      effect: (ctx) => {
        freezeAllEnemyMinions(ctx);
        applyCurseEnemyFace(ctx, 5);
      },
    },
  ],
  ur_gr_003: [
    {
      trigger: "deathrattle",
      description: "亡語:召喚兩隻 3/3「死者之靈」(冥府不空)",
      effect: (ctx) => {
        summonToken(ctx, "死者之靈", 3, 3);
        summonToken(ctx, "死者之靈", 3, 3);
      },
    },
  ],

  // Han
  ur_ha_001: [
    {
      trigger: "battlecry",
      description: "戰吼:回復 12 信徒 + 所有友軍聖盾(補天)",
      effect: (ctx) => {
        healFriendlyFace(ctx, 12);
        divineShieldAllFriendly(ctx);
      },
    },
  ],
  ur_ha_002: [
    {
      trigger: "battlecry",
      description: "戰吼:所有友軍 +2/+0(八卦加持)",
      effect: (ctx) => buffAllFriendlyMinions(ctx, 2, 0),
    },
  ],
  ur_ha_003: [
    {
      trigger: "battlecry",
      description: "戰吼:對敵方面部 6 + 敵方所有怪物 −3(以身化萬物)",
      effect: (ctx) => {
        damageEnemyFace(ctx, 6);
        damageAllEnemyMinions(ctx, 3);
      },
    },
  ],

  // Norse
  ur_no_001: [
    {
      trigger: "deathrattle",
      description: "亡語:敵方所有怪物 −5(屍化為世界)",
      effect: (ctx) => damageAllEnemyMinions(ctx, 5),
    },
  ],
  ur_no_002: [
    {
      trigger: "battlecry",
      description: "戰吼:全場所有怪物 −4 HP(結算日)",
      effect: (ctx) => damageAllMinions(ctx, 4),
    },
  ],
  ur_no_003: [
    {
      trigger: "battlecry",
      description: "戰吼:抽 2 張牌 + 窺見對方手牌(智者低語)",
      effect: (ctx) => {
        drawCards(ctx, 2);
        revealEnemyHand(ctx);
      },
    },
  ],

  // Medieval
  ur_md_001: [
    {
      trigger: "battlecry",
      description: "戰吼:敵方中毒 5 疊 + 破綻 3 回合(第一個墮天使)",
      effect: (ctx) => {
        applyPoisonEnemyFace(ctx, 5);
        applyVulnerableEnemyFace(ctx, 3);
      },
    },
  ],
  ur_md_002: [
    {
      trigger: "battlecry",
      description: "戰吼:淨化自身所有負面狀態 + 回復 12 信徒(盛過神血)",
      effect: (ctx) => {
        cleanseSelf(ctx);
        healFriendlyFace(ctx, 12);
      },
    },
  ],
  ur_md_003: [
    {
      trigger: "battlecry",
      description: "戰吼:隨機友軍 +3/+3(石中劍光)",
      effect: (ctx) => buffRandomFriendlyMinion(ctx, 3, 3),
    },
  ],

  // Sengoku
  ur_se_001: [
    {
      trigger: "battlecry",
      description: "戰吼:所有友軍獲得聖盾(太陽神庇佑)",
      effect: (ctx) => divineShieldAllFriendly(ctx),
    },
  ],
  ur_se_002: [
    {
      trigger: "battlecry",
      description: "戰吼:每隻敵方怪物造成 3 點面部傷害(暴風之神)",
      effect: (ctx) => damageFacePerEnemyMinion(ctx, 3),
    },
  ],
  ur_se_003: [
    {
      trigger: "battlecry",
      description: "戰吼:凍結所有敵方怪物(兵法秘傳)",
      effect: (ctx) => freezeAllEnemyMinions(ctx),
    },
  ],

  // Ming
  ur_mg_001: [
    {
      trigger: "battlecry",
      description: "戰吼:淨化 + 信仰池上限 +3(包含萬有)",
      effect: (ctx) => {
        cleanseSelf(ctx);
        gainManaCeiling(ctx, 3);
      },
    },
  ],
  ur_mg_002: [
    {
      trigger: "battlecry",
      description: "戰吼:敵方中毒 4 + 詛咒 4(生死簿)",
      effect: (ctx) => {
        applyPoisonEnemyFace(ctx, 4);
        applyCurseEnemyFace(ctx, 4);
      },
    },
  ],
  ur_mg_003: [
    {
      trigger: "battlecry",
      description: "戰吼:抽 2 張牌 + 所有友軍 +1/+1(金星調停)",
      effect: (ctx) => {
        drawCards(ctx, 2);
        buffAllFriendlyMinions(ctx, 1, 1);
      },
    },
  ],

  // Modern
  ur_mo_001: [
    {
      trigger: "battlecry",
      description: "戰吼:對敵方面部 10 傷害 · 自損 5(原初謊言)",
      effect: (ctx) => {
        damageEnemyFace(ctx, 10);
        sacrificeSelfDamage(ctx, 5);
      },
    },
  ],
  ur_mo_002: [
    {
      trigger: "battlecry",
      description: "戰吼:窺見對方手牌 + 抽 2 張牌(一旦對視就改寫)",
      effect: (ctx) => {
        revealEnemyHand(ctx);
        drawCards(ctx, 2);
      },
    },
  ],
  ur_mo_003: [
    {
      trigger: "battlecry",
      description: "戰吼:全場每隻怪物都治癒 3 HP(集體夢境)",
      effect: (ctx) => {
        for (const m of [...ctx.self.board, ...ctx.other.board]) {
          m.hp = Math.min(m.hpMax, m.hp + 3);
        }
        log(ctx, `集體無意識治癒全場 +3`, "heal");
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// Keyword-based default abilities — applied to SR+ minions that don't have
// a unique signature in CARD_ABILITIES. Every SR or higher minion thus has
// at least one flavoured ability.
// ═══════════════════════════════════════════════════════════════════════

function defaultAbilitiesFromKeywords(minion: Minion): CardAbility[] {
  if (minion.rarity === "R") return [];
  const kw = (k: string) => minion.keywords.includes(k);
  const abs: CardAbility[] = [];

  // Priority: more flavourful keywords first so a minion with multiple
  // gets its most interesting effect, not its most generic.
  if (kw("poison") && !kw("ritual")) {
    abs.push({
      trigger: "battlecry",
      description: "戰吼:敵方中毒 2 疊",
      effect: (ctx) => applyPoisonEnemyFace(ctx, 2),
    });
  } else if (kw("curse")) {
    abs.push({
      trigger: "battlecry",
      description: "戰吼:敵方詛咒 +2",
      effect: (ctx) => applyCurseEnemyFace(ctx, 2),
    });
  } else if (kw("charm")) {
    abs.push({
      trigger: "battlecry",
      description: "戰吼:敵方魅惑 +1 疊",
      effect: (ctx) => {
        ctx.other.charmStacks += 1;
        log(ctx, `${ctx.other.name} 魅惑 +1`, "debuff");
      },
    });
  } else if (kw("sacrifice")) {
    abs.push({
      trigger: "battlecry",
      description: "戰吼:自損 2 → 對方 −3",
      effect: (ctx) => {
        sacrificeSelfDamage(ctx, 2);
        damageEnemyFace(ctx, 3);
      },
    });
  } else if (kw("whisper")) {
    abs.push({
      trigger: "battlecry",
      description: "戰吼:抽 1 張牌",
      effect: (ctx) => drawCards(ctx, 1),
    });
  } else if (kw("shield")) {
    abs.push({
      trigger: "battlecry",
      description: "戰吼:我方獲得 4 點護盾",
      effect: (ctx) => {
        ctx.self.shield += 4;
        log(ctx, `${ctx.source.name} 給予我方 4 點護盾`, "buff");
      },
    });
  } else if (kw("resonance")) {
    abs.push({
      trigger: "battlecry",
      description: "戰吼:信仰池 +1",
      effect: (ctx) => gainMana(ctx, 1),
    });
  }

  // SSR+ get an additional end-of-turn or deathrattle aura
  if (minion.rarity === "SSR" || minion.rarity === "UR") {
    if (kw("lifesteal") && !abs.some((a) => a.trigger === "end_of_turn")) {
      abs.push({
        trigger: "end_of_turn",
        description: "回合結束:回復 2 信徒",
        effect: (ctx) => healFriendlyFace(ctx, 2),
      });
    } else if (kw("strength") && !abs.some((a) => a.trigger === "start_of_turn")) {
      abs.push({
        trigger: "start_of_turn",
        description: "回合開始:自身 +1 ATK",
        effect: (ctx) => {
          ctx.source.atk += 1;
          log(ctx, `${ctx.source.name} +1 ATK`, "buff");
        },
      });
    }
  }

  return abs;
}

/** Get all abilities for a minion, merging signature + keyword defaults. */
function getAbilitiesFor(minion: Minion): CardAbility[] {
  const signature = CARD_ABILITIES[minion.cardId];
  if (signature && signature.length > 0) return signature;
  return defaultAbilitiesFromKeywords(minion);
}

/**
 * Fire all abilities on a minion matching the given trigger. Safe to call
 * when the minion has no matching abilities.
 *
 * Emits a structured log entry per firing (kind: "buff", data.event:
 * "ability_fired") so the UI layer can flash the minion card and surface
 * the trigger name without having to regex-parse free-form log text.
 */
export function fireAbility(
  state: BattleState,
  sideName: "player" | "enemy",
  minion: Minion,
  trigger: AbilityTrigger,
): void {
  const abilities = getAbilitiesFor(minion);
  const matching = abilities.filter((a) => a.trigger === trigger);
  if (matching.length === 0) return;

  const self = state[sideName];
  const other = state[sideName === "player" ? "enemy" : "player"];
  const ctx: AbilityContext = { state, sideName, self, other, source: minion };

  // Single marker entry per firing (before the effects push their own
  // damage/heal/buff logs), so the client can match `data.uid` to the
  // corresponding minion and flash it exactly when the effect runs.
  state.log.push({
    turn: state.turn,
    side: sideName,
    kind: "buff",
    text: `${triggerLabel(trigger)} · ${minion.name}`,
    data: { event: "ability_fired", uid: minion.uid, trigger },
  });

  for (const ability of matching) {
    try {
      ability.effect(ctx);
    } catch (err) {
      console.error(`ability ${minion.cardId}/${trigger} threw`, err);
    }
  }
}

/** Returns signature-ability descriptions for display on a card preview.
 *  Looks up the signature map first, then falls back to keyword-derived
 *  templates if the card has a minion stat profile. */
export function getAbilityDescriptions(cardId: string, minion?: Minion): string[] {
  const signature = CARD_ABILITIES[cardId];
  if (signature && signature.length > 0) {
    return signature.map((a) => `[${a.trigger}] ${a.description}`);
  }
  if (minion) {
    return defaultAbilitiesFromKeywords(minion).map(
      (a) => `[${a.trigger}] ${a.description}`,
    );
  }
  return [];
}

/** Get ability descriptions derived from keywords alone (for cards that
 *  haven't been summoned yet — e.g., hand preview). Returns empty if the
 *  card has no signature and no defaults apply. */
export function getAbilityDescriptionsForCard(
  cardId: string,
  rarity: string,
  keywords: string[],
): string[] {
  const signature = CARD_ABILITIES[cardId];
  if (signature && signature.length > 0) {
    return signature.map((a) => `${triggerLabel(a.trigger)}:${a.description.replace(/^[^:]+:\s*/, "")}`);
  }
  // Synthesise a fake minion to reuse the template logic.
  const probe: Minion = {
    uid: "probe",
    cardId,
    name: "",
    rarity: rarity as Minion["rarity"],
    eraId: "",
    hpMax: 0,
    hp: 0,
    atk: 0,
    keywords,
    summonedThisTurn: false,
    attacksRemaining: 0,
    shielded: false,
  };
  return defaultAbilitiesFromKeywords(probe).map(
    (a) => `${triggerLabel(a.trigger)}:${a.description.replace(/^[^:]+:\s*/, "")}`,
  );
}

function triggerLabel(t: AbilityTrigger): string {
  return {
    battlecry: "戰吼",
    deathrattle: "亡語",
    start_of_turn: "回合開始",
    end_of_turn: "回合結束",
    on_attack: "攻擊後",
    on_damaged: "受擊",
  }[t];
}

export { getAbilitiesFor };
