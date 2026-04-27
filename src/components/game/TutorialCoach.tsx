"use client";

/**
 * Contextual onboarding coach — shows ONE short tip at a time anchored to
 * the relevant region of the battle screen, advancing as the player
 * actually performs each step. Designed around the principles the user
 * called out:
 *
 *  · Show, don't tell — every tip points at the actual UI doing the
 *    thing, never explains in the abstract.
 *  · Pacing — one mechanic per tip, never a wall.
 *  · Positive feedback — a brief gold flash + check icon when each step
 *    completes, before the next tip slides in.
 *  · Safe environment — runs inside the existing tutorial battle, where
 *    failure has zero consequences.
 *  · Contextual — tooltips dock to the relevant region (hand/board/end
 *    turn / enemy intent), they never take over the full screen.
 *
 * Step state is computed purely from battle state (no event hooks
 * needed); the coach uses `maxStepReached` so once the player advances
 * past a step it stays past, even if the underlying state oscillates.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
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
type StepKey = (typeof STEPS)[number];

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
    title: "你掌握了基礎",
    body: "繼續打到勝利就完成教學了。之後你還會在實戰中遇到更多機制 — 卡牌技能、狀態效果、副本…放心,每個都不難。",
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
  // Hard win override — collapse to victory regardless of where we were.
  if (state.phase === "won" || state.phase === "lost") return "victory";

  const passedManual = (k: StepKey) => manualAdvancePassed.has(k);
  const maxIdx = STEPS.indexOf(maxReached);
  const consider = (k: StepKey) => Math.max(maxIdx, STEPS.indexOf(k));

  let idx = 0;
  // intro — manual dismiss
  if (!introDismissed) idx = STEPS.indexOf("intro");
  else idx = STEPS.indexOf("tap_hand");

  // tap_hand → play_card auto-advances when first card is played
  // We use combosThisTurn as the indicator — engine increments it on each play.
  if (state.player.combosThisTurn >= 1) idx = consider("end_turn");

  // end_turn auto-advances when turn ticks past 1
  if (state.turn >= 2 && state.phase === "player_turn") {
    idx = consider("mana_grew");
    // mana_grew is manual-advance — once dismissed move to summon_minion
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

  // attack_with_minion auto-advances after first attack — detected via
  // log entries containing the minion_attack event from player side.
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
   *  the victory step) so the wrapper can hide the overlay. */
  onComplete?: () => void;
}

export function TutorialCoach({ state, onComplete }: CoachProps) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const [maxReached, setMaxReached] = useState<StepKey>("intro");
  const [manualPassed, setManualPassed] = useState<Set<StepKey>>(new Set());
  const [hidden, setHidden] = useState(false);

  const step = computeStep(state, maxReached, introDismissed, manualPassed);

  // Track highest step monotonically.
  useEffect(() => {
    if (STEPS.indexOf(step) > STEPS.indexOf(maxReached)) {
      setMaxReached(step);
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

  return (
    <>
      {/* Spotlight pulse — drawn over the relevant region so the player's
          eye lands on the right place even before reading the tooltip. */}
      <AnchorSpotlight anchor={def.anchor} />

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
          <div className="pointer-events-auto rounded-xl border border-gold/50 bg-gradient-to-b from-veil/95 to-[#160820]/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-4 py-3 max-w-sm">
            <div className="flex items-start gap-2 mb-1">
              <span className="display-serif text-base text-gold leading-tight tracking-wide">
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
            {def.manualAdvance && !isVictory && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={advance}
                  className="px-4 py-1.5 rounded-lg bg-gold text-veil font-semibold text-xs shadow-[0_2px_10px_rgba(212,168,75,0.4)] min-h-[36px]"
                >
                  知道了 →
                </button>
              </div>
            )}
            {isVictory && (
              <div className="flex justify-end mt-3">
                <button
                  onClick={dismissAll}
                  className="px-4 py-1.5 rounded-lg bg-gold text-veil font-semibold text-xs shadow-[0_2px_10px_rgba(212,168,75,0.4)] min-h-[36px]"
                >
                  完成 ✓
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
  // Slide direction so the tip enters from "the side it points at" — feels
  // like the UI itself is whispering, not a popup snapping in.
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
