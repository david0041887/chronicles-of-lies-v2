import type { BattleCard, BattleState, LogEntry, SideState } from "./types";

const BASE_HAND_CAP = 5;
const BASE_MANA_CAP = 10;
const INITIAL_HP = 50;
const BASE_INITIAL_DRAW = 5;
const BASE_INITIAL_MANA = 2;  // was 1 — 2+ is more playable on turn 1

export interface PlayerPerks {
  startHandBonus: number;  // +1 at weaver Lv.5
  startManaBonus: number;  // +1 at weaver Lv.10
  maxManaBonus: number;    // +2 at weaver Lv.20
}

const ZERO_PERKS: PlayerPerks = {
  startHandBonus: 0,
  startManaBonus: 0,
  maxManaBonus: 0,
};

function makeSide(
  name: string,
  deck: BattleCard[],
  perks: PlayerPerks = ZERO_PERKS,
): SideState {
  const startMana = BASE_INITIAL_MANA + perks.startManaBonus;
  const manaCeiling = BASE_MANA_CAP + perks.maxManaBonus;
  return {
    name,
    hp: INITIAL_HP,
    hpMax: INITIAL_HP,
    mana: startMana,
    manaMax: Math.min(manaCeiling, startMana),
    manaCeiling,
    deck: shuffle(deck),
    hand: [],
    discard: [],
    shield: 0,
    buffNextCard: 1,
    curseStacks: 0,
    confusedTurns: 0,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function draw(side: SideState, n: number, log: LogEntry[], turn: number, sideName: "player" | "enemy") {
  for (let i = 0; i < n; i++) {
    if (side.hand.length >= BASE_HAND_CAP) break;
    if (side.deck.length === 0) {
      // Shuffle discard back
      side.deck = shuffle(side.discard);
      side.discard = [];
    }
    const card = side.deck.shift();
    if (!card) break;
    side.hand.push(card);
    log.push({ turn, side: sideName, kind: "draw", text: `抽到 ${card.name}` });
  }
}

export interface EnemyModifiers {
  /** Boss arena: starts with a shield to soak the opening turn. */
  startShield?: number;
  /** Prime-mode: extra starting mana so the fight opens aggressive. */
  extraStartMana?: number;
  /** HP threshold (0..1). When enemy HP drops below this, enrage triggers:
   *  +2 permanent damageBonus on future plays, fires once, logged. */
  enrageAt?: number;
  /** Short label shown in the opening log, e.g. "BOSS" / "PRIME BOSS". */
  label?: string;
}

/** Derives enemy modifiers for a given stage flavour. */
export function modifiersForStage(args: {
  isBoss: boolean;
  mode: "normal" | "prime";
}): EnemyModifiers {
  const { isBoss, mode } = args;
  if (mode === "prime" && isBoss) {
    return {
      startShield: 10,
      extraStartMana: 2,
      enrageAt: 0.5,
      label: "👑 PRIME BOSS",
    };
  }
  if (mode === "prime") {
    return { startShield: 5, extraStartMana: 1, label: "🌀 PRIME" };
  }
  if (isBoss) {
    return { startShield: 6, enrageAt: 0.4, label: "👑 BOSS" };
  }
  return {};
}

export function createBattle(
  playerName: string,
  playerDeck: BattleCard[],
  enemyName: string,
  enemyDeck: BattleCard[],
  enemyHp = INITIAL_HP,
  playerPerks: PlayerPerks = ZERO_PERKS,
  enemyMods: EnemyModifiers = {},
): BattleState {
  const state: BattleState = {
    phase: "starting",
    turn: 1,
    player: makeSide(playerName, playerDeck, playerPerks),
    enemy: { ...makeSide(enemyName, enemyDeck), hp: enemyHp, hpMax: enemyHp },
    log: [],
    playerPlays: [],
    seed: Date.now() >>> 0,
  };

  // Apply enemy modifiers
  if (enemyMods.startShield && enemyMods.startShield > 0) {
    state.enemy.shield = enemyMods.startShield;
  }
  if (enemyMods.extraStartMana && enemyMods.extraStartMana > 0) {
    const bonus = enemyMods.extraStartMana;
    state.enemy.mana = Math.min(state.enemy.manaCeiling, state.enemy.mana + bonus);
    state.enemy.manaMax = Math.min(
      state.enemy.manaCeiling,
      state.enemy.manaMax + bonus,
    );
  }
  if (enemyMods.enrageAt && enemyMods.enrageAt > 0) {
    state.enemy.enrageAt = enemyMods.enrageAt;
  }

  const initialDraw = BASE_INITIAL_DRAW + playerPerks.startHandBonus;
  draw(state.player, initialDraw, state.log, 1, "player");
  draw(state.enemy, BASE_INITIAL_DRAW, state.log, 1, "enemy");

  if (playerPerks.startHandBonus > 0 || playerPerks.startManaBonus > 0) {
    state.log.push({
      turn: 1,
      side: "player",
      kind: "buff",
      text: `編織者加成:+${playerPerks.startHandBonus} 手牌 · +${playerPerks.startManaBonus} 信仰池`,
    });
  }

  if (enemyMods.label) {
    const bits: string[] = [];
    if (enemyMods.startShield) bits.push(`護盾 ${enemyMods.startShield}`);
    if (enemyMods.extraStartMana) bits.push(`+${enemyMods.extraStartMana} 信仰池`);
    if (enemyMods.enrageAt)
      bits.push(`<${Math.round(enemyMods.enrageAt * 100)}% HP 將狂暴`);
    state.log.push({
      turn: 1,
      side: "enemy",
      kind: "buff",
      text: `${enemyMods.label} · ${bits.join(" · ")}`,
    });
  }

  state.phase = "player_turn";
  state.log.push({ turn: 1, side: "player", kind: "phase", text: "第 1 回合 · 你的回合" });
  return state;
}

function dealDamage(
  attacker: SideState,
  defender: SideState,
  amount: number,
  log: LogEntry[],
  turn: number,
  pierce = false,
  sideName: "player" | "enemy" = "player",
) {
  let dmg = Math.max(0, Math.floor(amount));
  if (!pierce && defender.shield > 0) {
    const absorbed = Math.min(defender.shield, dmg);
    defender.shield -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0) {
      log.push({
        turn,
        side: sideName,
        kind: "damage",
        text: `護盾吸收 ${absorbed}`,
      });
    }
  }
  if (dmg > 0) {
    defender.hp = Math.max(0, defender.hp - dmg);
    log.push({
      turn,
      side: sideName,
      kind: "damage",
      text: `對 ${defender.name} 造成 ${dmg} 信徒流失`,
    });
  }
  // Enrage check — only for defenders that set enrageAt (BOSS / Prime BOSS).
  if (
    defender.enrageAt !== undefined &&
    !defender.enraged &&
    defender.hp > 0 &&
    defender.hp / defender.hpMax <= defender.enrageAt
  ) {
    defender.enraged = true;
    defender.damageBonus = (defender.damageBonus ?? 0) + 2;
    log.push({
      turn,
      side: sideName === "player" ? "enemy" : "player",
      kind: "buff",
      text: `⚠️ ${defender.name} 進入狂暴 — 永久 +2 威力`,
    });
  }
}

function heal(side: SideState, amount: number, log: LogEntry[], turn: number, sideName: "player" | "enemy") {
  const before = side.hp;
  side.hp = Math.min(side.hpMax, side.hp + amount);
  const healed = side.hp - before;
  if (healed > 0) {
    log.push({ turn, side: sideName, kind: "heal", text: `${side.name} 恢復 ${healed} 信徒` });
  }
}

/**
 * Play a card. Returns the new state (mutated in place for simplicity).
 */
export function playCard(state: BattleState, sideName: "player" | "enemy", handIndex: number): BattleState {
  if ((sideName === "player" && state.phase !== "player_turn") || (sideName === "enemy" && state.phase !== "enemy_turn")) {
    return state;
  }
  const self = state[sideName];
  const other = state[sideName === "player" ? "enemy" : "player"];
  const card = self.hand[handIndex];
  if (!card) return state;
  if (card.cost > self.mana) return state;

  self.mana -= card.cost;
  self.hand.splice(handIndex, 1);
  self.discard.push(card);

  // Track for post-battle legend auto-spread (player only)
  if (sideName === "player") {
    state.playerPlays.push(card.id);
  }

  const basePower = card.power * self.buffNextCard + (self.damageBonus ?? 0);
  const hasPierce = card.keywords.includes("pierce");
  const hasHaste = card.keywords.includes("haste");

  state.log.push({
    turn: state.turn,
    side: sideName,
    kind: "play",
    text: `打出 ${card.name}(${card.type} ${basePower})`,
  });

  switch (card.type) {
    case "attack": {
      dealDamage(self, other, basePower, state.log, state.turn, hasPierce, sideName);
      if (card.keywords.includes("curse")) {
        other.curseStacks += 2;
        state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `${other.name} 受詛咒(2 回合)` });
      }
      break;
    }
    case "heal": {
      heal(self, basePower, state.log, state.turn, sideName);
      if (card.keywords.includes("shield")) {
        self.shield += 6;
        state.log.push({ turn: state.turn, side: sideName, kind: "buff", text: `獲得 6 點護盾` });
      }
      break;
    }
    case "spread": {
      // Spread: small HP +, draw 1
      heal(self, Math.max(2, Math.floor(basePower * 0.5)), state.log, state.turn, sideName);
      draw(self, 1, state.log, state.turn, sideName);
      break;
    }
    case "buff": {
      self.buffNextCard = 2;
      if (card.keywords.includes("shield")) {
        self.shield += 8;
      }
      if (card.keywords.includes("resonance")) {
        self.mana = Math.min(self.manaMax, self.mana + 2);
      }
      state.log.push({ turn: state.turn, side: sideName, kind: "buff", text: `下張牌威力 x2` });
      // Note: buffNextCard resets to 1 after next play below (handled in reset)
      return postPlay(state, self, hasHaste, sideName);
    }
    case "debuff": {
      dealDamage(self, other, Math.max(1, Math.floor(basePower * 0.7)), state.log, state.turn, hasPierce, sideName);
      other.curseStacks += 2;
      state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `${other.name} 受詛咒` });
      break;
    }
    case "confuse": {
      other.confusedTurns = Math.max(other.confusedTurns, 1);
      state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `${other.name} 下回合困惑` });
      if (basePower > 0) dealDamage(self, other, Math.floor(basePower * 0.5), state.log, state.turn, hasPierce, sideName);
      break;
    }
    case "ritual": {
      // Ritual: high impact, + apply curse
      dealDamage(self, other, basePower, state.log, state.turn, hasPierce, sideName);
      other.curseStacks += 3;
      state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `儀式完成 — ${other.name} 受詛咒 3 疊` });
      break;
    }
  }

  return postPlay(state, self, hasHaste, sideName);
}

