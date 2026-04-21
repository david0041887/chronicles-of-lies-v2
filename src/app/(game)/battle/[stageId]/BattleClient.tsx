"use client";

import { CardTile } from "@/components/game/CardTile";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { runEnemyTurn } from "@/lib/battle/ai";
import {
  consumeConfusion,
  createBattle,
  endEnemyTurn,
  endPlayerTurn,
  isConfused,
  playCard,
} from "@/lib/battle/engine";
import type { BattleCard, BattleState, LogEntry, SideState } from "@/lib/battle/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface StageData {
  id: string;
  name: string;
  subtitle: string | null;
  difficulty: number;
  enemyHp: number;
  enemyName: string;
  isBoss: boolean;
  eraId: string;
  rewardCrystals: number;
  rewardExp: number;
  rewardBelievers: number;
}

interface EraMeta {
  id: string;
  name: string;
  palette: { main: string; accent: string; dark: string };
  emoji: string;
}

interface Props {
  stage: StageData;
  era: EraMeta | null;
  playerName: string;
  playerDeck: BattleCard[];
  enemyDeck: BattleCard[];
}

export function BattleClient({ stage, era, playerName, playerDeck, enemyDeck }: Props) {
  const router = useRouter();
  const { push } = useToast();

  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(playerName, playerDeck, stage.enemyName, enemyDeck, stage.enemyHp),
  );
  const [reportSent, setReportSent] = useState(false);
  const [enemyThinking, setEnemyThinking] = useState(false);
  const [rewards, setRewards] = useState<{
    crystals: number;
    exp: number;
    believers: number;
  } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const tick = () => setBattle((b) => ({ ...b }));

  // Auto-scroll log
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [battle.log.length]);

  // Enemy turn runner
  useEffect(() => {
    if (battle.phase !== "enemy_turn" || enemyThinking) return;
    setEnemyThinking(true);

    const runAsync = async () => {
      // Pause briefly for pacing
      await new Promise((r) => setTimeout(r, 700));

      if (isConfused(battle, "enemy")) {
        consumeConfusion(battle, "enemy");
        tick();
        await new Promise((r) => setTimeout(r, 500));
      } else {
        runEnemyTurn(battle);
        tick();
        await new Promise((r) => setTimeout(r, 600));
      }

      if (battle.phase === "enemy_turn") {
        endEnemyTurn(battle);
        tick();
      }
      setEnemyThinking(false);
    };
    runAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase]);

  // Report results once
  useEffect(() => {
    if (reportSent) return;
    if (battle.phase !== "won" && battle.phase !== "lost") return;
    setReportSent(true);
    const report = async () => {
      try {
        const res = await fetch("/api/battle/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: stage.id,
            won: battle.phase === "won",
            turnsElapsed: battle.turn,
            playerHpEnd: battle.player.hp,
            enemyHpEnd: battle.enemy.hp,
          }),
        });
        const body = await res.json();
        if (body?.ok && body.rewards) setRewards(body.rewards);
      } catch {
        push("結算失敗(無連線)", "danger");
      }
    };
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase, reportSent]);

  const onPlayCard = (handIdx: number) => {
    if (battle.phase !== "player_turn") return;
    const c = battle.player.hand[handIdx];
    if (!c) return;
    if (c.cost > battle.player.mana) {
      push("信仰池不足", "warning");
      return;
    }
    playCard(battle, "player", handIdx);
    tick();
  };

  const onEndTurn = () => {
    if (battle.phase !== "player_turn") return;
    endPlayerTurn(battle);
    tick();
  };

  const bg = era?.palette ?? { main: "#6B2E8A", accent: "#D4A84B", dark: "#0A0612" };

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${bg.dark}, ${bg.main}22 50%, ${bg.dark})`,
      }}
    >
      {/* Ambient veil */}
      <div
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${bg.main}44, transparent 55%)`,
        }}
      />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-parchment/10 bg-veil/60 backdrop-blur">
        <Link
          href={`/era/${stage.eraId}`}
          className="text-xs text-parchment/60 hover:text-parchment tracking-wider"
        >
          ← 撤退
        </Link>
        <div className="text-center">
          <div className="display-serif text-sm text-parchment truncate max-w-[60vw]">
            {stage.name}
          </div>
          {stage.subtitle && (
            <div className="text-[10px] text-parchment/40 tracking-widest">
              {stage.subtitle}
            </div>
          )}
        </div>
        <div className="text-xs text-parchment/60 tabular-nums w-[54px] text-right">
          T{battle.turn}
        </div>
      </div>

      {/* Battle area */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Enemy area */}
        <EnemyArea
          enemy={battle.enemy}
          emoji={era?.emoji ?? "🎭"}
          palette={bg}
          confused={battle.enemy.confusedTurns > 0}
        />

        {/* Log */}
        <div
          ref={logRef}
          className="relative mx-4 my-2 rounded-lg border border-parchment/10 bg-black/30 backdrop-blur p-3 max-h-32 overflow-y-auto text-xs space-y-0.5"
        >
          {battle.log.slice(-40).map((l, i) => (
            <LogLine key={i} entry={l} />
          ))}
        </div>

        {/* Player HUD */}
        <PlayerHUD
          player={battle.player}
          phase={battle.phase}
          enemyThinking={enemyThinking}
          onEndTurn={onEndTurn}
        />

        {/* Hand */}
        <Hand
          hand={battle.player.hand}
          mana={battle.player.mana}
          phase={battle.phase}
          onPlay={onPlayCard}
        />
      </div>

      {/* End screen */}
      <AnimatePresence>
        {(battle.phase === "won" || battle.phase === "lost") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-veil/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl border border-parchment/20 bg-veil/90 p-8 max-w-md w-[92vw] text-center"
            >
              <div className="text-6xl mb-2">
                {battle.phase === "won" ? "🏆" : "💀"}
              </div>
              <h2
                className={cn(
                  "display-serif text-3xl mb-2",
                  battle.phase === "won" ? "text-sacred" : "text-blood",
                )}
              >
                {battle.phase === "won" ? "勝利" : "失敗"}
              </h2>
              <p className="text-parchment/60 text-sm mb-6">
                {battle.phase === "won"
                  ? `經過 ${battle.turn} 回合,你的帷幕穿透了對手。`
                  : "帷幕崩壞。你可以重整後再試。"}
              </p>
              {rewards && battle.phase === "won" && (
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <Reward label="💎 水晶" value={rewards.crystals} />
                  <Reward label="EXP" value={rewards.exp} />
                  <Reward label="🪙 信徒" value={rewards.believers} />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  className="flex-1"
                  onClick={() => router.push(`/era/${stage.eraId}`)}
                >
                  返回時代
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => {
                    // Hard reset: re-mount by replacing URL (forces server re-render + fresh state)
                    router.refresh();
                    setReportSent(false);
                    setRewards(null);
                    setBattle(
                      createBattle(
                        playerName,
                        playerDeck,
                        stage.enemyName,
                        enemyDeck,
                        stage.enemyHp,
                      ),
                    );
                  }}
                >
                  再戰
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================================================================
// Sub-components
// ================================================================

function EnemyArea({
  enemy,
  emoji,
  palette,
  confused,
}: {
  enemy: SideState;
  emoji: string;
  palette: { main: string; accent: string };
  confused: boolean;
}) {
  return (
    <div className="relative flex items-center gap-3 px-4 pt-3 pb-2">
      <div
        className="relative w-20 h-20 rounded-full border-2 flex items-center justify-center text-5xl shrink-0"
        style={{ borderColor: palette.main, background: `${palette.main}22` }}
      >
        <span>{emoji}</span>
        {confused && (
          <span className="absolute -bottom-1 -right-1 text-base" title="困惑中">
            🌀
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="display-serif text-parchment text-lg truncate">
          {enemy.name}
        </div>
        <HpBar value={enemy.hp} max={enemy.hpMax} color={palette.main} />
        <div className="flex items-center gap-3 mt-1 text-[11px] text-parchment/70">
          <span>⚡ {enemy.mana}/{enemy.manaMax}</span>
          <span>🎴 {enemy.hand.length}</span>
          <span>牌堆 {enemy.deck.length}</span>
          {enemy.shield > 0 && <span className="text-info">🛡 {enemy.shield}</span>}
          {enemy.curseStacks > 0 && (
            <span className="text-danger">詛咒 ×{enemy.curseStacks}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerHUD({
  player,
  phase,
  enemyThinking,
  onEndTurn,
}: {
  player: SideState;
  phase: string;
  enemyThinking: boolean;
  onEndTurn: () => void;
}) {
  return (
    <div className="relative px-4 pt-2 pb-1 border-t border-parchment/10 bg-veil/50 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <HpBar value={player.hp} max={player.hpMax} color="#D4A84B" />
          <div className="flex items-center gap-3 mt-1 text-[11px] text-parchment/80">
            <span className="display-serif text-parchment">{player.name}</span>
            <span>⚡ {player.mana}/{player.manaMax}</span>
            <span>牌堆 {player.deck.length}</span>
            {player.shield > 0 && <span className="text-info">🛡 {player.shield}</span>}
            {player.buffNextCard > 1 && <span className="text-rarity-super">下張×2</span>}
            {player.curseStacks > 0 && <span className="text-danger">詛咒×{player.curseStacks}</span>}
          </div>
        </div>
        <Button
          variant={phase === "player_turn" ? "primary" : "ghost"}
          size="sm"
          disabled={phase !== "player_turn" || enemyThinking}
          onClick={onEndTurn}
        >
          {phase === "enemy_turn" ? "敵回合…" : "結束回合"}
        </Button>
      </div>
    </div>
  );
}

function Hand({
  hand,
  mana,
  phase,
  onPlay,
}: {
  hand: BattleCard[];
  mana: number;
  phase: string;
  onPlay: (idx: number) => void;
}) {
  const canPlay = phase === "player_turn";
  return (
    <div className="relative h-[40vh] max-h-[300px] flex items-end justify-center px-2 pb-3 gap-1 overflow-x-auto">
      {hand.map((c, i) => {
        const affordable = c.cost <= mana;
        return (
          <motion.button
            key={c.uid}
            onClick={() => canPlay && affordable && onPlay(i)}
            initial={{ y: 30, opacity: 0 }}
            animate={{
              y: canPlay && affordable ? 0 : 10,
              opacity: 1,
              scale: canPlay && affordable ? 1 : 0.92,
            }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 0.97, 0.32, 1.08] }}
            whileHover={canPlay && affordable ? { y: -12, scale: 1.05 } : undefined}
            className={cn(
              "shrink-0 w-[22vw] max-w-[112px] min-w-[84px] transition-opacity",
              !affordable && "opacity-50",
              !canPlay && "pointer-events-none",
            )}
          >
            <CardTile card={c} size="sm" />
          </motion.button>
        );
      })}
      {hand.length === 0 && (
        <div className="text-parchment/30 text-xs">手牌為空</div>
      )}
    </div>
  );
}

function HpBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="relative h-3 rounded-full bg-black/40 border border-parchment/10 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          boxShadow: `0 0 12px ${color}66`,
        }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: [0.22, 0.97, 0.32, 1.08] }}
      />
      <div className="relative flex items-center justify-center text-[10px] font-[family-name:var(--font-mono)] tabular-nums text-parchment h-full drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]">
        {value} / {max}
      </div>
    </div>
  );
}

function Reward({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 rounded-lg bg-veil/60 border border-parchment/10">
      <div className="text-[10px] text-parchment/50 tracking-wider">{label}</div>
      <div className="font-[family-name:var(--font-mono)] text-sm text-parchment tabular-nums mt-1">
        +{value.toLocaleString()}
      </div>
    </div>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const color = useMemo(() => {
    if (entry.kind === "damage") return entry.side === "player" ? "text-success" : "text-danger";
    if (entry.kind === "heal") return "text-success";
    if (entry.kind === "buff") return "text-rarity-super";
    if (entry.kind === "debuff") return "text-warning";
    if (entry.kind === "phase") return "text-gold";
    return "text-parchment/70";
  }, [entry]);
  const prefix = entry.side === "enemy" ? "· " : "▸ ";
  return (
    <div className={cn("leading-tight", color)}>
      {prefix}
      {entry.text}
    </div>
  );
}
