import { playCard } from "./engine";
import type { BattleCard, BattleState } from "./types";

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
