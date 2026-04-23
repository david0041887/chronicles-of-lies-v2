import { attackWithMinion, playCard } from "./engine";
import type { BattleCard, BattleState, LogEntry, SideState } from "./types";

export interface EnemyIntent {
  /** Summed raw power of attack/ritual/debuff/confuse cards they plan to play. */
  damage: number;
  /** Summed heal/spread power they plan on themselves. */
  heals: number;
  /** Total cards they intend to play this turn (≤ MAX_PLAYS). */
  cardCount: number;
  /** Ordered list of intended card types (truncated to first 4 for display). */
  actions: string[];
  /** True if the enemy is confused and will skip its turn entirely. */
  confused: boolean;
}

/**
 * Run the enemy's entire turn: play cards greedily per a simple heuristic
 * until out of mana or out of affordable cards, then attack with any
 * minions that have attacks remaining. Mutates state in place.
 *
 * For staged playback (one action per animation tick), see runEnemyStep
 * — the client uses that so each play / attack is visible instead of
 * batched into one state mutation.
 */
export function runEnemyTurn(state: BattleState) {
  if (state.phase !== "enemy_turn") return;
  const SAFETY = 25;
  for (let i = 0; i < SAFETY; i++) {
    const step = runEnemyStep(state);
    if (step.done) return;
  }
}

export type EnemyStepResult =
  | { done: true }
  | { done: false; kind: "play"; cardName: string; cardType: string }
  | { done: false; kind: "attack"; attackerName: string; target: "face" | "minion" };

/**
 * Perform exactly one enemy action (either play one card or resolve one
 * minion attack), mutating state in place. Returns metadata about what
 * happened so the client can animate / delay between steps.
 *
 * Returns `{ done: true }` once the enemy has nothing more to do this
 * turn. Callers should stop looping on `done`.
 */
export function runEnemyStep(state: BattleState): EnemyStepResult {
  if (state.phase !== "enemy_turn") return { done: true };

  // Prefer playing a card if any is affordable.
  const playable = state.enemy.hand
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.cost <= state.enemy.mana);
  if (playable.length > 0) {
    const pick = choose(state, playable);
    const card = pick.c;
    playCard(state, "enemy", pick.i);
    return {
      done: false,
      kind: "play",
      cardName: card.name,
      cardType: card.type,
    };
  }

  // Otherwise attack with one minion.
  const attacker = state.enemy.board.find(
    (m) => !m.summonedThisTurn && m.attacksRemaining > 0,
  );
  if (!attacker) return { done: true };

  const taunts = state.player.board.filter((m) => m.keywords.includes("taunt"));
  let target: { kind: "face" } | { kind: "minion"; uid: string };
  if (taunts.length > 0) {
    const t = [...taunts].sort((a, b) => a.hp - b.hp)[0];
    target = { kind: "minion", uid: t.uid };
  } else if (state.player.board.length > 0) {
    const killable = state.player.board.find(
      (m) => m.hp <= attacker.atk && attacker.hp > m.atk,
    );
    if (killable) {
      target = { kind: "minion", uid: killable.uid };
    } else if (attacker.atk >= state.player.hp / 3) {
      target = { kind: "face" };
    } else {
      const weakest = [...state.player.board].sort((a, b) => a.hp - b.hp)[0];
      target = { kind: "minion", uid: weakest.uid };
    }
  } else {
    target = { kind: "face" };
  }

  attackWithMinion(state, "enemy", attacker.uid, target);
  return {
    done: false,
    kind: "attack",
    attackerName: attacker.name,
    target: target.kind,
  };
}

