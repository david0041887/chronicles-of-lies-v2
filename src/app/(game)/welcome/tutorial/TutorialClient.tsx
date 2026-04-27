"use client";

import { BattleClient } from "@/app/(game)/battle/[stageId]/BattleClient";
import { TutorialCoach } from "@/components/game/TutorialCoach";
import type { BattleCard, BattleState } from "@/lib/battle/types";
import { useState } from "react";

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
 * Onboarding wrapper that drops the player straight into the practice
 * battle and lets a context-aware <TutorialCoach/> guide them step by
 * step on the live UI.
 *
 * The previous version showed a 9-page primer before battle, which is
 * exactly the wall-of-text pattern good onboarding avoids. The coach
 * pattern (one tip, anchored to the relevant region, advancing as the
 * player actually plays) follows the "show, don't tell" guidance: every
 * concept is taught the moment it becomes relevant, against the actual
 * UI element doing the work, never up-front in the abstract.
 *
 * The full chaptered reference is still reachable from the lore page
 * for players who like to read everything.
 */
export function TutorialClient(props: Props) {
  const [coachComplete, setCoachComplete] = useState(false);

  const stageWithRewards = {
    ...props.stage,
    mode: "normal" as const,
    rewardCrystals: 0,
    rewardExp: 0,
    rewardBelievers: 0,
  };

  const renderCoach = (state: BattleState) =>
    coachComplete ? null : (
      <TutorialCoach state={state} onComplete={() => setCoachComplete(true)} />
    );

  return (
    <BattleClient
      stage={stageWithRewards}
      era={props.era}
      playerName={props.playerName}
      playerDeck={props.playerDeck}
      enemyDeck={props.enemyDeck}
      tutorialMode
      tutorialOverlay={renderCoach}
    />
  );
}
