import { playCard } from "./engine";
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
 * until out of mana or out of affordable cards. Mutates state in place.
 */
export function runEnemyTurn(state: BattleState) {
  if (state.phase !== "enemy_turn") return;

  const MAX_PLAYS = 5;
  for (let step = 0; step < MAX_PLAYS; step++) {
    if (state.phase !== "enemy_turn") return;
    const hand = state.enemy.hand;
    const playable = hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.cost <= state.enemy.mana);
    if (playable.length === 0) return;

    const pick = choose(state, playable);
    playCard(state, "enemy", pick.i);
  }
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

  return {
    damage,
    heals,
    cardCount: actions.length,
    actions: actions.slice(0, 4),
    confused: false,
  };
}
