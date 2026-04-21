/**
 * Offline battle simulator — runs createBattle + loops until win/lose
 * to verify engine state transitions don't hang or corrupt state.
 *
 *   npx tsx prisma/test-battle.ts
 */

import { PrismaClient } from "@prisma/client";
import { runEnemyTurn } from "../src/lib/battle/ai";
import {
  consumeConfusion,
  createBattle,
  endEnemyTurn,
  endPlayerTurn,
  isConfused,
  playCard,
} from "../src/lib/battle/engine";
import { buildStageDeck } from "../src/lib/battle/deck";
import type { BattleCard } from "../src/lib/battle/types";

const prisma = new PrismaClient();

function pickPlayerPlay(state: ReturnType<typeof createBattle>): number {
  // Greedy: play most-expensive affordable
  const options = state.player.hand
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.cost <= state.player.mana);
  if (options.length === 0) return -1;
  return options.sort((a, b) => b.c.cost - a.c.cost + b.c.power * 0.1 - a.c.power * 0.1)[0].i;
}

async function main() {
  // Build a test player deck: pick ~30 cards balanced across rarities
  const allCards = await prisma.card.findMany({
    where: { eraId: "egypt" },
  });
  if (allCards.length === 0) {
    console.error("No cards found for egypt. Seed cards first.");
    process.exit(1);
  }
  const playerDeck: BattleCard[] = [];
  for (let i = 0; i < 30; i++) {
    const c = allCards[i % allCards.length];
    playerDeck.push({
      id: c.id,
      uid: `p-${i}`,
      name: c.name,
      nameEn: c.nameEn,
      eraId: c.eraId,
      rarity: c.rarity,
      type: c.type,
      cost: c.cost,
      power: c.power,
      keywords: c.keywords,
    });
  }

  const stage = await prisma.stage.findUnique({ where: { id: "egypt_1" } });
  if (!stage) {
    console.error("Stage egypt_1 not found.");
    process.exit(1);
  }
  const enemyDeck = await buildStageDeck(stage.enemyDeck);

  const state = createBattle(
    "測試編織者",
    playerDeck,
    stage.enemyName,
    enemyDeck,
    stage.enemyHp,
  );

  let maxTurns = 50;
  let playerPlayedThisTurn = 0;
  const snapshots: string[] = [];

  while (state.phase !== "won" && state.phase !== "lost" && maxTurns-- > 0) {
    if (state.phase === "player_turn") {
      const idx = pickPlayerPlay(state);
      if (idx >= 0 && playerPlayedThisTurn < 5) {
        playCard(state, "player", idx);
        playerPlayedThisTurn++;
      } else {
        snapshots.push(
          `T${state.turn} P end — P:${state.player.hp}/${state.player.hpMax} E:${state.enemy.hp}/${state.enemy.hpMax} mana:${state.player.mana}/${state.player.manaMax} hand:${state.player.hand.length}`,
        );
        endPlayerTurn(state);
        playerPlayedThisTurn = 0;
      }
    } else if (state.phase === "enemy_turn") {
      if (isConfused(state, "enemy")) {
        consumeConfusion(state, "enemy");
      } else {
        runEnemyTurn(state);
      }
      if (state.phase === "enemy_turn") {
        snapshots.push(
          `T${state.turn} E end — P:${state.player.hp}/${state.player.hpMax} E:${state.enemy.hp}/${state.enemy.hpMax}`,
        );
        endEnemyTurn(state);
      }
    } else {
      break;
    }
  }

  console.log("===== BATTLE SIMULATION =====");
  for (const s of snapshots.slice(0, 20)) console.log(s);
  if (snapshots.length > 20) console.log(`... (${snapshots.length - 20} more)`);
  console.log("");
  console.log("=============================");
  console.log(`Phase:          ${state.phase}`);
  console.log(`Turns:          ${state.turn}`);
  console.log(`Player HP:      ${state.player.hp} / ${state.player.hpMax}`);
  console.log(`Enemy HP:       ${state.enemy.hp} / ${state.enemy.hpMax}`);
  console.log(`Log entries:    ${state.log.length}`);
  console.log(`Player mana:    ${state.player.mana} / ${state.player.manaMax}`);
  console.log(`Player hand:    ${state.player.hand.length}`);
  console.log(`Player deck:    ${state.player.deck.length}`);
  console.log(`Player discard: ${state.player.discard.length}`);
  console.log("=============================");

  if (state.phase !== "won" && state.phase !== "lost") {
    console.error("❌ Battle did not conclude within 50 turns — possible engine loop");
    process.exit(1);
  }
  console.log("✅ Battle concluded cleanly.");
}

main()
  .catch((e) => {
    console.error("❌ ENGINE CRASHED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