function choose(
  state: BattleState,
  playable: { c: BattleCard; i: number }[],
): { c: BattleCard; i: number } {
  // Keyword-aware scorer. Higher total = better pick for this game state.
  const self = state.enemy;
  const other = state.player;
  const enemyHpPct = self.hp / self.hpMax;
  const playerHpPct = other.hp / other.hpMax;
  const combosSoFar = self.combosThisTurn;

  const scored = playable.map(({ c, i }) => {
    const kw = (k: string) => c.keywords.includes(k);
    const isAttack =
      c.type === "attack" || c.type === "ritual" || c.type === "debuff";
    const isHeal = c.type === "heal" || c.type === "spread";
    const isBuff = c.type === "buff";

    // Base value: higher power is good, higher cost proxies for impact.
    let score = c.power + c.cost * 0.4;

    // Pay a bit more for cards that hoard mana vs cheap cards so the AI
    // doesn't spam 1-cost filler when it has a heavy card in hand.
    if (c.cost >= 4) score += 1.5;

    // ── State-aware aggression: when the player is weak or has low shield,
    //    push damage; scale attack value with vulnerable state on player.
    if (isAttack) {
      if (playerHpPct < 0.3) score += 4;       // finisher window
      if (other.shield === 0) score += 1.5;    // no shield = uncontested hit
      if (other.vulnerableTurns > 0) score += c.power * 0.5; // exploit vuln
      if (kw("pierce") && other.shield > 0) score += other.shield * 0.6;
      if (kw("lifesteal") && enemyHpPct < 0.6) score += 3;   // sustain
      if (kw("poison")) score += 3;                          // cheap DoT stacks
      if (kw("vulnerable") && other.vulnerableTurns === 0) score += 3;
      if (kw("weaken") && other.weakTurns === 0) score += 2.5;
      if (kw("charm") && other.charmStacks === 0) score += 2;
      if (kw("combo")) {
        // combo pays off once we've played 2+ cards this turn.
        score += combosSoFar >= 2 ? 4 : combosSoFar === 1 ? 1 : -1;
      }
    }

    // ── Defense / sustain: heal priority ramps as enemy HP drops.
    if (isHeal) {
      if (enemyHpPct < 0.3) score += 6;
      else if (enemyHpPct < 0.6) score += 2;
      else score -= 1; // avoid over-healing at full HP
      if (kw("shield") && enemyHpPct < 0.7) score += 1.5;
      if (kw("lifesteal")) score += 1;
    }

    // ── Buff cards: worth most when a heavy hitter still in hand.
    if (isBuff) {
      const heavyInHand = self.hand.some(
        (h) => h !== c && (h.type === "attack" || h.type === "ritual") && h.power >= 5,
      );
      if (heavyInHand && self.buffNextCard === 1) score += 3.5;
      else score -= 1;
      if (kw("strength")) score += 2;
      if (kw("resonance")) score += 0.5;
    }

    // ── Confuse: valuable only if player isn't already shut down.
    if (c.type === "confuse") {
      if (other.confusedTurns === 0 && playerHpPct > 0.4) score += 4;
      if (kw("charm")) score += 1.5;
    }

    // Penalise echo when we're already queued (can't stack more).
    if (kw("echo") && self.echoPending) score -= 2;
    // Sacrifice only worth it if we have junk in hand.
    if (kw("sacrifice") && self.hand.length <= 2) score -= 2;

    return { c, i, score };
  });

  // Highest-score wins. Tiebreak by power then by cost (prefer impact).
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.c.power !== a.c.power) return b.c.power - a.c.power;
    return b.c.cost - a.c.cost;
  });

  const top = scored[0];
  return { c: top.c, i: top.i };
}

// ────────────────────────────────────────────────────────────────────────────
// Enemy intent preview (Slay-the-Spire style)
// ────────────────────────────────────────────────────────────────────────────

function cloneSide(s: SideState): SideState {
  return {
    ...s,
    deck: [...s.deck],
    hand: [...s.hand],
    discard: [...s.discard],
    // Deep-copy minions so the simulation can mutate HP/attacks without
    // touching the live board.
    board: s.board.map((m) => ({ ...m, keywords: [...m.keywords] })),
  };
}

function cloneState(s: BattleState): BattleState {
  return {
    ...s,
    player: cloneSide(s.player),
    enemy: cloneSide(s.enemy),
    log: [...s.log],
    playerPlays: [...s.playerPlays],
  };
}

