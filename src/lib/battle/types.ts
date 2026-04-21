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
  hasImage?: boolean;
  imageUrl?: string | null;
}

export interface SideState {
  name: string;
  hp: number;                 // 信徒 (believers)
  hpMax: number;
  mana: number;
  manaMax: number;            // grows each turn up to 10
  deck: BattleCard[];
  hand: BattleCard[];
  discard: BattleCard[];
  shield: number;             // block next N damage
  buffNextCard: number;       // multiplies next played card's power
  curseStacks: number;        // damage per turn
  confusedTurns: number;      // >0 = skip turn(s)
}

export type BattlePhase = "starting" | "player_turn" | "enemy_turn" | "won" | "lost";

export interface BattleState {
  phase: BattlePhase;
  turn: number;               // full round count (player+enemy = 1 turn)
  player: SideState;
  enemy: SideState;
  log: LogEntry[];
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
