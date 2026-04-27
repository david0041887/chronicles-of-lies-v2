"use client";

/**
 * Contextual onboarding coach — shows ONE short tip at a time anchored to
 * the relevant region of the battle screen, advancing as the player
 * actually performs each step. Designed around the principles a good
 * tutorial follows:
 *
 *  · Show, don't tell — every tip points at the actual UI doing the
 *    thing, never explains in the abstract.
 *  · Pacing — one mechanic per tip, never a wall.
 *  · Positive feedback — a brief gold flash + check icon when each step
 *    completes (visible because tipKey changes), and a different
 *    message on win vs loss so a tutorial death isn't celebrated.
 *  · Safe environment — runs inside the existing tutorial battle, where
 *    failure has zero consequences.
 *  · Contextual — tooltips dock to the relevant region (hand/board/end
 *    turn / enemy intent), they never take over the full screen.
 *
 * Step state is computed purely from battle state; the coach uses
 * `maxStepReached` so once the player advances past a step it stays
 * past, even if the underlying state oscillates. Transitions also fire
 * a brief celebration overlay so the player FEELS the progress.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { BattleState } from "@/lib/battle/types";

const STEPS = [
  "intro",
  "tap_hand",
  "play_card",
  "end_turn",
  "mana_grew",
  "summon_minion",
  "attack_with_minion",
  "watch_intent",
  "victory",
] as const;
type StepKey = (typeof STEPS)[number] | "defeated";

interface StepDef {
  key: StepKey;
  /** Screen anchor — drives both the tooltip position and the spotlight
   *  pulse on the relevant region. */
  anchor: "center" | "hand" | "end-turn" | "player-board" | "enemy-board" | "intent";
  title: string;
  body: string;
  hint?: string;
  /** Whether to show a "Got it" button — false for steps that auto-advance
   *  on a player action (e.g., tapping a card, ending the turn). */
  manualAdvance?: boolean;
}

const STEP_DEFS: Record<StepKey, StepDef> = {
  intro: {
    key: "intro",
    anchor: "center",
    title: "歡迎來到帷幕之戰",
    body: "你扮演編織者,信徒(HP)歸零就敗。我會一步步帶你打完這場練習戰。",
    hint: "先按下方按鈕開始 →",
    manualAdvance: true,
  },
  tap_hand: {
    key: "tap_hand",
    anchor: "hand",
    title: "點選一張手牌",
    body: "下方是你的手牌。點任何一張看詳細資訊。",
    hint: "💡 試著點點看 ↓",
  },
  play_card: {
    key: "play_card",
    anchor: "hand",
    title: "打出這張卡",
    body: "確認效果後,按彈出視窗的「打出」按鈕花費信仰池來使用。",
  },
  end_turn: {
    key: "end_turn",
    anchor: "end-turn",
    title: "結束你的回合",
    body: "行動完成後按右下「結束回合」,輪到敵方動作。",
    hint: "→ 看看敵方如何回應",
  },
  mana_grew: {
    key: "mana_grew",
    anchor: "hand",
    title: "信仰池每回合 +1",
    body: "新回合開始 — 你的信仰池上限增加了,可以打更高費用的卡。",
    manualAdvance: true,
  },
  summon_minion: {
    key: "summon_minion",
    anchor: "hand",
    title: "召喚怪物到戰場",
    body: "SR 以上的攻擊/儀式卡會留在戰場成為神話怪物。試著打出一張看看。",
  },
  attack_with_minion: {
    key: "attack_with_minion",
    anchor: "player-board",
    title: "用怪物攻擊",
    body: "點你的怪物選為攻擊者,再點敵方怪物或臉結算。出場當回合會召喚沉睡 💤,下回合才能動。",
  },
  watch_intent: {
    key: "watch_intent",
    anchor: "intent",
    title: "敵方意圖預告",
    body: "右上「Next」告訴你敵方下回合會做什麼。用它判斷該補血、架嘲諷還是搶臉。",
    manualAdvance: true,
  },
  victory: {
    key: "victory",
    anchor: "center",
    title: "你掌握了基礎 ✨",
    body: "做得好 — 你已經理解帷幕的韻律。之後你還會在實戰中遇到更多機制(卡牌技能、狀態效果、副本…),但每個都會像今天這樣循序漸進地教你。",
    manualAdvance: true,
  },
  defeated: {
    key: "defeated",
    anchor: "center",
    title: "別擔心 — 教學失敗無懲罰",
    body: "練習關不會扣任何資源。你已經學會大部分操作了,獎勵照樣領取,正式遊戲再用熟練的姿態回來。",
    manualAdvance: true,
  },
};

/**
 * Compute which step the player is currently on, given the battle state
 * and the highest step they've already passed (so we never go backwards).
 */
