"use client";

import { CardDetailModal } from "@/components/game/CardDetailModal";
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

interface PlayerPerks {
  startHandBonus: number;
  startManaBonus: number;
  maxManaBonus: number;
}

interface DailyLegendMeta {
  index: number;
  name: string;
  boostedCardNames: string[];
}

interface Props {
  stage: StageData;
  era: EraMeta | null;
  playerName: string;
  playerDeck: BattleCard[];
  enemyDeck: BattleCard[];
  /** If true, this is the onboarding tutorial — uses /api/tutorial/complete
   *  and auto-leaves to /home with a starter-grant message. */
  tutorialMode?: boolean;
  /** Weaver-level perks applied to player (hand / mana / max mana). */
  playerPerks?: PlayerPerks;
  /** Today's daily legend for this era (if active). Null if weaver < Lv.3. */
  dailyLegend?: DailyLegendMeta | null;
}

const AUTO_LEAVE_MS = 4200;
const ZERO_PERKS: PlayerPerks = {
  startHandBonus: 0,
  startManaBonus: 0,
  maxManaBonus: 0,
};

export function BattleClient({
  stage,
  era,
  playerName,
  playerDeck,
  enemyDeck,
  tutorialMode = false,
  playerPerks = ZERO_PERKS,
  dailyLegend = null,
}: Props) {
  const router = useRouter();
  const { push } = useToast();

  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(
      playerName,
      playerDeck,
      stage.enemyName,
      enemyDeck,
      stage.enemyHp,
      playerPerks,
    ),
  );
  const [reportSent, setReportSent] = useState(false);
  const [enemyThinking, setEnemyThinking] = useState(false);
  const [rewards, setRewards] = useState<{
    crystals: number;
    exp: number;
    believers: number;
    levelBefore: number;
    levelAfter: number;
  } | null>(null);
  const [firstClear, setFirstClear] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [surrenderOpen, setSurrenderOpen] = useState(false);
  const [floaters, setFloaters] = useState<
    { id: number; side: "player" | "enemy"; delta: number }[]
  >([]);
  const logRef = useRef<HTMLDivElement>(null);
  const prevHpRef = useRef({
    player: battle.player.hp,
    enemy: battle.enemy.hp,
  });

  const tick = () => setBattle((b) => ({ ...b }));

  // Log auto-scroll
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [battle.log.length]);

  // Emit damage / heal floaters on HP changes
  useEffect(() => {
    const p = battle.player.hp;
    const e = battle.enemy.hp;
    const pd = p - prevHpRef.current.player;
    const ed = e - prevHpRef.current.enemy;
    const next: { id: number; side: "player" | "enemy"; delta: number }[] = [];
    if (pd !== 0) {
      next.push({
        id: Date.now() + Math.random(),
        side: "player",
        delta: pd,
      });
    }
    if (ed !== 0) {
      next.push({
        id: Date.now() + Math.random() + 1,
        side: "enemy",
        delta: ed,
      });
    }
    prevHpRef.current = { player: p, enemy: e };
    if (next.length > 0) {
      setFloaters((f) => [...f, ...next]);
      const ids = next.map((n) => n.id);
      setTimeout(
        () => setFloaters((f) => f.filter((x) => !ids.includes(x.id))),
        1600,
      );
    }
  }, [battle.player.hp, battle.enemy.hp]);

  // Enemy turn runner
  useEffect(() => {
    if (battle.phase !== "enemy_turn" || enemyThinking) return;
    setEnemyThinking(true);

    const runAsync = async () => {
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
    (async () => {
      try {
        const url = tutorialMode
          ? "/api/tutorial/complete"
          : "/api/battle/complete";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: stage.id,
            won: battle.phase === "won",
            turnsElapsed: battle.turn,
            playerHpEnd: battle.player.hp,
            enemyHpEnd: battle.enemy.hp,
            playerPlays: battle.playerPlays,
          }),
        });
        const body = await res.json();
        if (body?.ok) {
          if (body.rewards) setRewards(body.rewards);
          setFirstClear(!!body.firstClear);
        }
      } catch {
        push("結算失敗(無連線)", "danger");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase, reportSent]);

  // Auto-leave after win/loss
  useEffect(() => {
    if (battle.phase !== "won" && battle.phase !== "lost") return;
    const dest = tutorialMode ? "/home" : `/era/${stage.eraId}`;
    const t = setTimeout(() => router.push(dest), AUTO_LEAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase]);

  const openPreview = (handIdx: number) => {
    if (battle.phase !== "player_turn") return;
    setPreviewIdx(handIdx);
  };

  const playFromPreview = () => {
    if (previewIdx === null) return;
    if (battle.phase !== "player_turn") return;
    const c = battle.player.hand[previewIdx];
    if (!c) return;
    if (c.cost > battle.player.mana) {
      push("信仰池不足", "warning");
      return;
    }
    playCard(battle, "player", previewIdx);
    setPreviewIdx(null);
    tick();
  };

  const onEndTurn = () => {
    if (battle.phase !== "player_turn") return;
    endPlayerTurn(battle);
    tick();
  };

  const onSurrender = () => {
    if (battle.phase === "won" || battle.phase === "lost") return;
    battle.player.hp = 0;
    battle.phase = "lost";
    battle.log.push({
      turn: battle.turn,
      side: "player",
      kind: "phase",
      text: "你選擇撤下信仰 — 帷幕散去",
    });
    setSurrenderOpen(false);
    tick();
  };

  const bg = era?.palette ?? { main: "#6B2E8A", accent: "#D4A84B", dark: "#0A0612" };
  const previewCard =
    previewIdx !== null ? battle.player.hand[previewIdx] : null;
  const previewPlayable =
    previewCard !== null &&
    battle.phase === "player_turn" &&
    previewCard.cost <= battle.player.mana;

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${bg.dark}, ${bg.main}22 50%, ${bg.dark})`,
      }}
    >
      <div
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${bg.main}44, transparent 55%)`,
        }}
      />

      {/* Floating damage/heal numbers */}
      <FloaterLayer floaters={floaters} />

      {/* Daily Legend Banner */}
      {dailyLegend && dailyLegend.boostedCardNames.length > 0 && (
        <div className="relative z-10 px-4 py-2 border-b border-gold/40 bg-gold/10 backdrop-blur text-center">
          <span className="text-[11px] text-gold tracking-widest">
            ✨ 今日傳說 · {dailyLegend.name} · 加成 {dailyLegend.boostedCardNames.length} 張卡
          </span>
        </div>
      )}

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-parchment/10 bg-veil/60 backdrop-blur">
        <button
          onClick={() => setSurrenderOpen(true)}
          disabled={battle.phase === "won" || battle.phase === "lost"}
          className="text-xs text-blood/80 hover:text-blood tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
        >
          認輸
        </button>
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

      <div className="relative flex-1 flex flex-col min-h-0">
        <EnemyArea
          enemy={battle.enemy}
          emoji={era?.emoji ?? "🎭"}
          palette={bg}
          confused={battle.enemy.confusedTurns > 0}
        />

        <div
          ref={logRef}
          className="relative mx-4 my-2 rounded-lg border border-parchment/10 bg-black/30 backdrop-blur p-3 max-h-32 overflow-y-auto text-xs space-y-0.5"
        >
          {battle.log.slice(-40).map((l, i) => (
            <LogLine key={i} entry={l} />
          ))}
        </div>

        <PlayerHUD
          player={battle.player}
          phase={battle.phase}
          enemyThinking={enemyThinking}
          onEndTurn={onEndTurn}
        />

        <Hand
          hand={battle.player.hand}
          mana={battle.player.mana}
          phase={battle.phase}
          onTap={openPreview}
        />
      </div>

      {/* Surrender confirm */}
      <Modal
        open={surrenderOpen}
        onClose={() => setSurrenderOpen(false)}
        title="認輸?"
        className="max-w-xs"
      >
        <p className="text-parchment/70 text-sm mb-4">
          這場對決將計為失敗,無獎勵。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSurrenderOpen(false)}>
            取消
          </Button>
          <Button variant="danger" size="sm" onClick={onSurrender}>
            撤下信仰
          </Button>
        </div>
      </Modal>

      {/* Card preview — tap hand card */}
      {previewCard && (
        <Modal
          open={true}
          onClose={() => setPreviewIdx(null)}
          className="max-w-3xl"
        >
          <CardPreviewContent
            card={previewCard}
            canPlay={previewPlayable}
            reason={
              battle.phase !== "player_turn"
                ? "敵方回合"
                : previewCard.cost > battle.player.mana
                  ? `信仰池不足(需 ${previewCard.cost} / 目前 ${battle.player.mana})`
                  : ""
            }
            onPlay={playFromPreview}
            onClose={() => setPreviewIdx(null)}
          />
        </Modal>
      )}

      {/* Result overlay */}
      <AnimatePresence>
        {(battle.phase === "won" || battle.phase === "lost") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-veil/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 0.97, 0.32, 1.08] }}
              className="rounded-2xl border border-parchment/20 bg-veil/90 p-8 max-w-md w-[92vw] text-center"
            >
              <div className="text-6xl mb-2">
                {tutorialMode
                  ? "✨"
                  : battle.phase === "won"
                    ? "🏆"
                    : "💀"}
              </div>
              <h2
                className={cn(
                  "display-serif text-3xl mb-1",
                  tutorialMode
                    ? "text-sacred"
                    : battle.phase === "won"
                      ? "text-sacred"
                      : "text-blood",
                )}
              >
                {tutorialMode
                  ? "教學完成"
                  : battle.phase === "won"
                    ? "勝利"
                    : "失敗"}
              </h2>
              {!tutorialMode && firstClear && battle.phase === "won" && (
                <div className="inline-block text-[10px] tracking-[0.3em] px-2 py-0.5 rounded mb-2 border border-gold text-gold uppercase">
                  First Clear · 首通
                </div>
              )}
              <p className="text-parchment/60 text-sm mb-6">
                {tutorialMode
                  ? "你已理解帷幕的韻律。歡迎禮正在送達。"
                  : battle.phase === "won"
                    ? `經過 ${battle.turn} 回合,你的帷幕穿透了對手。`
                    : "帷幕崩壞。"}
              </p>
              {tutorialMode && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Reward label="🎴 起始牌組" value={30} />
                  <Reward label="🎯 免費十連" value={10} />
                </div>
              )}
              {!tutorialMode && rewards && battle.phase === "won" && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Reward label="💎 水晶" value={rewards.crystals} />
                  <Reward label="EXP" value={rewards.exp} />
                  <Reward label="🪙 信徒" value={rewards.believers} />
                </div>
              )}
              {!tutorialMode && rewards && rewards.levelAfter > rewards.levelBefore && (
                <div className="mb-4 py-2 rounded border border-gold/40 bg-gold/10 text-gold text-sm">
                  🎉 升級 Lv.{rewards.levelBefore} → Lv.{rewards.levelAfter}
                </div>
              )}
              <p className="text-[11px] text-parchment/40 tracking-widest">
                {tutorialMode ? "即將進入主頁…" : "即將返回…"}
              </p>
              <motion.div
                className="mt-3 h-0.5 bg-gold rounded-full"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_LEAVE_MS / 1000, ease: "linear" }}
                style={{ transformOrigin: "left" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================================================================

function CardPreviewContent({
  card,
  canPlay,
  reason,
  onPlay,
  onClose,
}: {
  card: BattleCard;
  canPlay: boolean;
  reason: string;
  onPlay: () => void;
  onClose: () => void;
}) {
  return (
    <div>
      <CardDetailModalContent card={card} />
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-xs text-parchment/50">
          {canPlay ? "可使用" : reason}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            關閉
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onPlay}
            disabled={!canPlay}
          >
            打出 ({card.cost}⚡)
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Inline version of CardDetailModal's body (no outer Modal) */
function CardDetailModalContent({ card }: { card: BattleCard }) {
  // Delegate to CardDetailModal but render inline — simplest: just copy its layout concept.
  // We reuse CardDetailModal by rendering it in a wrapper. But CardDetailModal opens its own Modal.
  // Easier: just render the key sections inline.
  return <InlineCardDetail card={card} />;
}

function InlineCardDetail({ card }: { card: BattleCard }) {
  const artUrl = card.imageUrl || (card.hasImage ? `/api/cards/${card.id}/art` : null);
  const typeMap: Record<string, { label: string; emoji: string; desc: string }> = {
    attack: { label: "攻擊", emoji: "⚔️", desc: "削減對手信徒" },
    spread: { label: "傳播", emoji: "📢", desc: "穩定增加自己信徒 + 抽 1 張" },
    heal: { label: "恢復", emoji: "💚", desc: "補血並移除負面狀態" },
    confuse: { label: "困惑", emoji: "🌀", desc: "讓敵人下回合跳過" },
    buff: { label: "強化", emoji: "⬆️", desc: "下一張牌效果翻倍" },
    debuff: { label: "削弱", emoji: "⬇️", desc: "攻擊並給敵人詛咒" },
    ritual: { label: "儀式", emoji: "🔮", desc: "高威力攻擊 + 詛咒 3 疊" },
  };
  const kwDesc: Record<string, string> = {
    whisper: "低語 · 出牌時查看對手 1 張手牌",
    ritual: "儀式 · 需蓄力發動",
    charm: "魅惑 · 敵下張攻擊牌自傷",
    curse: "詛咒 · 對手每回合失血",
    resonance: "共鳴 · 同時代卡效果 +50%",
    sacrifice: "獻祭 · 棄 1 張手牌強化此牌",
    echo: "回響 · 下回合重複 50%",
    pierce: "穿透 · 無視護盾",
    shield: "護盾 · 吸收下次傷害",
    haste: "迅捷 · 出牌後立即抽 1",
  };
  const t = typeMap[card.type] ?? { label: card.type, emoji: "?", desc: "" };

  return (
    <div className="grid md:grid-cols-[180px,1fr] gap-5">
      <div className="w-[180px] aspect-[3/4] rounded-xl overflow-hidden border-2 border-gold/60 mx-auto md:mx-0">
        {artUrl ? (
          <img src={artUrl} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-veil flex items-center justify-center text-parchment/40">
            (無圖)
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold tracking-wider px-2 py-0.5 rounded border border-gold text-gold">
            {card.rarity}
          </span>
          <span className="text-xs text-parchment/50">{card.eraId}</span>
        </div>
        <h2 className="display-serif text-2xl text-sacred mb-1">{card.name}</h2>
        {card.nameEn && (
          <p className="font-[family-name:var(--font-cinzel)] text-xs text-parchment/50 tracking-widest mb-3">
            {card.nameEn}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-3">
          <MiniStat label="費用" value={card.cost} />
          <MiniStat label="威力" value={card.power} />
          <MiniStat label="牌型" value={`${t.emoji} ${t.label}`} />
        </div>

        <div className="text-xs text-parchment/60 mb-3">
          <strong className="text-parchment/80">{t.label}:</strong> {t.desc}
        </div>

        {card.keywords.length > 0 && (
          <div className="space-y-1">
            {card.keywords.map((k) => (
              <div
                key={k}
                className="text-[11px] px-2 py-1 rounded bg-veil/60 border border-parchment/10"
              >
                <span className="text-gold font-semibold">{k}</span>
                <span className="text-parchment/60 ml-2">
                  {(kwDesc[k] ?? "").split("·")[1]?.trim() ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {card.flavor && (
          <p className="mt-3 text-[11px] text-parchment/40 italic font-[family-name:var(--font-noto-serif)]">
            「{card.flavor}」
          </p>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-2 rounded bg-veil/60 border border-parchment/10 text-center">
      <div className="text-[10px] text-parchment/50">{label}</div>
      <div className="text-sm text-parchment tabular-nums font-[family-name:var(--font-mono)]">
        {value}
      </div>
    </div>
  );
}

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
            {player.buffNextCard > 1 && (
              <span className="text-rarity-super">下張×2</span>
            )}
            {player.curseStacks > 0 && (
              <span className="text-danger">詛咒×{player.curseStacks}</span>
            )}
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
  onTap,
}: {
  hand: BattleCard[];
  mana: number;
  phase: string;
  onTap: (idx: number) => void;
}) {
  const canPlay = phase === "player_turn";
  return (
    <div className="relative h-[40vh] max-h-[300px] flex items-end justify-center px-2 pb-3 gap-1 overflow-x-auto">
      {hand.map((c, i) => {
        const affordable = c.cost <= mana;
        return (
          <motion.button
            key={c.uid}
            onClick={() => onTap(i)}
            initial={{ y: 30, opacity: 0 }}
            animate={{
              y: canPlay && affordable ? 0 : 10,
              opacity: 1,
              scale: canPlay && affordable ? 1 : 0.92,
            }}
            transition={{ duration: 0.25, ease: [0.22, 0.97, 0.32, 1.08] }}
            whileHover={{ y: -12, scale: 1.05 }}
            className={cn(
              "shrink-0 w-[22vw] max-w-[112px] min-w-[84px] transition-opacity",
              !affordable && canPlay && "opacity-60",
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

function FloaterLayer({
  floaters,
}: {
  floaters: { id: number; side: "player" | "enemy"; delta: number }[];
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      <AnimatePresence>
        {floaters.map((f) => {
          const isHeal = f.delta > 0;
          const topCls = f.side === "enemy" ? "top-[10%]" : "bottom-[30%]";
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -40, scale: 1.3 }}
              exit={{ opacity: 0, y: -80 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className={`absolute left-1/2 -translate-x-1/2 ${topCls}`}
            >
              <span
                className={`display-serif text-3xl font-bold drop-shadow-[0_0_10px_rgba(0,0,0,0.6)] ${
                  isHeal ? "text-success" : "text-danger"
                }`}
              >
                {isHeal ? "+" : ""}
                {f.delta}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
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