/**
 * Returns a read-only preview of what the enemy intends to do *next* turn.
 * This simulates the enemy's turn on a deep clone of the state: mana refill,
 * draw one, curse tick, then the same greedy AI that runEnemyTurn uses.
 *
 * The real state is not mutated.
 */
export function previewEnemyIntent(state: BattleState): EnemyIntent {
  // Only meaningful when it's the player's turn (or we're transitioning).
  const sim = cloneState(state);

  // If the enemy is currently confused, next enemy turn is skipped entirely.
  if (sim.enemy.confusedTurns > 0) {
    return { damage: 0, heals: 0, cardCount: 0, actions: [], confused: true };
  }

  // Simulate enemy start-of-turn effects (mirror of applyStartOfTurnEffects).
  // Curse tick (non-lethal for preview purposes — we don't care about damage
  // numbers on enemy, only what they'll play).
  if (sim.enemy.curseStacks > 0) {
    sim.enemy.hp = Math.max(0, sim.enemy.hp - sim.enemy.curseStacks);
    sim.enemy.curseStacks = Math.max(0, sim.enemy.curseStacks - 1);
  }
  sim.enemy.manaMax = Math.min(
    sim.enemy.manaCeiling,
    sim.enemy.manaMax + 1,
  );
  sim.enemy.mana = sim.enemy.manaMax;

  // Simulate draw of 1 card at turn start.
  if (sim.enemy.hand.length < 5) {
    if (sim.enemy.deck.length === 0 && sim.enemy.discard.length > 0) {
      sim.enemy.deck = [...sim.enemy.discard];
      sim.enemy.discard = [];
    }
    const top = sim.enemy.deck.shift();
    if (top) sim.enemy.hand.push(top);
  }

  // Flip phase so runEnemyTurn runs on the clone.
  sim.phase = "enemy_turn";
  const logStart = sim.log.length;
  runEnemyTurn(sim);
  const fresh = sim.log.slice(logStart);

  // Read the intent from the "play" entries the simulation recorded.
  let damage = 0;
  let heals = 0;
  const actions: string[] = [];
  for (const entry of fresh as LogEntry[]) {
    if (entry.kind !== "play" || entry.side !== "enemy") continue;
    const m = entry.text.match(/\(([a-z]+)\s+(\d+)\)/);
    if (!m) continue;
    const type = m[1];
    const power = parseInt(m[2], 10) || 0;
    actions.push(type);
    if (type === "attack" || type === "ritual" || type === "debuff") {
      damage += power;
    } else if (type === "heal" || type === "spread") {
      heals += power;
    }
  }

  // Include the echo-pending card in the intent preview — it auto-replays
  // at 50% power at start of next enemy turn, separate from the normal
  // play rotation. Prepend it so the player sees the echo hit first.
  if (state.enemy.echoPending) {
    const echo = state.enemy.echoPending;
    const half = Math.max(1, Math.floor(echo.power * 0.5));
    actions.unshift(echo.type);
    if (echo.type === "attack" || echo.type === "ritual" || echo.type === "debuff") {
      damage += half;
    } else if (echo.type === "heal" || echo.type === "spread") {
      heals += half;
    }
  }

  // Minion attacks: estimate via cloned-state HP diff. Sim already ran
  // runEnemyTurn → runEnemyMinionAttacks, so sim.player.hp < state.player.hp
  // captures net minion damage (after player's shields + armour).
  const minionDamage = Math.max(0, state.player.hp - sim.player.hp);
  if (minionDamage > 0) {
    damage += minionDamage;
    // Represent each attacking minion as an "attack" action.
    const hitters = state.enemy.board.filter(
      (m) => !m.summonedThisTurn && m.attacksRemaining > 0,
    ).length;
    for (let i = 0; i < Math.min(hitters, 2); i++) actions.push("attack");
  }

  return {
    damage,
    heals,
    cardCount: actions.length,
    actions: actions.slice(0, 4),
    confused: false,
  };
}
