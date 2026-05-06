/**
 * Single source of truth for "can the attacker kill the defender this
 * turn?" — used both by:
 *   · BattleClient to drive the player-side 致命斬 banner over the
 *     enemy face when the player can finish the fight
 *   · ai.ts choose() and minion-target picker to bias the enemy AI
 *     toward closing the kill instead of trading or healing
 *
 * Both sides need IDENTICAL math so the two indicators stay symmetric:
 * if the player sees the lethal banner, the engine + AI better act on
 * the same evaluation from the other side.
 *
 * Conservative by design — skip combo / sacrifice / buffNextCard
 * multipliers because they'd require play-order simulation. Errs on
 * the side of NOT flagging lethal that depends on a specific play
 * sequence; never flags lethal that isn't there.
 *
 * Modifiers we DO model (these are flat / monotonic):
 *   · strength       — adds N power to every played card permanently
 *   · damageBonus    — boss enrage adds +2 to every played card
 *                      (minion atk already bakes this in at summon
 *                      time, so we only add it for hand cards)
 *   · weak (attacker)    — −25% outgoing on the whole pool
 *   · vulnerable (defender) — +50% incoming on the whole pool
 *   · pierce (per source) — skips defender shield
 *   · debuff card type    — engine deals 0.7× power
 */

import type { BattleCard, Minion, SideState } from "./types";

interface DamageSide {
  hp: number;
  shield: number;
  hand: BattleCard[];
  board: Minion[];
  mana: number;
  /** Permanent +N power per play (engine: rawPower = (power + strength) × …). */
  strength: number;
  /** Boss enrage flat add — +N to every card (and minion atk at summon
   *  time, which is already baked into m.atk). */
  damageBonus?: number;
  /** Attacker weak — outgoing −25%. */
  weakTurns: number;
}

interface DefenderSide {
  hp: number;
  shield: number;
  /** Vulnerable — incoming +50%. */
  vulnerableTurns: number;
  /** Taunt minions on the defender's board block face damage. */
  board: Minion[];
}

/**
 * Returns true when `attacker` can kill `defender` THIS TURN with
 * resources currently available (board minions + affordable hand
 * cards) under the modifiers above.
 */
export function canLethal(
  attacker: DamageSide,
  defender: DefenderSide,
): boolean {
  if (defender.hp <= 0) return false;
  // Taunt minions block the face — can't lethal until they're cleared,
  // which a single-turn projection can't safely model.
  if (defender.board.some((m) => m.keywords.includes("taunt"))) return false;

  let pierceRaw = 0;
  let normalRaw = 0;

  // Board minions — count attacksRemaining (covers windfury partial
  // usage and charge / non-charge alike). Minion atk already includes
  // the attacker-side damageBonus that was baked in at summon time.
  for (const m of attacker.board) {
    if (m.summonedThisTurn) continue;
    if (m.attacksRemaining <= 0) continue;
    const swingDmg = m.atk * m.attacksRemaining;
    if (m.keywords.includes("pierce")) pierceRaw += swingDmg;
    else normalRaw += swingDmg;
  }

  // Hand cards — greedily play cheapest-first until mana runs out.
  let mana = attacker.mana;
  const hand = [...attacker.hand]
    .filter((c) => c.type === "attack" || c.type === "ritual" || c.type === "debuff")
    .sort((a, b) => a.cost - b.cost);
  const flatBonus = attacker.strength + (attacker.damageBonus ?? 0);
  for (const c of hand) {
    if (c.cost > mana) continue;
    mana -= c.cost;
    // Engine: rawPower = (power + strength) × buffNextCard + sacrificeBonus
    // + damageBonus. We skip buffNextCard (would require ordering) and
    // sacrificeBonus (conditional on having junk to discard); add the
    // flat strength + damageBonus components.
    const rawPower = c.power + flatBonus;
    const factor = c.type === "debuff" ? 0.7 : 1;
    const cardDmg = Math.floor(rawPower * factor);
    if (c.keywords.includes("pierce")) pierceRaw += cardDmg;
    else normalRaw += cardDmg;
  }

  // Apply attacker weak / defender vulnerable to the whole pool.
  const weakMul = attacker.weakTurns > 0 ? 0.75 : 1;
  const vulnMul = defender.vulnerableTurns > 0 ? 1.5 : 1;
  const totalMul = weakMul * vulnMul;
  const pierce = Math.floor(pierceRaw * totalMul);
  const normal = Math.floor(normalRaw * totalMul);

  // Pierce always lands; normal absorbed by shield first.
  const dmgToHp = pierce + Math.max(0, normal - defender.shield);
  return dmgToHp >= defender.hp;
}

/** Convenience wrappers tied to the BattleState shape. */
export function playerCanLethalEnemy(state: {
  player: SideState;
  enemy: SideState;
}): boolean {
  return canLethal(state.player, state.enemy);
}

export function enemyCanLethalPlayer(state: {
  player: SideState;
  enemy: SideState;
}): boolean {
  return canLethal(state.enemy, state.player);
}