function computeStep(
  state: BattleState,
  maxReached: StepKey,
  introDismissed: boolean,
  manualAdvancePassed: Set<StepKey>,
): StepKey {
  // Hard win/loss override — distinct ending screens so a tutorial loss
  // doesn't get a "you mastered it" message.
  if (state.phase === "lost") return "defeated";
  if (state.phase === "won") return "victory";

  const passedManual = (k: StepKey) => manualAdvancePassed.has(k);
  const maxIdx = STEPS.indexOf(maxReached as (typeof STEPS)[number]);
  const consider = (k: (typeof STEPS)[number]) =>
    Math.max(maxIdx, STEPS.indexOf(k));

  let idx = 0;
  // intro — manual dismiss
  if (!introDismissed) idx = STEPS.indexOf("intro");
  else idx = STEPS.indexOf("tap_hand");

  // tap_hand → play_card auto-advances when first card is played
  if (state.player.combosThisTurn >= 1) idx = consider("end_turn");

  // end_turn auto-advances when turn ticks past 1
  if (state.turn >= 2 && state.phase === "player_turn") {
    idx = consider("mana_grew");
    if (passedManual("mana_grew")) idx = consider("summon_minion");
  }

  // summon_minion auto-advances when player has any minion on board
  if (state.player.board.length > 0) idx = consider("attack_with_minion");

  // Skip-ahead — if the starter deck never gives the player an SR+ to
  // summon, don't strand them. After turn 4 has begun and they still
  // haven't produced a minion, jump past the minion-related steps so
  // they can still see the intent-preview lesson before victory.
  const stuckOnMinionTeach =
    state.turn >= 4 &&
    state.phase === "player_turn" &&
    state.player.board.length === 0;
  if (stuckOnMinionTeach) idx = consider("watch_intent");

  // attack_with_minion auto-advances after first attack
  const playerAttacked = state.log.some(
    (l) => l.data?.event === "minion_attack" && l.side === "player",
  );
  if (playerAttacked) idx = consider("watch_intent");

  // watch_intent is manual-advance
  if (passedManual("watch_intent")) idx = consider("victory");

  return STEPS[idx];
}

interface CoachProps {
  state: BattleState;
  /** Called when the coach has nothing left to teach (player dismissed
   *  the victory or defeated step) so the wrapper can hide the overlay. */
  onComplete?: () => void;
}

