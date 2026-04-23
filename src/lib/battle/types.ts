import type { Rarity } from "@prisma/client";

export type BattleSide = "player" | "enemy";

export interface BattleCard {
  id: string;                 // card template id
  uid: string;                // unique instance id within battle (for deterministic ordering)
  name: string;
  nameEn?: string | null;
  eraId: string;
  rarity: Rarity;
  type: string;               // attack/spread/heal/confuse/buff/debuff/ritual
  cost: number;
  power: number;
  keywords: string[];
  flavor?: string | null;
  hasImage?: boolean;
  imageUrl?: string | null;
}

/**
 * A summoned creature on the board. Persists across turns, attacks each
 * turn (once by default, twice with `windfury`). Dies when hp <= 0 and is
 * removed at cleanup time.
 */
export interface Minion {
  uid: string;                 // unique within battle
  cardId: string;              // originating card template id
  name: string;
  rarity: Rarity;
  eraId: string;
  hpMax: number;
  hp: number;
  atk: number;
  keywords: string[];          // minion-facing: taunt/charge/divine_shield/deathrattle/windfury + shared: pierce/lifesteal
  /** Can't attack on the turn summoned unless the minion has `charge`. */
  summonedThisTurn: boolean;
  /** Reset to 1 (or 2 with windfury) each turn. */
  attacksRemaining: number;
  /** Divine-shield state: one-time free absorb. */
  shielded: boolean;
  imageUrl?: string | null;
  hasImage?: boolean;
  flavor?: string | null;
}

export const MAX_BOARD_SIZE = 5;

export interface SideState {
  name: string;
  hp: number;                 // 信徒 (believers)
  hpMax: number;
  mana: number;
  manaMax: number;            // grows each turn up to manaCeiling
  manaCeiling: number;        // hard cap on manaMax (10 base, + weaver perk)
  deck: BattleCard[];
  hand: BattleCard[];
  discard: BattleCard[];
  board: Minion[];            // summoned creatures — max MAX_BOARD_SIZE
  shield: number;             // block next N damage
  buffNextCard: number;       // multiplies next played card's power
  curseStacks: number;        // damage per turn; decays 1/turn
  confusedTurns: number;      // >0 = skip turn(s)
  /** BOSS/Prime enrage HP threshold (0..1). Optional — only present on
   *  bosses. When HP first drops below this fraction, enrage fires. */
  enrageAt?: number;
  /** True after enrage has triggered (prevents re-firing). */
  enraged?: boolean;
  /** Permanent power bonus on every outgoing card (stacks with buffNextCard). */
  damageBonus?: number;

  // ── NEW status effects (applied by keyword-bearing cards) ──

  /** Poison stacks — deal 1 DoT per stack per turn; does NOT decay. */
  poison: number;
  /** Turns remaining with +50% incoming damage. */
  vulnerableTurns: number;
  /** Turns remaining with −25% outgoing damage. */
  weakTurns: number;
  /** Permanent additive power bonus on every played card. */
  strength: number;
  /** A card queued by echo keyword to replay at 50% power next turn. */
  echoPending?: BattleCard | null;
  /** Incoming-attack reflection counter (from charm keyword). */
  charmStacks: number;
  /** Reset each turn — counts player's plays, used by combo keyword. */
  combosThisTurn: number;
}

export type BattlePhase = "starting" | "player_turn" | "enemy_turn" | "won" | "lost";

export interface BattleState {
  phase: BattlePhase;
  turn: number;               // full round count (player+enemy = 1 turn)
  player: SideState;
  enemy: SideState;
  log: LogEntry[];
  /** Player-played card template ids, in order. Used post-battle for auto-spread accounting. */
  playerPlays: string[];
  /** Monotonic random seed for deterministic replays (client seeds server validation) */
  seed: number;
}

export interface LogEntry {
  turn: number;
  side: BattleSide;
  kind: "play" | "draw" | "damage" | "heal" | "buff" | "debuff" | "phase";
  text: string;
  data?: Record<string, unknown>;
}

export interface BattleResult {
  stageId: string;
  won: boolean;
  turnsElapsed: number;
  playerHpEnd: number;
  enemyHpEnd: number;
}
