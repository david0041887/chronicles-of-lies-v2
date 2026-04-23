"use client";

import { BattleClient } from "@/app/(game)/battle/[stageId]/BattleClient";
import type { BattleCard } from "@/lib/battle/types";
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

const TUTORIAL_TIPS: { icon: string; title: string; body: string }[] = [
  {
    icon: "⚡",
    title: "信仰池 = 你的行動力",
    body: "每回合 +1 最大值。打出卡需要消耗對應的信仰點。",
  },
  {
    icon: "⚔️",
    title: "攻擊削減信徒(HP)",
    body: "護盾先吸收,超出才扣血。帶 pierce 的攻擊會穿透護盾。",
  },
  {
    icon: "☠️",
    title: "狀態疊加是致勝關鍵",
    body: "毒每回合持續扣血,破綻讓敵人受傷 +50%,虛弱讓敵人輸出 -25%。",
  },
  {
    icon: "🔗",
    title: "連擊有獎勵",
    body: "同一回合打出第 3 張牌起,帶 combo 關鍵字的卡會 +50% 威力。",
  },
];

/**
 * Thin wrapper that renders BattleClient in tutorial mode.
 * Tutorial-specific behavior:
 *   - Posts to /api/tutorial/complete instead of /api/battle/complete
 *   - Auto-leaves to /home (not /era/[id]) on result
 *   - Rewards panel shows "starter deck + 10-pull" instead of resources
 *   - Shows a 4-slide primer overlay before the fight begins
 */
export function TutorialClient(props: Props) {
  const [introStep, setIntroStep] = useState(0);
  const [introDone, setIntroDone] = useState(false);

  const stageWithRewards = {
    ...props.stage,
    mode: "normal" as const,
    rewardCrystals: 0,
    rewardExp: 0,
    rewardBelievers: 0,
  };

  if (!introDone) {
    const tip = TUTORIAL_TIPS[introStep];
    const last = introStep === TUTORIAL_TIPS.length - 1;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-veil/80 backdrop-blur-md">
        <div className="max-w-md w-full rounded-2xl border border-gold/40 bg-gradient-to-b from-veil to-[#120820] p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          <div className="text-6xl mb-3">{tip.icon}</div>
          <h2 className="display-serif text-2xl text-sacred mb-2">
            {tip.title}
          </h2>
          <p className="text-sm text-parchment/80 leading-relaxed mb-5 font-[family-name:var(--font-noto-serif)]">
            {tip.body}
          </p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {TUTORIAL_TIPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === introStep
                    ? "w-6 bg-gold"
                    : i < introStep
                      ? "w-1.5 bg-gold/50"
                      : "w-1.5 bg-parchment/20"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setIntroDone(true)}
              className="text-xs text-parchment/50 hover:text-parchment tracking-widest"
            >
              跳過
            </button>
            <button
              onClick={() => {
                if (last) setIntroDone(true);
                else setIntroStep((s) => s + 1);
              }}
              className="px-5 py-2 rounded-lg bg-gold text-veil font-semibold min-h-[44px]"
            >
              {last ? "開始戰鬥 →" : "下一步"}
            </button>
          </div>
          <p className="text-[10px] text-parchment/40 mt-4 tracking-widest">
            第 {introStep + 1} / {TUTORIAL_TIPS.length} 項提示
          </p>
        </div>
      </div>
    );
  }

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
