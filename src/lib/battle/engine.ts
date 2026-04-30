import { fireAbility } from "./card-abilities";
import { MAX_BOARD_SIZE } from "./types";
import type { BattleCard, BattleState, LogEntry, Minion, SideState } from "./types";

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
    board: [],
    shield: 0,
    buffNextCard: 1,
    curseStacks: 0,
    confusedTurns: 0,
    poison: 0,
    vulnerableTurns: 0,
    weakTurns: 0,
    strength: 0,
    echoPending: null,
    charmStacks: 0,
    combosThisTurn: 0,
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

interface DamageOpts {
  pierce?: boolean;
  lifesteal?: boolean;
  skipStatusMods?: boolean; // for DoT / curse ticks that shouldn't be buffed
}

function dealDamage(
  attacker: SideState,
  defender: SideState,
  amount: number,
  log: LogEntry[],
  turn: number,
  opts: DamageOpts = {},
  sideName: "player" | "enemy" = "player",
): number {
  const { pierce = false, lifesteal = false, skipStatusMods = false } = opts;
  let dmg = Math.max(0, Math.floor(amount));

  if (!skipStatusMods) {
    // Attacker weak: −25% outgoing
    if (attacker.weakTurns > 0) dmg = Math.floor(dmg * 0.75);
    // Defender vulnerable: +50% incoming
    if (defender.vulnerableTurns > 0) dmg = Math.floor(dmg * 1.5);
  }

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

  let dealt = 0;
  if (dmg > 0) {
    dealt = Math.min(defender.hp, dmg);
    defender.hp = Math.max(0, defender.hp - dmg);
    log.push({
      turn,
      side: sideName,
      kind: "damage",
      text: `對 ${defender.name} 造成 ${dmg} 信徒流失`,
    });
  }

  // Lifesteal: attacker heals for damage actually dealt, up to a cap.
  if (lifesteal && dealt > 0) {
    const heal = Math.min(dealt, 6);
    const before = attacker.hp;
    attacker.hp = Math.min(attacker.hpMax, attacker.hp + heal);
    const got = attacker.hp - before;
    if (got > 0) {
      log.push({
        turn,
        side: sideName,
        kind: "heal",
        text: `${attacker.name} 吸血回復 +${got}`,
      });
    }
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
  return dealt;
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
export function playCard(
  state: BattleState,
  sideName: "player" | "enemy",
  handIndex: number,
): BattleState {
  if ((sideName === "player" && state.phase !== "player_turn") || (sideName === "enemy" && state.phase !== "enemy_turn")) {
    return state;
  }
  const self = state[sideName];
  const card = self.hand[handIndex];
  if (!card) return state;
  if (card.cost > self.mana) return state;

  self.mana -= card.cost;
  self.hand.splice(handIndex, 1);
  self.discard.push(card);

  if (sideName === "player") state.playerPlays.push(card.id);

  return resolveCardEffect(state, sideName, card, {
    powerScale: 1,
    ignoreKeywords: [],
  });
}

interface ResolveOpts {
  /** Multiplier on the final computed basePower (e.g. 0.5 for echo replay). */
  powerScale: number;
  /** Keywords to skip during this resolution (prevents infinite echo loops). */
  ignoreKeywords: string[];
}

function resolveCardEffect(
  state: BattleState,
  sideName: "player" | "enemy",
  card: BattleCard,
  opts: ResolveOpts,
): BattleState {
  const self = state[sideName];
  const other = state[sideName === "player" ? "enemy" : "player"];
  const kw = (k: string) =>
    card.keywords.includes(k) && !opts.ignoreKeywords.includes(k);

  // ── Sacrifice: discard a random hand card → +3 power to this play ──
  let sacrificeBonus = 0;
  if (kw("sacrifice") && self.hand.length > 0) {
    const idx = Math.floor(Math.random() * self.hand.length);
    const dumped = self.hand.splice(idx, 1)[0];
    self.discard.push(dumped);
    sacrificeBonus = 3;
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "buff",
      text: `🔪 獻祭 ${dumped.name} → 本牌 +3 威力`,
    });
  }

  // ── Combo: +50% if ≥2 other cards were already played this turn ──
  let comboMult = 1;
  if (kw("combo") && self.combosThisTurn >= 2) {
    comboMult = 1.5;
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "buff",
      text: `🔗 連擊 ×1.5(第 ${self.combosThisTurn + 1} 張)`,
    });
  }

  const rawPower =
    (card.power + self.strength) * self.buffNextCard +
    sacrificeBonus +
    (self.damageBonus ?? 0);
  const basePower = Math.max(
    0,
    Math.floor(rawPower * comboMult * opts.powerScale),
  );
  const hasPierce = kw("pierce");
  const hasHaste = kw("haste");
  const hasLifesteal = kw("lifesteal");
  const isMinion = kw("minion");

  // Charm reflection: if this side was charmed and plays a damage-dealing
  // card, 50% of the base damage rebounds onto themselves.
  const attackerIsCharmed =
    self.charmStacks > 0 &&
    (card.type === "attack" ||
      card.type === "ritual" ||
      card.type === "debuff");
  if (attackerIsCharmed) self.charmStacks -= 1;

  self.combosThisTurn += 1;

  state.log.push({
    turn: state.turn,
    side: sideName,
    kind: "play",
    text: `打出 ${card.name}(${card.type} ${basePower})`,
  });

  // ── Whisper: reveal one random card from the opponent's hand ──
  if (kw("whisper") && other.hand.length > 0) {
    const peek = other.hand[Math.floor(Math.random() * other.hand.length)];
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "buff",
      text: `👁️ 低語窺視:${peek.name}(${peek.type} ${peek.power})`,
    });
  }

  // ── Minion summon: create a creature on the board instead of firing an
  //    instant effect. Board is cap-limited; over-cap summons fizzle with
  //    a log message and mana refund so the player isn't punished for a
  //    dead play caused by cramped board.
  if (isMinion) {
    if (self.board.length >= MAX_BOARD_SIZE) {
      self.mana += card.cost; // refund
      self.hand.unshift(card); // put card back
      const idx = self.discard.findIndex((c) => c.uid === card.uid);
      if (idx >= 0) self.discard.splice(idx, 1);
      state.log.push({
        turn: state.turn,
        side: sideName,
        kind: "debuff",
        text: `戰場已滿(${MAX_BOARD_SIZE} 格),${card.name} 無法召喚`,
      });
      return postPlay(state, sideName, card, false, opts);
    }
    const hpMax = Math.max(2, Math.floor(card.power * 1.5) + card.cost);
    const atk = Math.max(1, card.power + (self.damageBonus ?? 0));
    const hasCharge = kw("charge");
    const hasWindfury = kw("windfury");
    const hasDivineShield = kw("divine_shield");
    const minion: Minion = {
      uid: `m-${state.turn}-${card.uid}`,
      cardId: card.id,
      name: card.name,
      rarity: card.rarity,
      eraId: card.eraId,
      hpMax,
      hp: hpMax,
      atk,
      keywords: card.keywords.filter((k) => k !== "minion"),
      summonedThisTurn: !hasCharge,
      attacksRemaining: hasCharge ? (hasWindfury ? 2 : 1) : 0,
      shielded: hasDivineShield,
      imageUrl: card.imageUrl,
      hasImage: card.hasImage,
      flavor: card.flavor,
    };
    self.board.push(minion);
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "buff",
      text: `🐾 召喚 ${card.name}(HP ${hpMax} / ATK ${atk}${hasCharge ? " · 突擊" : ""}${hasDivineShield ? " · 聖盾" : ""})`,
    });
    // Fire battlecry — per-card signature ability on summon.
    fireAbility(state, sideName, minion, "battlecry");
    cleanupDeadMinions(state);
    checkWin(state);
    return postPlay(state, sideName, card, hasHaste, opts);
  }

  switch (card.type) {
    case "attack": {
      dealDamage(self, other, basePower, state.log, state.turn, {
        pierce: hasPierce,
        lifesteal: hasLifesteal,
      }, sideName);
      if (kw("curse")) {
        other.curseStacks += 2;
        state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `${other.name} 受詛咒(2 回合)` });
      }
      break;
    }
    case "heal": {
      heal(self, basePower, state.log, state.turn, sideName);
      if (kw("shield")) {
        self.shield += 6;
        state.log.push({ turn: state.turn, side: sideName, kind: "buff", text: `獲得 6 點護盾` });
      }
      break;
    }
    case "spread": {
      heal(self, Math.max(2, Math.floor(basePower * 0.5)), state.log, state.turn, sideName);
      draw(self, 1, state.log, state.turn, sideName);
      break;
    }
    case "buff": {
      self.buffNextCard = 2;
      if (kw("shield")) self.shield += 8;
      if (kw("resonance")) self.mana = Math.min(self.manaMax, self.mana + 2);
      if (kw("strength")) {
        self.strength += 1;
        state.log.push({
          turn: state.turn,
          side: sideName,
          kind: "buff",
          text: `💪 獲得力量 +1(永久)`,
        });
      }
      state.log.push({ turn: state.turn, side: sideName, kind: "buff", text: `下張牌威力 x2` });
      return postPlay(state, sideName, card, hasHaste, opts);
    }
    case "debuff": {
      dealDamage(self, other, Math.max(1, Math.floor(basePower * 0.7)), state.log, state.turn, {
        pierce: hasPierce,
        lifesteal: hasLifesteal,
      }, sideName);
      other.curseStacks += 2;
      state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `${other.name} 受詛咒` });
      break;
    }
    case "confuse": {
      other.confusedTurns = Math.max(other.confusedTurns, 1);
      state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `${other.name} 下回合困惑` });
      if (basePower > 0) {
        dealDamage(self, other, Math.floor(basePower * 0.5), state.log, state.turn, {
          pierce: hasPierce,
        }, sideName);
      }
      break;
    }
    case "ritual": {
      dealDamage(self, other, basePower, state.log, state.turn, {
        pierce: hasPierce,
        lifesteal: hasLifesteal,
      }, sideName);
      other.curseStacks += 3;
      state.log.push({ turn: state.turn, side: sideName, kind: "debuff", text: `儀式完成 — ${other.name} 受詛咒 3 疊` });
      break;
    }
  }

  // ── Post-effect status applications (apply after base effect resolves) ──
  if (kw("poison")) {
    // Cap poison stacks at 10 — prevents late-game Prime bosses from
    // snowballing an unrecoverable DoT against the player.
    other.poison = Math.min(10, other.poison + 3);
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "debuff",
      text: `☠️ ${other.name} 中毒(3 疊永不消散)`,
    });
  }
  if (kw("vulnerable")) {
    other.vulnerableTurns = Math.max(other.vulnerableTurns, 2);
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "debuff",
      text: `🩸 ${other.name} 破綻(2 回合 +50% 受傷)`,
    });
  }
  if (kw("weaken")) {
    other.weakTurns = Math.max(other.weakTurns, 2);
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "debuff",
      text: `🪶 ${other.name} 虛弱(2 回合 −25% 威力)`,
    });
  }
  if (kw("charm")) {
    other.charmStacks += 1;
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "debuff",
      text: `💋 ${other.name} 被魅惑 — 下次出攻擊將自傷`,
    });
  }

  // Apply charm self-damage AFTER the main effect resolved (so the card
  // still does its full work against the opponent, but the caster pays).
  if (attackerIsCharmed) {
    const selfHurt = Math.max(1, Math.floor(basePower * 0.5));
    self.hp = Math.max(0, self.hp - selfHurt);
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "damage",
      text: `💋 魅惑反噬 ${selfHurt}`,
    });
  }

  return postPlay(state, sideName, card, hasHaste, opts);
}

