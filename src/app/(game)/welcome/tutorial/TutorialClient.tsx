"use client";

import { BattleClient } from "@/app/(game)/battle/[stageId]/BattleClient";
import type { BattleCard } from "@/lib/battle/types";

interface Props {
  stage: {
    id: string;
    name: string;
    subtitle: string | null;
    difficulty: number;
    enemyHp: number;
    enemyName: string;
    isBoss: boolean;
    eraId: string;
  };
  era: {
    id: string;
    name: string;
    palette: { main: string; accent: string; dark: string };
    emoji: string;
  };
  playerName: string;
  playerDeck: BattleCard[];
  enemyDeck: BattleCard[];
}

/**
 * Thin wrapper that renders BattleClient in tutorial mode.
 * Tutorial-specific behavior:
 *   - Posts to /api/tutorial/complete instead of /api/battle/complete
 *   - Auto-leaves to /home (not /era/[id]) on result
 *   - Rewards panel shows "starter deck + 10-pull" instead of resources
 */
export function TutorialClient(props: Props) {
  const stageWithRewards = {
    ...props.stage,
    mode: "normal" as const,
    rewardCrystals: 0,
    rewardExp: 0,
    rewardBelievers: 0,
  };

  return (
    <BattleClient
      stage={stageWithRewards}
      era={props.era}
      playerName={props.playerName}
      playerDeck={props.playerDeck}
      enemyDeck={props.enemyDeck}
      tutorialMode
    />
  );
}