export function TutorialCoach({ state, onComplete }: CoachProps) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const [maxReached, setMaxReached] = useState<StepKey>("intro");
  const [manualPassed, setManualPassed] = useState<Set<StepKey>>(new Set());
  const [hidden, setHidden] = useState(false);
  /** Bumps when the step transitions, drives the "✓ 做得好!" celebration
   *  overlay so auto-advances feel rewarded instead of silent. */
  const [celebrateKey, setCelebrateKey] = useState(0);
  const prevStepRef = useRef<StepKey>("intro");

  const step = computeStep(state, maxReached, introDismissed, manualPassed);

  // Track highest step monotonically, fire celebration on transitions.
  useEffect(() => {
    if (step !== prevStepRef.current) {
      // Don't celebrate the very first render or end-state transitions —
      // those have their own dedicated screens.
      if (
        prevStepRef.current !== "intro" &&
        step !== "victory" &&
        step !== "defeated"
      ) {
        setCelebrateKey((k) => k + 1);
      }
      prevStepRef.current = step;
    }
    if (step !== "defeated") {
      const stepIdx = STEPS.indexOf(step as (typeof STEPS)[number]);
      const maxIdx = STEPS.indexOf(maxReached as (typeof STEPS)[number]);
      if (stepIdx > maxIdx) setMaxReached(step);
    }
  }, [step, maxReached]);

  if (hidden) return null;

  const def = STEP_DEFS[step];

  const advance = () => {
    if (def.key === "intro") {
      setIntroDismissed(true);
      return;
    }
    if (def.manualAdvance) {
      setManualPassed((s) => {
        const n = new Set(s);
        n.add(def.key);
        return n;
      });
      return;
    }
  };

  const dismissAll = () => {
    setHidden(true);
    onComplete?.();
  };

  const isVictory = step === "victory";
  const isDefeated = step === "defeated";
  const isEndState = isVictory || isDefeated;

  // Step number for progress display — only counts the linear journey,
  // not the end-state cards.
  const stepNum =
    step === "defeated"
      ? null
      : Math.max(1, Math.min(STEPS.length, STEPS.indexOf(step as (typeof STEPS)[number]) + 1));
  const totalSteps = STEPS.length;

  return (
    <>
      {/* Spotlight pulse — drawn over the relevant region so the player's
          eye lands on the right place even before reading the tooltip. */}
      <AnchorSpotlight anchor={def.anchor} />

      {/* Step-complete celebration — gold check appears briefly when an
          auto-advance fires, so the action they just performed feels
          rewarded instead of silent. */}
      <AnimatePresence>
        {celebrateKey > 0 && (
          <motion.div
            key={celebrateKey}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 1, 1.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.95, ease: "easeOut", times: [0, 0.2, 0.7, 1] }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
          >
            <div className="rounded-full bg-gold/95 text-veil w-14 h-14 flex items-center justify-center text-3xl font-bold shadow-[0_0_32px_rgba(212,168,75,0.8)]">
              ✓
            </div>
            <div className="mt-2 px-3 py-1 rounded-full bg-veil/90 border border-gold/60 text-gold text-xs tracking-widest font-[family-name:var(--font-cinzel)]">
              做得好
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={def.key}
          initial={{ opacity: 0, y: anchorOffset(def.anchor) }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: anchorOffset(def.anchor) * -0.5 }}
          transition={{ duration: 0.32, ease: [0.22, 0.97, 0.32, 1.08] }}
          className={anchorClass(def.anchor)}
        >
          <div
            className={cn(
              "pointer-events-auto rounded-xl border backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-4 py-3 max-w-sm",
              isDefeated
                ? "border-blood/50 bg-gradient-to-b from-veil/95 to-[#200810]/95"
                : "border-gold/50 bg-gradient-to-b from-veil/95 to-[#160820]/95",
            )}
          >
            {/* Progress bar — only for the linear journey */}
            {stepNum !== null && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gold/70 tracking-widest font-[family-name:var(--font-cinzel)] shrink-0">
                  {stepNum} / {totalSteps}
                </span>
                <div className="flex-1 h-1 rounded-full bg-parchment/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(stepNum / totalSteps) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-start gap-2 mb-1">
              <span
                className={cn(
                  "display-serif text-base leading-tight tracking-wide",
                  isDefeated ? "text-blood" : "text-gold",
                )}
              >
                {def.title}
              </span>
              <button
                onClick={dismissAll}
                className="ml-auto text-[10px] text-parchment/50 hover:text-parchment tracking-widest min-h-[28px] px-1.5 shrink-0"
                aria-label="關閉教學"
              >
                跳過
              </button>
            </div>
            <p className="text-xs text-parchment/85 leading-relaxed font-[family-name:var(--font-noto-serif)]">
              {def.body}
            </p>
            {def.hint && (
              <p className="text-[10px] text-gold/80 tracking-widest mt-2">
                {def.hint}
              </p>
            )}
            {def.manualAdvance && !isEndState && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={advance}
                  className="px-4 py-1.5 rounded-lg bg-gold text-veil font-semibold text-xs shadow-[0_2px_10px_rgba(212,168,75,0.4)] min-h-[36px]"
                >
                  知道了 →
                </button>
              </div>
            )}
            {isEndState && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={dismissAll}
                  className={cn(
                    "px-4 py-1.5 rounded-lg font-semibold text-xs min-h-[36px]",
                    isVictory
                      ? "bg-gold text-veil shadow-[0_2px_10px_rgba(212,168,75,0.4)]"
                      : "bg-blood/80 text-parchment shadow-[0_2px_10px_rgba(190,40,40,0.4)]",
                  )}
                >
                  {isVictory ? "完成 ✓" : "領取獎勵"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/**
 * Pulsing spotlight ring that draws attention to the area the current
 * step is teaching about. Uses absolute positioning + box-shadow so it
 * never blocks input — pure visual layer.
 */
function AnchorSpotlight({ anchor }: { anchor: StepDef["anchor"] }) {
  if (anchor === "center") return null;
  const positions: Record<string, string> = {
    hand: "bottom-3 left-2 right-2 h-[34vh] max-h-[260px] rounded-2xl",
    "end-turn": "bottom-[42vh] right-3 w-32 h-12 rounded-lg",
    "player-board": "bottom-[44vh] left-2 right-2 h-24 rounded-xl",
    "enemy-board": "top-[28%] left-2 right-2 h-24 rounded-xl",
    intent: "top-2 right-2 w-36 h-9 rounded-lg",
  };
  return (
    <motion.div
      key={anchor}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: [0.3, 0.85, 0.55], scale: [1, 1.02, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute pointer-events-none border-2 border-gold ${positions[anchor]}`}
      style={{
        boxShadow:
          "0 0 24px rgba(212,168,75,0.5), inset 0 0 16px rgba(212,168,75,0.2)",
      }}
      aria-hidden
    />
  );
}

function anchorClass(anchor: StepDef["anchor"]): string {
  const base = "absolute z-10 px-2";
  switch (anchor) {
    case "center":
      return `${base} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md`;
    case "hand":
      return `${base} bottom-[calc(34vh+12px)] left-1/2 -translate-x-1/2 max-w-md w-[92vw]`;
    case "end-turn":
      return `${base} bottom-[calc(42vh+60px)] right-2 max-w-xs`;
    case "player-board":
      return `${base} bottom-[calc(44vh+108px)] left-1/2 -translate-x-1/2 max-w-md w-[92vw]`;
    case "enemy-board":
      return `${base} top-[calc(28%+108px)] left-1/2 -translate-x-1/2 max-w-md w-[92vw]`;
    case "intent":
      return `${base} top-12 right-2 max-w-xs`;
  }
}

function anchorOffset(anchor: StepDef["anchor"]): number {
  switch (anchor) {
    case "center":
    case "hand":
    case "player-board":
      return 18;
    case "enemy-board":
    case "intent":
      return -18;
    case "end-turn":
      return 0;
    default:
      return 12;
  }
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