function postPlay(
  state: BattleState,
  sideName: "player" | "enemy",
  card: BattleCard,
  haste: boolean,
  opts: ResolveOpts,
): BattleState {
  const self = state[sideName];
  self.buffNextCard = 1;

  // Queue echo replay for next turn (not re-triggering on echo's own replay).
  if (
    card.keywords.includes("echo") &&
    !opts.ignoreKeywords.includes("echo") &&
    !self.echoPending
  ) {
    self.echoPending = card;
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "buff",
      text: `🔁 回響:${card.name} 將在下回合以 50% 威力重現`,
    });
  }

  if (haste) draw(self, 1, state.log, state.turn, sideName);
  checkWin(state);
  return state;
}

// Hard cap — battles past this many turns are auto-lost. Matches the
// server-side MAX_TURNS sanity check on /api/battle/complete.
const MAX_BATTLE_TURNS = 40;

/**
 * Resolve one minion attack. Target is either the enemy "face" or another
 * minion on the enemy board identified by uid. Both combatants take damage
 * (face doesn't hit back). Dead minions are removed at the end.
 *
 * Rules:
 *   - Attacker must have attacksRemaining > 0 and not summonedThisTurn
 *     (unless it has charge, which is handled at summon time).
 *   - If any enemy minion has `taunt`, the player MUST target a taunt
 *     minion (or "face" is rejected). Server re-validates.
 *   - Divine shield absorbs the first hit (to the minion or face shield).
 *   - Lifesteal on attacker heals the attacker's FACE for damage dealt.
 */
