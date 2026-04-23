"use client";

import { EraArenaBackdrop } from "@/components/fx/EraArenaBackdrop";
import { CardDetailModal } from "@/components/game/CardDetailModal";
import { CardTile } from "@/components/game/CardTile";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { previewEnemyIntent, runEnemyTurn, type EnemyIntent } from "@/lib/battle/ai";
import {
  consumeConfusion,
  createBattle,
  endEnemyTurn,
  endPlayerTurn,
  isConfused,
  playCard,
  type EnemyModifiers,
} from "@/lib/battle/engine";
import type { BattleCard, BattleState, LogEntry, SideState } from "@/lib/battle/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
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
  mode: "normal" | "prime";
  eraId: string;
  rewardCrystals: number;
  rewardExp: number;
  rewardBelievers: number;
}

interface NextStage {
  id: string;
  name: string;
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
  /** Next stage in the same mode+era (for post-victory "Continue" button). */
  nextStage?: NextStage | null;
  /** Boss / Prime modifiers applied when creating the battle. */
  enemyMods?: EnemyModifiers;
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
  nextStage = null,
  enemyMods = {},
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
      enemyMods,
    ),
  );
  const [reportSent, setReportSent] = useState(false);
  const [enemyThinking, setEnemyThinking] = useState(false);
  const [rewards, setRewards] = useState<{
    crystals: number;
    exp: number;
    believers: number;
    faith?: number;
    levelBefore: number;
    levelAfter: number;
  } | null>(null);
  const [firstClear, setFirstClear] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [surrenderOpen, setSurrenderOpen] = useState(false);
  const [floaters, setFloaters] = useState<
    { id: number; side: "player" | "enemy"; delta: number }[]
  >([]);
  const [hurtFlash, setHurtFlash] = useState<"player" | "enemy" | null>(null);
  const [impactFlash, setImpactFlash] = useState<{
    id: number;
    type: string;
    side: "player" | "enemy";
  } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [enemyIntent, setEnemyIntent] = useState<EnemyIntent | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const prevLogLenRef = useRef(0);
  const prevHpRef = useRef({
    player: battle.player.hp,
    enemy: battle.enemy.hp,
  });

  const tick = () => setBattle((b) => ({ ...b }));

  // Log auto-scroll + detect enemy plays for impact flash
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    // Scan newly appended log entries for enemy plays
    const fresh = battle.log.slice(prevLogLenRef.current);
    prevLogLenRef.current = battle.log.length;
    for (const entry of fresh) {
      if (entry.kind === "play" && entry.side === "enemy") {
        // text is e.g. "打出 X(attack 5)" — extract type from parens
        const m = entry.text.match(/\(([a-z]+)\s/);
        if (m) {
          triggerImpact(m[1], "enemy");
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.log.length]);

  // Recompute enemy intent whenever player is up. Skip during enemy turn
  // because the intent is what they'll do *next*, not this instant.
  useEffect(() => {
    if (battle.phase === "player_turn") {
      setEnemyIntent(previewEnemyIntent(battle));
    } else if (battle.phase === "won" || battle.phase === "lost") {
      setEnemyIntent(null);
    }
  }, [battle]);

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
      const hurt = next.find((n) => n.delta < 0);
      if (hurt) {
        setHurtFlash(hurt.side);
        setTimeout(() => setHurtFlash(null), 350);
        if (hurt.side === "player" && Math.abs(hurt.delta) >= 4) {
          setShakeKey((k) => k + 1);
        }
      }
    }
  }, [battle.player.hp, battle.enemy.hp]);

  // Enemy turn runner — uses a ref so we never stall on stale state
  const enemyRunningRef = useRef(false);
  useEffect(() => {
    if (battle.phase !== "enemy_turn") return;
    if (enemyRunningRef.current) return;
    enemyRunningRef.current = true;
    setEnemyThinking(true);

    let cancelled = false;
    const runAsync = async () => {
      try {
        await new Promise((r) => setTimeout(r, 650));
        if (cancelled) return;

        if (isConfused(battle, "enemy")) {
          consumeConfusion(battle, "enemy");
          tick();
          await new Promise((r) => setTimeout(r, 450));
        } else {
          runEnemyTurn(battle);
          tick();
          await new Promise((r) => setTimeout(r, 550));
        }
        if (cancelled) return;

        if (battle.phase === "enemy_turn") {
          endEnemyTurn(battle);
          tick();
        }
      } finally {
        enemyRunningRef.current = false;
        setEnemyThinking(false);
      }
    };
    runAsync();

    // Safety: if we somehow don't advance within 6 seconds, recover
    const watchdog = setTimeout(() => {
      if (battle.phase === "enemy_turn") {
        console.warn("Battle: enemy turn watchdog triggered, forcing end turn");
        endEnemyTurn(battle);
        tick();
        enemyRunningRef.current = false;
        setEnemyThinking(false);
      }
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
    };
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

  // Auto-leave after win/loss — but only when there's no next-stage choice
  // to offer. With a next stage available, we let the player choose.
  useEffect(() => {
    if (battle.phase !== "won" && battle.phase !== "lost") return;
    // Skip auto-leave on win when a next stage exists (we surface a button).
    if (battle.phase === "won" && nextStage && !tutorialMode) return;
    const dest = tutorialMode ? "/home" : `/era/${stage.eraId}`;
    const t = setTimeout(() => router.push(dest), AUTO_LEAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase]);

  const openPreview = (handIdx: number) => {
    if (battle.phase !== "player_turn") return;
    setPreviewIdx(handIdx);
  };

  const triggerImpact = (type: string, side: "player" | "enemy") => {
    const id = Date.now() + Math.random();
    setImpactFlash({ id, type, side });
    setTimeout(() => {
      setImpactFlash((f) => (f && f.id === id ? null : f));
    }, 520);
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
    triggerImpact(c.type, "player");
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
    <motion.div
      key={shakeKey}
      animate={
        shakeKey === 0
          ? {}
          : { x: [0, -6, 6, -4, 4, 0], y: [0, 2, -2, 1, 0] }
      }
      transition={{ duration: 0.32 }}
      className="fixed inset-0 z-30 flex flex-col overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${bg.dark}, ${bg.main}22 50%, ${bg.dark})`,
      }}
    >
      {/* Era-specific arena backdrop (SVG silhouettes + drifting glyphs) */}
      <EraArenaBackdrop eraId={era?.id ?? "primitive"} palette={bg} />

      <div
        className="absolute inset-0 opacity-35 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${bg.main}44, transparent 55%)`,
        }}
      />

      {/* Floating damage/heal numbers */}
      <FloaterLayer floaters={floaters} />

      {/* Card-play impact flash (center of arena) */}
      <ImpactFlashLayer flash={impactFlash} />

      {/* Hurt flash overlay — brief red/gold pulse on the side that just took damage */}
      <AnimatePresence>
        {hurtFlash && (
          <motion.div
            key={hurtFlash}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "absolute inset-0 pointer-events-none z-20",
              hurtFlash === "player"
                ? "bg-gradient-to-t from-blood/40 via-transparent to-transparent"
                : "bg-gradient-to-b from-gold/30 via-transparent to-transparent",
            )}
          />
        )}
      </AnimatePresence>

      {/* Daily Legend Banner */}
      {dailyLegend && dailyLegend.boostedCardNames.length > 0 && (
        <div className="relative z-10 px-4 py-2 border-b border-gold/40 bg-gold/10 backdrop-blur text-center">
          <span className="text-[11px] text-gold tracking-widest">
            ✨ 今日傳說 · {dailyLegend.name} · 加成 {dailyLegend.boostedCardNames.length} 張卡
          </span>
        </div>
      )}

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-3 py-2 border-b border-parchment/10 bg-veil/60 backdrop-blur">
        <button
          onClick={() => setSurrenderOpen(true)}
          disabled={battle.phase === "won" || battle.phase === "lost"}
          className="text-xs text-blood/80 hover:text-blood tracking-wider disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] px-2 rounded"
          aria-label="認輸"
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
          thinking={enemyThinking}
          intent={battle.phase === "player_turn" ? enemyIntent : null}
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
                  <Reward label="🕯️ 信念" value={rewards.faith ?? 0} />
                  <Reward label="🪙 信徒" value={rewards.believers} />
                </div>
              )}
              {!tutorialMode && rewards && rewards.levelAfter > rewards.levelBefore && (
                <div className="mb-4 py-2 rounded border border-gold/40 bg-gold/10 text-gold text-sm">
                  🎉 升級 Lv.{rewards.levelBefore} → Lv.{rewards.levelAfter}
                </div>
              )}

              {/* Post-battle action row */}
              {battle.phase === "won" && !tutorialMode && nextStage ? (
                <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => router.push(`/battle/${nextStage.id}`)}
                  >
                    下一關 → {nextStage.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/era/${stage.eraId}`)}
                  >
                    返回時代
                  </Button>
                </div>
              ) : battle.phase === "won" && !tutorialMode ? (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => router.push(`/era/${stage.eraId}`)}
                  >
                    🏆 返回時代 · 終末已達
                  </Button>
                </div>
              ) : (
                <>
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
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
  thinking,
  intent,
}: {
  enemy: SideState;
  emoji: string;
  palette: { main: string; accent: string };
  confused: boolean;
  thinking: boolean;
  intent: EnemyIntent | null;
}) {
  return (
    <div className="relative flex items-center gap-3 px-4 pt-3 pb-2">
      {intent && <EnemyIntentBadge intent={intent} />}
      <div
        className={cn(
          "relative w-20 h-20 rounded-full border-2 flex items-center justify-center text-5xl shrink-0",
          thinking && "enemy-pulse",
        )}
        style={{
          borderColor: palette.main,
          background: `${palette.main}22`,
          // CSS var so keyframes can use the palette colour for drop-shadow.
          ["--pulse-color" as string]: palette.main,
        }}
      >
        <span>{emoji}</span>
        {confused && (
          <span className="absolute -bottom-1 -right-1 text-base" title="困惑中">
            🌀
          </span>
        )}
        {thinking && !confused && (
          <span
            className="absolute -top-1 -right-1 text-xs bg-blood/90 text-parchment rounded-full px-1.5 py-0.5 tracking-widest font-[family-name:var(--font-cinzel)]"
            title="謀劃中"
          >
            …
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="display-serif text-parchment text-lg truncate">
          {enemy.name}
        </div>
        <HpBar value={enemy.hp} max={enemy.hpMax} color={palette.main} />
        <StatusTray side={enemy} showEcho={false} />
      </div>
    </div>
  );
}

function StatusTray({
  side,
  showEcho = true,
  showBuffNext = false,
}: {
  side: SideState;
  showEcho?: boolean;
  showBuffNext?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      <StatusPill icon="⚡" value={`${side.mana}/${side.manaMax}`} title="信仰池" tone="gold" />
      <StatusPill
        icon="🂠"
        value={`${side.deck.length}/${side.discard.length}`}
        title="牌堆 / 棄牌堆"
        tone="muted"
      />
      {side.hand.length >= 0 && (
        <StatusPill icon="🎴" value={`${side.hand.length}`} title="手牌" tone="muted" />
      )}
      {side.shield > 0 && (
        <StatusPill icon="🛡" value={`${side.shield}`} title="護盾" tone="info" />
      )}
      {showBuffNext && side.buffNextCard > 1 && (
        <StatusPill icon="⬆︎" value="×2" title="下張威力加倍" tone="legend" />
      )}
      {side.strength > 0 && (
        <StatusPill icon="💪" value={`+${side.strength}`} title="力量 — 每張牌 +N 威力" tone="gold" />
      )}
      {side.curseStacks > 0 && (
        <StatusPill icon="🕯" value={`×${side.curseStacks}`} title="詛咒 — 每回合 −N,遞減" tone="danger" />
      )}
      {side.poison > 0 && (
        <StatusPill icon="☠" value={`×${side.poison}`} title="中毒 — 每回合 −N,不衰減" tone="poison" />
      )}
      {side.vulnerableTurns > 0 && (
        <StatusPill icon="🩸" value={`${side.vulnerableTurns}`} title="破綻 — 受到 +50% 傷害" tone="danger" />
      )}
      {side.weakTurns > 0 && (
        <StatusPill icon="🪶" value={`${side.weakTurns}`} title="虛弱 — 輸出 −25%" tone="muted" />
      )}
      {side.charmStacks > 0 && (
        <StatusPill icon="💋" value={`×${side.charmStacks}`} title="魅惑 — 下張攻擊自傷" tone="pink" />
      )}
      {showEcho && side.echoPending && (
        <StatusPill
          icon="🔁"
          value={side.echoPending.name}
          title="回響 — 下回合以 50% 威力重現"
          tone="info"
        />
      )}
    </div>
  );
}

function StatusPill({
  icon,
  value,
  title,
  tone = "muted",
}: {
  icon: string;
  value: string;
  title: string;
  tone?: "muted" | "gold" | "info" | "danger" | "poison" | "legend" | "pink";
}) {
  const tones: Record<string, string> = {
    muted: "border-parchment/15 text-parchment/70",
    gold: "border-gold/40 text-gold",
    info: "border-info/40 text-info",
    danger: "border-blood/50 text-blood",
    poison: "border-emerald-500/40 text-emerald-400",
    legend: "border-rarity-super/40 text-rarity-super",
    pink: "border-pink-400/40 text-pink-300",
  };
  return (
    <span
      role="img"
      title={title}
      aria-label={`${title}:${value}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-black/30 backdrop-blur text-[10px] tabular-nums font-[family-name:var(--font-mono)] leading-none ${tones[tone]}`}
    >
      <span aria-hidden className="text-[12px] leading-none">{icon}</span>
      <span className="leading-none truncate max-w-[80px]">{value}</span>
    </span>
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
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="display-serif text-sm text-parchment truncate">
              {player.name}
            </span>
          </div>
          <HpBar value={player.hp} max={player.hpMax} color="#D4A84B" />
          <StatusTray side={player} showBuffNext showEcho />
        </div>
        <Button
          variant={phase === "player_turn" ? "primary" : "ghost"}
          size="md"
          disabled={phase !== "player_turn" || enemyThinking}
          onClick={onEndTurn}
          className="min-h-[44px] shrink-0"
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
      <AnimatePresence mode="popLayout">
        {hand.map((c, i) => {
          const affordable = c.cost <= mana;
          return (
            <motion.button
              key={c.uid}
              layout
              onClick={() => onTap(i)}
              initial={{ y: 60, opacity: 0, scale: 0.85 }}
              animate={{
                y: canPlay && affordable ? 0 : 10,
                opacity: 1,
                scale: canPlay && affordable ? 1 : 0.92,
              }}
              exit={{
                y: -180,
                opacity: 0,
                scale: 1.15,
                transition: { duration: 0.35, ease: [0.22, 0.97, 0.32, 1.08] },
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
      </AnimatePresence>
      {hand.length === 0 && (
        <div className="text-parchment/30 text-xs">手牌為空</div>
      )}
    </div>
  );
}

function EnemyIntentBadge({ intent }: { intent: EnemyIntent }) {
  if (intent.confused) {
    return (
      <div className="absolute top-2 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-900/70 border border-purple-400/40 text-[10px] text-purple-200 tracking-widest z-10">
        🌀 下回合困惑
      </div>
    );
  }
  if (intent.cardCount === 0) {
    return (
      <div className="absolute top-2 right-3 px-2 py-1 rounded-md bg-black/40 border border-parchment/20 text-[10px] text-parchment/60 tracking-widest z-10">
        — 無動作
      </div>
    );
  }
  const ICONS: Record<string, string> = {
    attack: "⚔️",
    heal: "💚",
    spread: "📢",
    confuse: "🌀",
    buff: "⬆️",
    debuff: "⬇️",
    ritual: "🔮",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-2 right-3 flex items-center gap-2 px-2 py-1 rounded-md bg-black/55 border border-blood/50 text-[10px] text-parchment tracking-widest z-10"
      title="敵方下回合意圖預告"
    >
      <span className="text-blood/80 font-[family-name:var(--font-cinzel)] uppercase">
        Next
      </span>
      <span className="flex items-center gap-1">
        {intent.actions.map((a, i) => (
          <span key={i} className="text-base leading-none">
            {ICONS[a] ?? "·"}
          </span>
        ))}
      </span>
      {intent.damage > 0 && (
        <span className="text-danger font-[family-name:var(--font-mono)]">
          −{intent.damage}
        </span>
      )}
      {intent.heals > 0 && (
        <span className="text-success font-[family-name:var(--font-mono)]">
          +{intent.heals}
        </span>
      )}
    </motion.div>
  );
}

function ImpactFlashLayer({
  flash,
}: {
  flash: { id: number; type: string; side: "player" | "enemy" } | null;
}) {
  const colors: Record<string, { ring: string; glow: string; emoji: string }> = {
    attack: { ring: "#ef4444", glow: "rgba(239,68,68,0.55)", emoji: "⚔️" },
    debuff: { ring: "#8b5cf6", glow: "rgba(139,92,246,0.55)", emoji: "⬇️" },
    ritual: { ring: "#d946ef", glow: "rgba(217,70,239,0.55)", emoji: "🔮" },
    heal: { ring: "#22c55e", glow: "rgba(34,197,94,0.55)", emoji: "💚" },
    spread: { ring: "#06b6d4", glow: "rgba(6,182,212,0.5)", emoji: "📢" },
    buff: { ring: "#f59e0b", glow: "rgba(245,158,11,0.55)", emoji: "⬆️" },
    confuse: { ring: "#a855f7", glow: "rgba(168,85,247,0.5)", emoji: "🌀" },
  };
  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
      <AnimatePresence>
        {flash && (() => {
          const c = colors[flash.type] ?? colors.attack;
          return (
            <motion.div
              key={flash.id}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.4, 1.2], opacity: [0, 0.9, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative"
            >
              <div
                className="rounded-full border-4 flex items-center justify-center text-5xl"
                style={{
                  width: 180,
                  height: 180,
                  borderColor: c.ring,
                  boxShadow: `0 0 60px ${c.glow}, inset 0 0 40px ${c.glow}`,
                  background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`,
                }}
              >
                {c.emoji}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
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

