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

interface Highlight {
  emoji: string;
  label: string;
  desc: string;
}

interface TutorialStep {
  icon: string;
  title: string;
  /** Long-form explanation — shown as paragraph */
  body?: string;
  /** Structured list of small cards — shown as grid */
  highlights?: Highlight[];
  /** Optional footer hint */
  hint?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // 1 — overview
  {
    icon: "⚔️",
    title: "帷幕之戰 · 兩位領袖的對決",
    body: "你與對手各自擁有一群「信徒」,信徒歸零就敗。每回合從牌堆抽 1 張,用信仰池作為資源打出各式卡牌 — 削減對手、擴張自己、召喚神話角色留場戰鬥。",
    hint: "目標:把對手的信徒打到 0。",
  },
  // 2 — mana
  {
    icon: "💠",
    title: "信仰池 — 行動力的來源",
    body: "回合開始時信仰池回滿。上限每回合 +1(最多至各時代上限)。費用越高的牌通常越強力,所以早期靠節奏、中後期靠爆發。",
    hint: "狀態列顯示「⚡ 現在/上限」。",
  },
  // 3 — card types
  {
    icon: "🎴",
    title: "卡牌類型 · 7 種節奏",
    highlights: [
      { emoji: "⚔️", label: "攻擊", desc: "直接削減對手信徒" },
      { emoji: "📢", label: "傳播", desc: "回信徒 + 抽 1 張" },
      { emoji: "💚", label: "恢復", desc: "大量補血 + 淨化負面" },
      { emoji: "🌀", label: "困惑", desc: "敵方下回合跳過" },
      { emoji: "⬆️", label: "強化", desc: "下一張牌威力 ×2" },
      { emoji: "⬇️", label: "削弱", desc: "攻擊 + 詛咒" },
      { emoji: "🔮", label: "儀式", desc: "高威力 + 詛咒 3 疊" },
    ],
    hint: "點擊手牌可看卡牌詳情與技能預覽。",
  },
  // 4 — status effects
  {
    icon: "☠️",
    title: "狀態效果 — 疊加勝負的關鍵",
    highlights: [
      { emoji: "☠", label: "中毒", desc: "每回合扣血,不衰減" },
      { emoji: "🩸", label: "破綻", desc: "受傷 +50%(2 回合)" },
      { emoji: "🪶", label: "虛弱", desc: "輸出 −25%(2 回合)" },
      { emoji: "🕯", label: "詛咒", desc: "每回合扣血,遞減" },
      { emoji: "💋", label: "魅惑", desc: "下張攻擊反傷自己" },
      { emoji: "🛡", label: "護盾", desc: "吸收下次傷害" },
    ],
    hint: "圖示會顯示在玩家資訊列上,點擊可看說明。",
  },
  // 5 — minion system
  {
    icon: "⭐",
    title: "怪物戰場 · SR+ 留場戰鬥",
    body: "SR 以上的攻擊/儀式卡打出後會變成「神話怪物」留在戰場(最多 5 隻/方),有自己的 ⚔ATK 與 ❤HP,每回合可以攻擊一次。出場當回合 💤 召喚沉睡,下回合才能動。",
    hint: "點自家怪物選攻擊者,再點敵方怪物或臉結算攻擊。",
  },
  // 6 — minion keywords
  {
    icon: "🛡",
    title: "怪物關鍵字",
    highlights: [
      { emoji: "🛡", label: "嘲諷 taunt", desc: "必須先處理它才能打臉或其他怪物" },
      { emoji: "✨", label: "聖盾 divine_shield", desc: "吸收一次傷害後消失" },
      { emoji: "⚡", label: "衝鋒 charge", desc: "出場當回合就能攻擊" },
      { emoji: "💨", label: "風怒 windfury", desc: "一回合可攻擊 2 次" },
      { emoji: "🗡", label: "穿透 pierce", desc: "攻擊無視護盾" },
      { emoji: "🩸", label: "吸血 lifesteal", desc: "造成傷害時等量回信徒" },
    ],
    hint: "怪物卡牌上會顯示對應圖示。",
  },
  // 7 — triggers
  {
    icon: "📜",
    title: "招牌技能 · SR+ 每張都有獨特效果",
    highlights: [
      { emoji: "📜", label: "戰吼 battlecry", desc: "出場時立刻觸發" },
      { emoji: "☠", label: "亡語 deathrattle", desc: "死亡時觸發" },
      { emoji: "🌅", label: "回合開始", desc: "我方回合開始時觸發" },
      { emoji: "🌙", label: "回合結束", desc: "我方回合結束時觸發" },
      { emoji: "⚔", label: "攻擊後", desc: "攻擊命中後附加效果" },
      { emoji: "🩸", label: "受擊", desc: "承受傷害時反擊" },
    ],
    hint: "怪物左下角的小圖示會顯示主要觸發類型。",
  },
  // 8 — intent preview
  {
    icon: "👁",
    title: "敵方意圖預告",
    body: "你的回合時,右上角會顯示「Next ⚔️📢… −預估傷害」— 告訴你敵方下回合會打出哪些類型、總傷害 / 補血預估。根據這個情報決定:搶臉?架嘲諷?先補血?還是先清場。",
    hint: "好好利用預告 — 是策略與運氣的分水嶺。",
  },
  // 9 — combo + turn flow
  {
    icon: "🔗",
    title: "連擊 × 結束回合",
    body: "同一回合第 3 張起,帶 combo 關鍵字的卡 +50% 威力。行動完成後點右下「結束回合」,敵方會一張一張演示動作。到你下回合信仰池回滿、抽 1 張,繼續。",
    hint: "耐心看對手動作 — 節奏是帷幕之舞的精髓。",
  },
];