export function attackWithMinion(
  state: BattleState,
  sideName: "player" | "enemy",
  attackerUid: string,
  target: { kind: "face" } | { kind: "minion"; uid: string },
): BattleState {
  if ((sideName === "player" && state.phase !== "player_turn") ||
      (sideName === "enemy" && state.phase !== "enemy_turn")) {
    return state;
  }
  const self = state[sideName];
  const other = state[sideName === "player" ? "enemy" : "player"];
  const attacker = self.board.find((m) => m.uid === attackerUid);
  if (!attacker) return state;
  if (attacker.summonedThisTurn || attacker.attacksRemaining <= 0) return state;

  // Taunt gate: if any enemy minion has taunt, you must hit one first.
  const taunts = other.board.filter((m) => m.keywords.includes("taunt"));
  if (taunts.length > 0) {
    if (target.kind === "face") return state;
    const targetIsTaunt = taunts.some((t) => t.uid === target.uid);
    if (!targetIsTaunt) return state;
  }

  const atkLog = (txt: string, kind: LogEntry["kind"] = "damage") => {
    state.log.push({ turn: state.turn, side: sideName, kind, text: txt });
  };

  // Structured attack marker the UI uses to synchronise the attacker's
  // slide-to-target animation with the actual state mutation.
  state.log.push({
    turn: state.turn,
    side: sideName,
    kind: "play",
    text: "",
    data: {
      event: "minion_attack",
      attackerUid: attacker.uid,
      targetKind: target.kind,
      targetUid: target.kind === "minion" ? target.uid : undefined,
    },
  });

  let dealtToTarget = 0;

  if (target.kind === "face") {
    // Face damage flows through dealDamage which applies both attacker
    // weak (−25% out) and defender vulnerable (+50% in) before shield.
    // dealtToTarget is the post-shield amount actually clipped against
    // hp; used for lifesteal cap below.
    const dmg = attacker.atk;
    dealtToTarget = Math.min(other.hp, dmg);
    dealDamage(self, other, dmg, state.log, state.turn, {
      pierce: attacker.keywords.includes("pierce"),
    }, sideName);
    atkLog(`🗡️ ${attacker.name} → ${other.name} 面部(${dmg})`, "play");
  } else {
    const targetMinion = other.board.find((m) => m.uid === target.uid);
    if (!targetMinion) return state;

    // Minion-vs-minion path manually applies the same status-mod
    // pipeline (weak/vulnerable) so trades respect the same rules
    // face attacks do. Note minions don't have face-side `shield`
    // — only divine-shield (`shielded`) — so pierce isn't in play
    // here either.
    let inboundDmg = attacker.atk;
    if (self.weakTurns > 0) inboundDmg = Math.floor(inboundDmg * 0.75);
    if (other.vulnerableTurns > 0) inboundDmg = Math.floor(inboundDmg * 1.5);
    inboundDmg = Math.max(0, inboundDmg);

    if (targetMinion.shielded && inboundDmg > 0) {
      targetMinion.shielded = false;
      atkLog(`🛡 ${targetMinion.name} 聖盾吸收`, "buff");
    } else if (inboundDmg > 0) {
      targetMinion.hp -= inboundDmg;
      dealtToTarget = inboundDmg;
      atkLog(`⚔️ ${attacker.name} ×${inboundDmg} → ${targetMinion.name}`, "play");
      // Fire on_damaged on the target before the death check so reactive
      // abilities (reflect, retaliate) get to run while the minion still
      // has its full state.
      if (targetMinion.hp > 0) {
        const otherSide = sideName === "player" ? "enemy" : "player";
        fireAbility(state, otherSide, targetMinion, "on_damaged");
      }
    }

    // Counter-damage from defender to attacker — same mod pipeline
    // mirrored: defender's weak nerfs its counter; attacker's
    // vulnerable amplifies what it takes back.
    let counter = targetMinion.atk;
    if (other.weakTurns > 0) counter = Math.floor(counter * 0.75);
    if (self.vulnerableTurns > 0) counter = Math.floor(counter * 1.5);
    counter = Math.max(0, counter);

    if (attacker.shielded && counter > 0) {
      attacker.shielded = false;
      atkLog(`🛡 ${attacker.name} 聖盾吸收`, "buff");
    } else if (counter > 0) {
      attacker.hp -= counter;
      if (attacker.hp > 0) {
        fireAbility(state, sideName, attacker, "on_damaged");
      }
    }
  }

  attacker.attacksRemaining -= 1;

  // Fire on_attack ability after attack resolves (while attacker still alive).
  if (attacker.hp > 0) {
    fireAbility(state, sideName, attacker, "on_attack");
  }

  // Lifesteal: attacker heals face for damage dealt.
  if (attacker.keywords.includes("lifesteal") && dealtToTarget > 0) {
    const healed = Math.min(dealtToTarget, 6);
    const before = self.hp;
    self.hp = Math.min(self.hpMax, self.hp + healed);
    const got = self.hp - before;
    if (got > 0) {
      atkLog(`${self.name} 吸血回復 +${got}`, "heal");
    }
  }

  cleanupDeadMinions(state);
  checkWin(state);
  return state;
}