const LOG_KIND_ICON: Record<string, string> = {
  damage: "⚔",
  heal: "✚",
  buff: "⬆︎",
  debuff: "⬇︎",
  play: "◆",
  draw: "⤵︎",
  phase: "⸻",
};

function LogLine({ entry }: { entry: LogEntry }) {
  const color = useMemo(() => {
    if (entry.kind === "damage") return entry.side === "player" ? "text-success" : "text-danger";
    if (entry.kind === "heal") return "text-success";
    if (entry.kind === "buff") return "text-rarity-super";
    if (entry.kind === "debuff") return "text-warning";
    if (entry.kind === "phase") return "text-gold";
    if (entry.kind === "draw") return "text-parchment/50";
    return "text-parchment/80";
  }, [entry]);

  // Phase entries become visual dividers between turns.
  if (entry.kind === "phase") {
    return (
      <div className="flex items-center gap-2 my-1 text-gold/80 tracking-widest text-[10px] font-[family-name:var(--font-cinzel)] uppercase">
        <span className="flex-1 h-px bg-gold/20" aria-hidden />
        <span>{entry.text}</span>
        <span className="flex-1 h-px bg-gold/20" aria-hidden />
      </div>
    );
  }

  const icon = LOG_KIND_ICON[entry.kind] ?? "·";
  return (
    <div className={cn("leading-tight flex items-baseline gap-1.5", color)}>
      <span
        className={cn(
          "text-[10px] leading-none shrink-0 w-3 text-center",
          entry.side === "enemy" ? "opacity-75" : "",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className={entry.side === "enemy" ? "opacity-85" : ""}>
        {entry.text}
      </span>
    </div>
  );
}