function postPlay(state: BattleState, self: SideState, haste: boolean, sideName: "player" | "enemy"): BattleState {
  // Reset buff (it applies only to the next card)
  self.buffNextCard = 1;
  if (haste) draw(self, 1, state.log, state.turn, sideName);
  checkWin(state);
  return state;
}

function checkWin(state: BattleState) {
  if (state.enemy.hp <= 0) {
    state.phase = "won";
    state.log.push({ turn: state.turn, side: "player", kind: "phase", text: "勝利 — 帷幕歸你所有" });
  } else if (state.player.hp <= 0) {
    state.phase = "lost";
    state.log.push({ turn: state.turn, side: "enemy", kind: "phase", text: "失敗 — 你的信徒散去" });
  }
}

export function endPlayerTurn(state: BattleState): BattleState {
  if (state.phase !== "player_turn") return state;
  state.phase = "enemy_turn";
  state.log.push({ turn: state.turn, side: "enemy", kind: "phase", text: `敵人回合` });
  applyStartOfTurnEffects(state, "enemy");
  return state;
}

export function endEnemyTurn(state: BattleState): BattleState {
  if (state.phase !== "enemy_turn") return state;
  state.turn += 1;
  state.phase = "player_turn";
  state.log.push({ turn: state.turn, side: "player", kind: "phase", text: `第 ${state.turn} 回合 · 你的回合` });
  applyStartOfTurnEffects(state, "player");
  return state;
}