/** Remove dead minions (hp <= 0) from both boards; fire deathrattle abilities
 *  before removal. Runs in a small fixpoint loop so chained deathrattles
 *  that kill each other don't orphan corpses. */
function cleanupDeadMinions(state: BattleState) {
  let iterations = 0;
  while (iterations < 5) {
    iterations++;
    let hadCleanup = false;
    for (const sideName of ["player", "enemy"] as const) {
      const s = state[sideName];
      const alive: Minion[] = [];
      for (const m of s.board) {
        if (m.hp > 0) {
          alive.push(m);
        } else {
          hadCleanup = true;
          state.log.push({
            turn: state.turn,
            side: sideName,
            kind: "debuff",
            text: `💀 ${m.name} 陣亡`,
          });
          // Fire deathrattle BEFORE removal so effect source still has
          // board context. This may kill other minions, which we catch
          // on the next iteration.
          fireAbility(state, sideName, m, "deathrattle");
        }
      }
      s.board = alive;
    }
    if (!hadCleanup) break;
  }
}

function checkWin(state: BattleState) {
  if (state.enemy.hp <= 0) {
    state.phase = "won";
    state.log.push({ turn: state.turn, side: "player", kind: "phase", text: "勝利 — 帷幕歸你所有" });
  } else if (state.player.hp <= 0) {
    state.phase = "lost";
    state.log.push({ turn: state.turn, side: "enemy", kind: "phase", text: "失敗 — 你的信徒散去" });
  } else if (state.turn > MAX_BATTLE_TURNS) {
    // Stall-out guard. Both sides drained / confused loop / deck empty —
    // declare the player the loser so we never hang.
    state.phase = "lost";
    state.log.push({
      turn: state.turn,
      side: "enemy",
      kind: "phase",
      text: `帷幕已封閉 — 第 ${MAX_BATTLE_TURNS} 回合後判負`,
    });
  }
}

