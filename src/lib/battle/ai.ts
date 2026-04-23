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
  const enemyHpPct = state.enemy.hp / state.enemy.hpMax;
  const playerHpPct = state.player.hp / state.player.hpMax;

  if (enemyHpPct < 0.3) {
    const heal = playable.find(({ c }) => c.type === "heal" || c.type === "spread");
    if (heal) return heal;
  }
  if (playerHpPct < 0.25) {
    const atk = [...playable]
      .filter(({ c }) => c.type === "attack" || c.type === "ritual")
      .sort((a, b) => b.c.power - a.c.power)[0];
    if (atk) return atk;
  }
  return [...playable].sort((a, b) => {
    const aScore = a.c.power + a.c.cost * 0.6;
    const bScore = b.c.power + b.c.cost * 0.6;
    return bScore - aScore;
  })[0];
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

  return {
    damage,
    heals,
    cardCount: actions.length,
    actions: actions.slice(0, 4),
    confused: false,
  };
}