function applyStartOfTurnEffects(state: BattleState, sideName: "player" | "enemy") {
  const self = state[sideName];
  const other = state[sideName === "player" ? "enemy" : "player"];

  // Confusion: if confused, skip turn (handled by caller: if confusedTurns>0, jump straight to end)
  // Curse tick
  if (self.curseStacks > 0) {
    const dmg = self.curseStacks;
    self.hp = Math.max(0, self.hp - dmg);
    state.log.push({ turn: state.turn, side: sideName, kind: "damage", text: `${self.name} 詛咒傷害 -${dmg}` });
    self.curseStacks = Math.max(0, self.curseStacks - 1);
  }

  // Mana refill + cap grow
  self.manaMax = Math.min(self.manaCeiling, self.manaMax + 1);
  self.mana = self.manaMax;

  // Draw 1
  draw(self, 1, state.log, state.turn, sideName);

  checkWin(state);
}

export function isConfused(state: BattleState, sideName: "player" | "enemy"): boolean {
  return state[sideName].confusedTurns > 0;
}

export function consumeConfusion(state: BattleState, sideName: "player" | "enemy") {
  const s = state[sideName];
  if (s.confusedTurns > 0) {
    s.confusedTurns = Math.max(0, s.confusedTurns - 1);
    state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `${s.name} 因困惑失去回合` });
  }
}