/**
 * One-time starting-hand mulligan. Each card whose hand index is in
 * `swapIndices` is sent to the bottom of the deck and replaced by a
 * fresh draw, in roughly the same way Hearthstone does it. Only valid
 * before any cards have been played (turn 1, no plays yet) so it can't
 * be abused mid-battle.
 *
 * Empty `swapIndices` is allowed — it produces a "keep everything" log
 * entry without touching the deck so the call site can use this as the
 * single resolution point regardless of player choice.
 */
export function applyMulligan(
  state: BattleState,
  sideName: "player" | "enemy",
  swapIndices: number[],
): BattleState {
  if (state.phase !== "player_turn") return state;
  if (state.turn > 1) return state;
  const self = state[sideName];
  if (self.combosThisTurn > 0) return state; // already played a card

  if (swapIndices.length === 0) {
    state.log.push({
      turn: 1,
      side: sideName,
      kind: "draw",
      text: "保留全部起手牌",
    });
    return state;
  }

  // Splice out swap targets in descending order so subsequent splices
  // don't shift indices we haven't visited yet.
  const sorted = [...new Set(swapIndices)].sort((a, b) => b - a);
  const removed: BattleCard[] = [];
  for (const idx of sorted) {
    if (idx < 0 || idx >= self.hand.length) continue;
    const card = self.hand.splice(idx, 1)[0];
    if (card) removed.push(card);
  }

  // Bottom of the deck so the player can't immediately re-draw the same
  // duds (matches HS-style mulligan rather than reshuffle).
  self.deck.push(...removed);
  draw(self, removed.length, state.log, state.turn, sideName);
  state.log.push({
    turn: 1,
    side: sideName,
    kind: "draw",
    text: `重抽 ${removed.length} 張起手牌`,
  });
  return state;
}