/**
 * Thin wrapper that renders BattleClient in tutorial mode.
 * Tutorial-specific behavior:
 *   - Posts to /api/tutorial/complete instead of /api/battle/complete
 *   - Auto-leaves to /home (not /era/[id]) on result
 *   - Rewards panel shows "starter deck + 10-pull" instead of resources
 *   - Shows a multi-chapter primer overlay before the fight begins
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
    const tip = TUTORIAL_STEPS[introStep];
    const last = introStep === TUTORIAL_STEPS.length - 1;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-veil/85 backdrop-blur-md overflow-y-auto">
        <div className="max-w-lg w-full my-auto rounded-2xl border border-gold/40 bg-gradient-to-b from-veil to-[#120820] p-6 sm:p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          <div className="text-5xl sm:text-6xl mb-3">{tip.icon}</div>
          <h2 className="display-serif text-xl sm:text-2xl text-sacred mb-2 leading-tight">
            {tip.title}
          </h2>

          {tip.body && (
            <p className="text-sm text-parchment/80 leading-relaxed mb-4 font-[family-name:var(--font-noto-serif)] text-left px-1">
              {tip.body}
            </p>
          )}

          {tip.highlights && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-left">
              {tip.highlights.map((h) => (
                <div
                  key={h.label}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-parchment/10 bg-black/30"
                >
                  <span className="text-xl leading-none pt-0.5 shrink-0">{h.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-gold font-semibold tracking-wider mb-0.5">
                      {h.label}
                    </div>
                    <div className="text-[11px] text-parchment/75 leading-snug">
                      {h.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tip.hint && (
            <p className="text-[11px] text-gold/70 tracking-widest mb-4 border-t border-gold/15 pt-3">
              💡 {tip.hint}
            </p>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5 flex-wrap">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setIntroStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === introStep
                    ? "w-6 bg-gold"
                    : i < introStep
                      ? "w-1.5 bg-gold/50 hover:bg-gold/70"
                      : "w-1.5 bg-parchment/20 hover:bg-parchment/40"
                }`}
                aria-label={`跳至第 ${i + 1} 步`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setIntroDone(true)}
              className="text-xs text-parchment/50 hover:text-parchment tracking-widest min-h-[44px] px-3"
            >
              跳過
            </button>
            <div className="flex items-center gap-2">
              {introStep > 0 && (
                <button
                  onClick={() => setIntroStep((s) => Math.max(0, s - 1))}
                  className="px-3 py-2 rounded-lg border border-parchment/20 text-parchment/70 hover:text-parchment hover:border-parchment/40 text-sm min-h-[44px]"
                >
                  ← 上一步
                </button>
              )}
              <button
                onClick={() => {
                  if (last) setIntroDone(true);
                  else setIntroStep((s) => s + 1);
                }}
                className="px-5 py-2 rounded-lg bg-gold text-veil font-semibold min-h-[44px] shadow-[0_4px_14px_rgba(212,168,75,0.4)]"
              >
                {last ? "開始戰鬥 →" : "下一步"}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-parchment/40 mt-4 tracking-widest">
            第 {introStep + 1} / {TUTORIAL_STEPS.length} 章
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