export function endPlayerTurn(state: BattleState): BattleState {
  if (state.phase !== "player_turn") return state;
  // Fire end_of_turn for all player minions before flipping sides.
  for (const m of [...state.player.board]) {
    fireAbility(state, "player", m, "end_of_turn");
  }
  cleanupDeadMinions(state);
  checkWin(state);
  if (state.phase !== "player_turn") return state; // might have died
  state.phase = "enemy_turn";
  state.log.push({ turn: state.turn, side: "enemy", kind: "phase", text: `敵人回合` });
  applyStartOfTurnEffects(state, "enemy");
  return state;
}

export function endEnemyTurn(state: BattleState): BattleState {
  if (state.phase !== "enemy_turn") return state;
  // Fire end_of_turn for all enemy minions before flipping sides.
  for (const m of [...state.enemy.board]) {
    fireAbility(state, "enemy", m, "end_of_turn");
  }
  cleanupDeadMinions(state);
  checkWin(state);
  if (state.phase !== "enemy_turn") return state;
  state.turn += 1;
  state.phase = "player_turn";
  state.log.push({ turn: state.turn, side: "player", kind: "phase", text: `第 ${state.turn} 回合 · 你的回合` });
  applyStartOfTurnEffects(state, "player");
  return state;
}

function applyStartOfTurnEffects(state: BattleState, sideName: "player" | "enemy") {
  const self = state[sideName];

  // Reset per-turn combo counter
  self.combosThisTurn = 0;

  // Reset minion attack-availability. Minions summoned previous turn now
  // lose their summoning sickness; every minion (fresh summons without
  // charge excepted) gets its attacks refreshed.
  for (const m of self.board) {
    m.summonedThisTurn = false;
    const windfury = m.keywords.includes("windfury");
    m.attacksRemaining = windfury ? 2 : 1;
  }

  // Start-of-turn abilities fire for every minion on the side starting.
  // Iterate a snapshot because abilities could mutate the board.
  for (const m of [...self.board]) {
    fireAbility(state, sideName, m, "start_of_turn");
  }
  cleanupDeadMinions(state);

  // Curse tick (decays)
  if (self.curseStacks > 0) {
    const dmg = self.curseStacks;
    self.hp = Math.max(0, self.hp - dmg);
    state.log.push({ turn: state.turn, side: sideName, kind: "damage", text: `${self.name} 詛咒傷害 -${dmg}` });
    self.curseStacks = Math.max(0, self.curseStacks - 1);
  }

  // Poison tick (does NOT decay — sticks until cleansed)
  if (self.poison > 0) {
    const dmg = self.poison;
    self.hp = Math.max(0, self.hp - dmg);
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "damage",
      text: `☠️ ${self.name} 中毒 −${dmg}`,
    });
  }

  // Vulnerable / weak timers decay
  if (self.vulnerableTurns > 0) self.vulnerableTurns -= 1;
  if (self.weakTurns > 0) self.weakTurns -= 1;

  // Mana refill + cap grow
  self.manaMax = Math.min(self.manaCeiling, self.manaMax + 1);
  self.mana = self.manaMax;

  // Draw 1
  draw(self, 1, state.log, state.turn, sideName);

  // Echo: if a card was queued, replay it at 50% power without retriggering echo.
  if (self.echoPending && self.hp > 0) {
    const pending = self.echoPending;
    self.echoPending = null;
    state.log.push({
      turn: state.turn,
      side: sideName,
      kind: "buff",
      text: `🔁 回響重現:${pending.name}`,
    });
    resolveCardEffect(state, sideName, pending, {
      powerScale: 0.5,
      ignoreKeywords: ["echo", "sacrifice", "whisper"],
    });
  }

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
