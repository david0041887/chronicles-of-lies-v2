"use client";

import { EraArenaBackdrop } from "@/components/fx/EraArenaBackdrop";
import { CardTile } from "@/components/game/CardTile";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { previewEnemyIntent, runEnemyStep, type EnemyIntent } from "@/lib/battle/ai";
import { getBossOpener } from "@/lib/battle/boss-lines";
import { cardArtUrl } from "@/lib/card-art";
import { getAbilitiesFor, getAbilityDescriptionsForCard } from "@/lib/battle/card-abilities";
import { signBattleResult } from "@/lib/battle/client-sig";
import {
  applyMulligan,
  attackWithMinion,
  consumeConfusion,
  createBattle,
  endEnemyTurn,
  endPlayerTurn,
  isConfused,
  playCard,
  type EnemyModifiers,
} from "@/lib/battle/engine";
import type { BattleCard, BattleState, LogEntry, Minion, SideState } from "@/lib/battle/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  /** HMAC-signed ticket issued by the server on page render — returned to
   *  /api/battle/complete to prove this battle actually started. Not used
   *  in tutorial mode. */
  ticket?: string;
  /** Render-prop slot for an interactive coach overlay (used by the
   *  onboarding tutorial). Receives the current battle state on every
   *  tick so the coach can compute which step the player is on. Mounted
   *  at z-[60], above the battle UI but below modals. */
  tutorialOverlay?: (state: BattleState) => ReactNode;
  /** Override destination for the post-battle auto-leave timer + the
   *  "返回時代" buttons on the result modal. Used by /dungeon/tower
   *  battles so a tower win/loss returns the player to the tower hub
   *  instead of dumping them on a random era page. Defaults to
   *  `/era/${stage.eraId}`. */
  returnHref?: string;
}

const AUTO_LEAVE_MS = 2000;
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
  ticket,
  tutorialOverlay,
  returnHref,
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
  const [selectedAttackerUid, setSelectedAttackerUid] = useState<string | null>(null);
  /** Uids of minions that should show a gold trigger-fire glow right now. */
  const [triggerFlashes, setTriggerFlashes] = useState<Record<string, number>>({});
  /** Current attack animation — MinionCard of attackerUid slides toward
   *  the target (face → big leap, minion → short step), then snaps back. */
  const [attackAnim, setAttackAnim] = useState<{
    attackerUid: string;
    attackerSide: "player" | "enemy";
    targetKind: "face" | "minion";
    ts: number;
  } | null>(null);
  /** Starting-hand mulligan: shown once at battle start, dismissed by
   *  the player (skipped automatically in tutorial mode so onboarding
   *  doesn't have to teach two layers at once). */
  const [mulliganDone, setMulliganDone] = useState<boolean>(tutorialMode);
  const [mulliganPicks, setMulliganPicks] = useState<Set<string>>(new Set());

  /** Boss opener overlay — only fires for boss/prime stages, briefly
   *  blocks the mulligan so the line can read uninterrupted. */
  const bossOpener = useMemo(() => {
    if (!stage.isBoss) return null;
    return getBossOpener(stage.eraId, stage.mode);
  }, [stage]);
  const [openerVisible, setOpenerVisible] = useState<boolean>(!!bossOpener && !tutorialMode);
  useEffect(() => {
    if (!openerVisible) return;
    // Curtain pulls back at ~900ms, opener mounts after, holds ~2200ms,
    // then fades for the mulligan to take over.
    const t = setTimeout(() => setOpenerVisible(false), 2900);
    return () => clearTimeout(t);
  }, [openerVisible]);
  const logRef = useRef<HTMLDivElement>(null);
  const prevLogLenRef = useRef(0);
  const sleepTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const prevHpRef = useRef({
    player: battle.player.hp,
    enemy: battle.enemy.hp,
  });

  const tick = () => setBattle((b) => ({ ...b }));

  /**
   * Schedule a timer that auto-cleans itself from sleepTimersRef when it
   * fires. Use this everywhere setTimeout is paired with the ref so the
   * Set doesn't accumulate handles across a long battle (40-turn fights
   * × ~10 timers each = 400 stale entries by end-game otherwise). The
   * unmount path still iterates the ref to clearTimeout any pending
   * timers — only completed ones are auto-pruned.
   */
  const scheduleTimer = (fn: () => void, ms: number) => {
    const t: ReturnType<typeof setTimeout> = setTimeout(() => {
      sleepTimersRef.current.delete(t);
      fn();
    }, ms);
    sleepTimersRef.current.add(t);
    return t;
  };

  // Log auto-scroll + react to newly-appended structured events:
  //  · enemy card plays → impact flash
  //  · minion_attack markers → attacker slide animation
  //  · ability_fired markers → trigger glow on the source minion
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    const fresh = battle.log.slice(prevLogLenRef.current);
    prevLogLenRef.current = battle.log.length;
    for (const entry of fresh) {
      const ev = entry.data?.event;
      if (ev === "minion_attack") {
        const attackerUid = entry.data?.attackerUid as string | undefined;
        const targetKind = entry.data?.targetKind as "face" | "minion" | undefined;
        if (attackerUid && targetKind) {
          setAttackAnim({
            attackerUid,
            attackerSide: entry.side,
            targetKind,
            ts: Date.now() + Math.random(),
          });
        }
      } else if (ev === "ability_fired") {
        const uid = entry.data?.uid as string | undefined;
        if (uid) {
          const key = Date.now() + Math.random();
          setTriggerFlashes((f) => ({ ...f, [uid]: key }));
          scheduleTimer(() => {
            setTriggerFlashes((f) => {
              if (f[uid] !== key) return f;
              const { [uid]: _omit, ...rest } = f;
              return rest;
            });
          }, 650);
        }
      } else if (entry.kind === "play" && entry.side === "enemy") {
        // Enemy card-play impact flash (non-attack plays only — text starts
        // with "打出"; attack markers have empty text and are filtered above).
        const m = entry.text.match(/\(([a-z]+)\s/);
        if (m) triggerImpact(m[1], "enemy");
      }
    }
    // SAFE: keyed on log length only. The body reads battle.log[i] for
    // newly-appended entries (slice(prevLen)), but we DON'T want to re-run
    // on every state mutation — log entries are append-only, so length is
    // a sufficient change-detection signal. triggerImpact / setTriggerFlashes
    // are stable closures over component-scope state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.log.length]);

  // Clear attack animation shortly after it fires so the attacker snaps back.
  useEffect(() => {
    if (!attackAnim) return;
    const t = scheduleTimer(() => setAttackAnim(null), 380);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackAnim]);

  // Recompute enemy intent whenever player is up. Skip during enemy turn
  // because the intent is what they'll do *next*, not this instant. Keyed
  // on the fields that can change during the player's turn — turn counter,
  // player HP (after enemy attacks), enemy HP / board (the player can
  // trade into minions) — so we don't re-run the expensive cloneState
  // simulation on every local mutation like mana spend or hand shuffle.
  useEffect(() => {
    if (battle.phase === "player_turn") {
      setEnemyIntent(previewEnemyIntent(battle));
    } else if (battle.phase === "won" || battle.phase === "lost") {
      setEnemyIntent(null);
    }
    // SAFE: previewEnemyIntent reads the whole `battle` object, but adding
    // `battle` to deps would re-run on every tick(), thrashing the
    // expensive cloneState simulation 5-10x per turn. The deps list below
    // captures every field whose change can MEANINGFULLY shift the
    // forecast (turn rolls, enemy hp/board takes a hit, player hp moves).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    battle.phase,
    battle.turn,
    battle.enemy.hp,
    battle.enemy.board.length,
    battle.player.hp,
  ]);

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

  /** Whether the current player turn is being auto-skipped because the
   *  player is confused. Drives a full-screen telegraph overlay so the
   *  player understands why they can't act for a moment. */
  const [playerConfusedTurn, setPlayerConfusedTurn] = useState(false);

  // Player-side confused turn handler — when phase is player_turn AND
  // the player is confused, show a brief telegraph overlay then auto-end
  // the turn. Mirrors the engine's enemy-turn confusion path so the
  // mechanic feels symmetrical.
  useEffect(() => {
    if (battle.phase !== "player_turn") {
      setPlayerConfusedTurn(false);
      return;
    }
    if (!isConfused(battle, "player")) return;
    if (playerConfusedTurn) return;
    if (!mulliganDone) return; // wait until the player has chosen a hand
    setPlayerConfusedTurn(true);
    const t1 = scheduleTimer(() => {
      consumeConfusion(battle, "player");
      tick();
    }, 1100);
    const t2 = scheduleTimer(() => {
      // Auto-end after the consume so HP-tick shields etc. all flush.
      if (battle.phase === "player_turn") {
        endPlayerTurn(battle);
        tick();
      }
      setPlayerConfusedTurn(false);
    }, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // SAFE: should fire EXACTLY ONCE per player_turn that happens to be
    // confused. Phase + turn pin it to a unique turn; mulliganDone delays
    // until the player has chosen their hand. Adding `battle` would
    // re-fire on every mutation mid-skip, breaking the timer chain.
    // The body reads battle.* fields current at fire time, which is fine
    // because the engine mutates in place and tick() rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase, battle.turn, mulliganDone]);

  // Clear any pending attacker selection when the phase leaves player_turn
  // — otherwise a mid-select phase flip (e.g. you deselect-then-end-turn,
  // or a card-play ability kills your attacker) leaves a stale highlight.
  useEffect(() => {
    if (battle.phase !== "player_turn" && selectedAttackerUid !== null) {
      setSelectedAttackerUid(null);
    }
  }, [battle.phase, selectedAttackerUid]);

  // Also clear if the selected minion has left the board (died between
  // picks) so the "valid target" ring on enemy minions doesn't linger
  // after the attacker itself is gone.
  useEffect(() => {
    if (
      selectedAttackerUid !== null &&
      !battle.player.board.some((m) => m.uid === selectedAttackerUid)
    ) {
      setSelectedAttackerUid(null);
    }
  }, [battle.player.board, selectedAttackerUid]);

  // Enemy turn runner — plays one action at a time with brief delays so
  // the player sees each card/attack land instead of a batched snap.
  const enemyRunningRef = useRef(false);
  useEffect(() => {
    if (battle.phase !== "enemy_turn") return;
    if (enemyRunningRef.current) return;
    enemyRunningRef.current = true;
    setEnemyThinking(true);

    let cancelled = false;
    const sleep = (ms: number) =>
      new Promise<void>((r) => {
        scheduleTimer(r, ms);
      });

    const runAsync = async () => {
      try {
        await sleep(420);
        if (cancelled) return;

        if (isConfused(battle, "enemy")) {
          try {
            consumeConfusion(battle, "enemy");
          } catch (err) {
            console.error("consumeConfusion threw", err);
          }
          tick();
          await sleep(350);
        } else {
          // Staged play — one action per loop iteration, with delay
          // proportional to the action so the screen flow feels natural.
          const MAX_STEPS = 25;
          for (let i = 0; i < MAX_STEPS; i++) {
            if (cancelled) return;
            if (battle.phase !== "enemy_turn") break;
            let step;
            try {
              step = runEnemyStep(battle);
            } catch (err) {
              console.error("runEnemyStep threw", err);
              break;
            }
            tick();
            if (step.done) break;
            // card plays get a longer pause so the impact flash finishes;
            // minion attacks are snappier so chained trades don't drag.
            await sleep(step.kind === "play" ? 620 : 380);
          }
        }
        if (cancelled) return;

        // Always attempt to end the enemy turn. endEnemyTurn self-guards
        // on phase !== "enemy_turn" so it's a no-op if the battle already
        // ended (win/loss) during the staged loop above.
        endEnemyTurn(battle);
        tick();
      } catch (err) {
        console.error("enemy turn runAsync fatal", err);
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

    // Watchdog: longer now because the staged loop can take up to ~15s in
    // pathological cases (5 cards × 620ms + 10 attacks × 380ms). Bump to
    // 20s so we never force-cut a legitimately long turn.
    const watchdog = setTimeout(() => {
      if (battle.phase === "enemy_turn") {
        console.warn("Battle: enemy turn watchdog triggered, forcing end turn");
        try {
          endEnemyTurn(battle);
        } catch (err) {
          console.error("watchdog endEnemyTurn threw", err);
        }
        tick();
        enemyRunningRef.current = false;
        setEnemyThinking(false);
      }
    }, 20000);

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      for (const t of sleepTimersRef.current) clearTimeout(t);
      sleepTimersRef.current.clear();
    };
    // SAFE: the runner is a self-contained async loop that drives the
    // entire enemy turn — re-running mid-flight would spawn a second
    // parallel runner. The enemyRunningRef guard + phase check at top of
    // every iteration are how we stay single-instance. Body reads
    // battle.* at each step (engine mutates in place, runner doesn't
    // close over stale snapshots).
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
        const payload = {
          ticket: ticket ?? "",
          won: battle.phase === "won",
          turnsElapsed: battle.turn,
          playerHpEnd: battle.player.hp,
          enemyHpEnd: battle.enemy.hp,
          playerPlays: battle.playerPlays,
        };
        // Only the real battle endpoint requires a signature; tutorial
        // uses a simpler one-shot path.
        const sig = !tutorialMode && ticket
          ? await signBattleResult(payload)
          : undefined;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageId: stage.id,
            sig,
            ...payload,
          }),
        });
        const body = await res.json();
        if (body?.ok) {
          if (body.rewards) setRewards(body.rewards);
          setFirstClear(!!body.firstClear);
        } else {
          // 4xx/5xx from the server — surface the reason so the player
          // isn't silently cheated out of rewards (expired ticket, rate
          // limit, sanity check rejection).
          push(body?.error ?? "結算被拒絕", "danger");
        }
      } catch {
        push("結算失敗(無連線)", "danger");
      }
    })();
    // SAFE: must fire EXACTLY ONCE per battle. The reportSent guard at
    // the top of the body provides idempotence within a session; deps
    // are the minimal set that needs to wake it up — phase flipping to
    // won/lost and reportSent's own toggle to detect re-runs. Adding
    // battle.* would resend on every minor mutation; adding push/ticket
    // identities would resend if the toast factory ever changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase, reportSent]);

  // Auto-leave after win/loss — but only when there's no next-stage choice
  // to offer. With a next stage available, we let the player choose.
  useEffect(() => {
    if (battle.phase !== "won" && battle.phase !== "lost") return;
    // Skip auto-leave on win when a next stage exists (we surface a button).
    if (battle.phase === "won" && nextStage && !tutorialMode) return;
    const dest = tutorialMode
      ? "/home"
      : returnHref ?? `/era/${stage.eraId}`;
    const t = setTimeout(() => router.push(dest), AUTO_LEAVE_MS);
    return () => clearTimeout(t);
    // SAFE: schedules a one-shot navigation when the battle ends. router,
    // stage.eraId, nextStage, tutorialMode are all stable per page mount
    // (stage props don't change for the lifetime of a battle). Re-running
    // because router identity changed (which it shouldn't) would just
    // re-arm an identical timer — harmless but pointless.
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

  const onSelectAttacker = (minionUid: string) => {
    if (battle.phase !== "player_turn") return;
    const m = battle.player.board.find((x) => x.uid === minionUid);
    if (!m) return;
    if (m.summonedThisTurn || m.attacksRemaining <= 0) {
      push("這個回合此怪物無法攻擊", "warning");
      return;
    }
    setSelectedAttackerUid((prev) => (prev === minionUid ? null : minionUid));
  };

  const onAttackTarget = (target: { kind: "face" } | { kind: "minion"; uid: string }) => {
    if (!selectedAttackerUid) return;
    if (battle.phase !== "player_turn") return;
    // Taunt check — if enemy has taunt minions, face & non-taunt are invalid
    const hasTaunt = battle.enemy.board.some((m) => m.keywords.includes("taunt"));
    if (hasTaunt) {
      if (target.kind === "face") {
        push("有嘲諷怪物 — 必須先處理", "warning");
        return;
      }
      const t = battle.enemy.board.find((x) => x.uid === target.uid);
      if (t && !t.keywords.includes("taunt")) {
        push("有嘲諷怪物 — 必須先處理", "warning");
        return;
      }
    }
    attackWithMinion(battle, "player", selectedAttackerUid, target);
    setSelectedAttackerUid(null);
    tick();
  };

  const onEndTurn = () => {
    if (battle.phase !== "player_turn") return;
    endPlayerTurn(battle);
    tick();
  };

  const onConfirmMulligan = () => {
    const indices: number[] = [];
    battle.player.hand.forEach((c, i) => {
      if (mulliganPicks.has(c.uid)) indices.push(i);
    });
    applyMulligan(battle, "player", indices);
    setMulliganPicks(new Set());
    setMulliganDone(true);
    tick();
  };

  const toggleMulliganPick = (uid: string) => {
    setMulliganPicks((s) => {
      const n = new Set(s);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
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
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${bg.dark}, ${bg.main}22 50%, ${bg.dark})`,
      }}
    >
      {/* Era-specific arena backdrop (SVG silhouettes + drifting glyphs) */}
      <EraArenaBackdrop eraId={era?.id ?? "primitive"} palette={bg} />

      {/* Battle-entry curtain: two golden veils peel back horizontally on
          mount, making the arrival into a fight feel ceremonial instead
          of snapped-in. ~900ms total; kept behind the game-content z-0. */}
      <BattleCurtain palette={bg} />

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

      {/* Turn transition banner */}
      <TurnBanner phase={battle.phase} turn={battle.turn} />

      {/* Confused-turn telegraph: tells the player WHY they can't act
          right now (1.8s) before the engine auto-skips the turn. */}
      <AnimatePresence>
        {playerConfusedTurn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.32 }}
            className="absolute inset-0 z-[55] flex items-center justify-center bg-veil/70 backdrop-blur-sm pointer-events-none"
          >
            <div className="rounded-2xl border-2 border-purple-400/60 bg-purple-900/60 backdrop-blur-md px-8 py-5 shadow-[0_0_40px_rgba(168,85,247,0.5)] text-center">
              <div className="text-5xl mb-2 animate-pulse">🌀</div>
              <div className="display-serif text-2xl text-purple-100 mb-1 tracking-widest">
                困惑
              </div>
              <div className="text-xs text-purple-200/80 tracking-wider">
                此回合自動跳過
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOSS opener — single-line dramatic quote that flashes after the
          curtain pulls back, before the mulligan. Skipped in tutorial. */}
      <AnimatePresence>
        {openerVisible && bossOpener && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.85 }}
            className="absolute inset-0 z-[58] flex items-center justify-center bg-veil/80 backdrop-blur-md p-4 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20, filter: "blur(8px)" }}
              animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: [0.22, 0.97, 0.32, 1.08], delay: 0.95 }}
              className="max-w-2xl w-full text-center"
            >
              <div
                className="display-serif text-[10px] tracking-[0.5em] uppercase mb-3"
                style={{ color: bg.accent }}
              >
                {stage.mode === "prime" ? "Prime Boss" : "Boss"}
              </div>
              <div className="display-serif text-3xl sm:text-4xl text-parchment mb-2">
                {stage.enemyName}
              </div>
              <div
                className="text-sm sm:text-base text-parchment/85 italic font-[family-name:var(--font-noto-serif)] mt-4 leading-relaxed border-l-2 pl-4 inline-block text-left"
                style={{ borderColor: bg.accent }}
              >
                「{bossOpener}」
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mulligan overlay — first thing the player sees after the curtain
          opens. Lets them swap unwanted starting cards once. */}
      <AnimatePresence>
        {!mulliganDone && !openerVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="absolute inset-0 z-[55] flex items-center justify-center bg-veil/85 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 0.97, 0.32, 1.08], delay: 1.0 }}
              className="max-w-2xl w-full rounded-2xl border border-gold/40 bg-gradient-to-b from-veil/95 to-[#120820]/95 p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
            >
              <h2 className="display-serif text-2xl text-sacred mb-1 text-center">
                選擇起手 — 重抽
              </h2>
              <p className="text-xs text-parchment/70 leading-relaxed text-center mb-4">
                點選不想要的牌標記重抽,被換掉的牌會放回牌堆底部。沒選的話直接「保留全部」。
              </p>
              <div className="flex gap-2 justify-center mb-4 flex-wrap">
                {battle.player.hand.map((c) => {
                  const picked = mulliganPicks.has(c.uid);
                  return (
                    <button
                      key={c.uid}
                      onClick={() => toggleMulliganPick(c.uid)}
                      className={cn(
                        "shrink-0 w-[22vw] max-w-[112px] min-w-[80px] rounded-xl transition-all",
                        picked
                          ? "ring-4 ring-blood/80 -translate-y-1 opacity-65 grayscale"
                          : "hover:-translate-y-1 hover:ring-2 hover:ring-gold/50",
                      )}
                      aria-label={
                        picked ? `取消重抽 ${c.name}` : `標記重抽 ${c.name}`
                      }
                    >
                      <CardTile card={c} size="sm" />
                      {picked && (
                        <div className="text-[10px] tracking-widest text-blood font-bold mt-1">
                          ✕ 重抽
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[11px] text-parchment/50 tracking-widest">
                  {mulliganPicks.size === 0
                    ? "未選擇任何牌 — 將保留全部"
                    : `將重抽 ${mulliganPicks.size} 張`}
                </div>
                <div className="flex gap-2">
                  {mulliganPicks.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMulliganPicks(new Set())}
                    >
                      清除選擇
                    </Button>
                  )}
                  <Button variant="primary" size="md" onClick={onConfirmMulligan}>
                    {mulliganPicks.size === 0 ? "保留全部 →" : `重抽 ${mulliganPicks.size} 張 →`}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial coach overlay — rendered above battle UI but below modals
          and the result screen. Reads the full battle state on every tick. */}
      {tutorialOverlay && mulliganDone && (
        <div className="absolute inset-0 z-[60] pointer-events-none">
          {tutorialOverlay(battle)}
        </div>
      )}

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
          attackMode={selectedAttackerUid !== null}
          onFaceClick={() => onAttackTarget({ kind: "face" })}
        />

        <BoardRow
          side="enemy"
          minions={battle.enemy.board}
          palette={bg}
          attackMode={selectedAttackerUid !== null}
          attackAnim={attackAnim}
          triggerFlashes={triggerFlashes}
          onMinionClick={(uid) => onAttackTarget({ kind: "minion", uid })}
        />

        <div
          ref={logRef}
          className="relative mx-4 my-2 rounded-lg border border-parchment/10 bg-black/30 backdrop-blur p-3 max-h-24 overflow-y-auto text-xs space-y-0.5"
        >
          {(() => {
            // Hide UI-only marker entries (empty text, e.g. minion_attack
            // event used to sync the slide animation) from the visible log.
            const visible = battle.log.filter((l) => l.text !== "");
            const base = Math.max(0, visible.length - 40);
            return visible.slice(-40).map((l, i) => (
              <LogLine key={base + i} entry={l} />
            ));
          })()}
        </div>

        <BoardRow
          side="player"
          minions={battle.player.board}
          palette={bg}
          selectedUid={selectedAttackerUid}
          attackAnim={attackAnim}
          triggerFlashes={triggerFlashes}
          onMinionClick={onSelectAttacker}
        />

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
                    onClick={() =>
                      router.push(returnHref ?? `/era/${stage.eraId}`)
                    }
                  >
                    {returnHref ? "返回" : "返回時代"}
                  </Button>
                </div>
              ) : battle.phase === "won" && !tutorialMode ? (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() =>
                      router.push(returnHref ?? `/era/${stage.eraId}`)
                    }
                  >
                    {returnHref ? "🏆 返回 · 已通關" : "🏆 返回時代 · 終末已達"}
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
  const artUrl = cardArtUrl(card);
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

        <InlineCardAbilities card={card} />

        {card.flavor && (
          <p className="mt-3 text-[11px] text-parchment/40 italic font-[family-name:var(--font-noto-serif)]">
            「{card.flavor}」
          </p>
        )}
      </div>
    </div>
  );
}

const INLINE_TRIGGER_ICON: Record<string, string> = {
  戰吼: "📜",
  亡語: "☠",
  回合開始: "🌅",
  回合結束: "🌙",
  攻擊後: "⚔",
  受擊: "🩸",
};

function InlineCardAbilities({ card }: { card: BattleCard }) {
  const abilities = getAbilityDescriptionsForCard(card.id, card.rarity, card.keywords);
  if (abilities.length === 0) return null;
  return (
    <div className="mt-3 space-y-1">
      {abilities.map((line, i) => {
        const [trig, ...rest] = line.split(":");
        const t = trig.trim();
        const icon = INLINE_TRIGGER_ICON[t] ?? "◆";
        return (
          <div
            key={i}
            className="text-[11px] px-2 py-1.5 rounded bg-gradient-to-r from-rarity-super/10 to-veil/60 border border-rarity-super/40 flex items-start gap-1.5"
          >
            <span className="shrink-0 w-5 h-5 rounded-full bg-rarity-super/25 border border-rarity-super/50 flex items-center justify-center text-[11px]">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-rarity-super font-semibold tracking-wider">
                {t}
              </span>
              <span className="text-parchment/85 ml-1.5">
                {rest.join(":").trim()}
              </span>
            </div>
          </div>
        );
      })}
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
  attackMode,
  onFaceClick,
}: {
  enemy: SideState;
  emoji: string;
  palette: { main: string; accent: string };
  confused: boolean;
  thinking: boolean;
  intent: EnemyIntent | null;
  attackMode?: boolean;
  onFaceClick?: () => void;
}) {
  return (
    <div className="relative flex items-center gap-3 px-4 pt-3 pb-2">
      {intent && <EnemyIntentBadge intent={intent} />}
      <button
        onClick={attackMode ? onFaceClick : undefined}
        disabled={!attackMode}
        className={cn(
          "relative w-20 h-20 rounded-full border-2 flex items-center justify-center text-5xl shrink-0",
          thinking && "enemy-pulse",
          attackMode && "cursor-crosshair ring-4 ring-blood/80 animate-pulse",
        )}
        style={{
          borderColor: palette.main,
          background: `${palette.main}22`,
          ["--pulse-color" as string]: palette.main,
        }}
        aria-label={attackMode ? "攻擊敵人面部" : enemy.name}
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
        {attackMode && (
          <span className="absolute inset-0 flex items-center justify-center text-blood text-4xl pointer-events-none">
            🎯
          </span>
        )}
      </button>
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

// ────────────────────────────────────────────────────────────────────────
// Board row — renders minions for a side, handles attack clicks.
// ────────────────────────────────────────────────────────────────────────

function BoardRow({
  side,
  minions,
  palette,
  selectedUid,
  attackMode,
  attackAnim,
  triggerFlashes,
  onMinionClick,
}: {
  side: "player" | "enemy";
  minions: Minion[];
  palette: { main: string; accent: string };
  selectedUid?: string | null;
  attackMode?: boolean;
  attackAnim?: {
    attackerUid: string;
    attackerSide: "player" | "enemy";
    targetKind: "face" | "minion";
    ts: number;
  } | null;
  triggerFlashes?: Record<string, number>;
  onMinionClick?: (uid: string) => void;
}) {
  if (minions.length === 0) {
    return (
      <div className="relative h-20 flex items-center justify-center text-parchment/20 text-[11px] tracking-widest px-4">
        {side === "player" ? "— 我方戰場(空) —" : "— 敵方戰場(空) —"}
      </div>
    );
  }
  const hasTaunt = minions.some((m) => m.keywords.includes("taunt"));
  return (
    <div className="relative h-24 flex items-center justify-center gap-2 px-2 flex-wrap">
      <AnimatePresence mode="popLayout">
        {minions.map((m) => {
          const isSelected = selectedUid === m.uid;
          const canAct =
            side === "player" &&
            !m.summonedThisTurn &&
            m.attacksRemaining > 0;
          const isAttackableTaunt = side === "enemy" && m.keywords.includes("taunt");
          const mustAttackThis = attackMode && hasTaunt && !isAttackableTaunt;
          const isAttacking =
            attackAnim?.attackerUid === m.uid &&
            attackAnim?.attackerSide === side;
          const attackTargetKind = isAttacking ? attackAnim?.targetKind : undefined;
          const triggerFlashKey = triggerFlashes?.[m.uid];
          return (
            <MinionCard
              key={m.uid}
              minion={m}
              side={side}
              palette={palette}
              selected={isSelected}
              canAct={canAct}
              highlighted={attackMode && side === "enemy" && !mustAttackThis}
              dimmed={mustAttackThis}
              isAttacking={isAttacking}
              attackTargetKind={attackTargetKind}
              triggerFlashKey={triggerFlashKey}
              onClick={() => onMinionClick?.(m.uid)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function MinionCard({
  minion,
  side,
  palette,
  selected,
  canAct,
  highlighted,
  dimmed,
  isAttacking,
  attackTargetKind,
  triggerFlashKey,
  onClick,
}: {
  minion: Minion;
  side: "player" | "enemy";
  palette: { main: string; accent: string };
  selected?: boolean;
  canAct?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  isAttacking?: boolean;
  attackTargetKind?: "face" | "minion";
  triggerFlashKey?: number;
  onClick?: () => void;
}) {
  const hasTaunt = minion.keywords.includes("taunt");
  const hasDivineShield = minion.shielded;
  const isSleeping = minion.summonedThisTurn || minion.attacksRemaining <= 0;
  const abilities = getAbilitiesFor(minion);
  const primaryAbility = abilities[0];
  const abilityIcon = primaryAbility ? ABILITY_TRIGGER_ICON[primaryAbility.trigger] : null;
  const abilityTitle = abilities.length > 0
    ? "\n技能:\n" + abilities.map((a) => `· ${a.description}`).join("\n")
    : "";
  // Track HP changes so we can flash the card red when it takes damage,
  // and float a "−N" damage number up from the card that got hit.
  const prevHpRef = useRef(minion.hp);
  const [hurtPulse, setHurtPulse] = useState(0);
  const [hitNumbers, setHitNumbers] = useState<{ id: number; delta: number }[]>([]);
  useEffect(() => {
    const delta = minion.hp - prevHpRef.current;
    if (delta < 0) {
      setHurtPulse((k) => k + 1);
      const id = Date.now() + Math.random();
      setHitNumbers((n) => [...n, { id, delta }]);
      const t = setTimeout(() => {
        setHitNumbers((n) => n.filter((h) => h.id !== id));
      }, 1100);
      return () => clearTimeout(t);
    }
    prevHpRef.current = minion.hp;
  }, [minion.hp]);

  // Slide-to-target keyframe: when this minion is the current attacker,
  // briefly offset it toward the opposing side (big leap for face hits,
  // small step for minion trades) then snap back. Direction is inverted
  // for the enemy side so they also lunge "forward" visually.
  const attackDist =
    attackTargetKind === "face" ? 86 : attackTargetKind === "minion" ? 36 : 0;
  const attackDirY = side === "player" ? -attackDist : attackDist;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: side === "player" ? 30 : -30, scale: 0.7 }}
      animate={
        isAttacking
          ? {
              opacity: 1,
              y: [0, attackDirY * 0.3, attackDirY, 0],
              scale: [1, 1.05, 1.1, 1],
              rotate: side === "player" ? [0, -3, 0, 0] : [0, 3, 0, 0],
            }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={{ opacity: 0, scale: 0.4, rotate: side === "player" ? -12 : 12, filter: "blur(3px)" }}
      transition={
        isAttacking
          ? { duration: 0.36, ease: [0.45, 0.05, 0.3, 0.95], times: [0, 0.35, 0.55, 1] }
          : { duration: 0.28, ease: [0.22, 0.97, 0.32, 1.08] }
      }
      onClick={onClick}
      title={`${minion.name} · ATK ${minion.atk} / HP ${minion.hp}/${minion.hpMax}${
        minion.keywords.length ? " · " + minion.keywords.join("/") : ""
      }${abilityTitle}`}
      className={cn(
        "relative rounded-lg border-2 overflow-hidden w-16 h-20 flex flex-col items-center justify-between p-1",
        "bg-gradient-to-b from-veil/80 to-veil/40 backdrop-blur",
        selected && "ring-4 ring-gold animate-pulse scale-105",
        highlighted && "ring-2 ring-blood/60 cursor-crosshair hover:scale-105",
        dimmed && "opacity-40 cursor-not-allowed",
        side === "player" && canAct && !selected && "hover:-translate-y-1",
        side === "player" && isSleeping && "opacity-75",
        hasTaunt && "shadow-[0_0_14px_rgba(212,168,75,0.6)]",
      )}
      style={{
        borderColor: hasTaunt
          ? "#D4A84B"
          : hasDivineShield
            ? "#93C2F1"
            : palette.main,
      }}
    >
      {hurtPulse > 0 && (
        <motion.span
          key={hurtPulse}
          initial={{ opacity: 0.85, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0 bg-blood/60 pointer-events-none"
        />
      )}
      {/* Trigger-fire glow: golden halo pulse when this minion's ability fires */}
      <AnimatePresence>
        {triggerFlashKey !== undefined && (
          <motion.span
            key={triggerFlashKey}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 0.95, 0], scale: [0.9, 1.25, 1.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: "0 0 18px 6px rgba(212,168,75,0.9), inset 0 0 16px rgba(255,230,160,0.6)",
            }}
          />
        )}
      </AnimatePresence>
      {/* Per-minion damage numbers floating up from the card */}
      <AnimatePresence>
        {hitNumbers.map((h) => (
          <motion.span
            key={h.id}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -34, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.05, ease: "easeOut", times: [0, 0.15, 0.7, 1] }}
            className="absolute left-1/2 -translate-x-1/2 -top-2 text-danger text-base font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] pointer-events-none font-[family-name:var(--font-mono)] tabular-nums"
          >
            {h.delta}
          </motion.span>
        ))}
      </AnimatePresence>
      <div className="text-lg leading-none">
        {minion.rarity === "UR" ? "🌟" : minion.rarity === "SSR" ? "⭐" : minion.rarity === "SR" ? "✦" : "·"}
      </div>
      <div className="text-[9px] text-parchment/90 truncate w-full text-center leading-tight">
        {minion.name.slice(0, 4)}
      </div>
      <div className="flex items-end justify-between w-full text-[10px] font-[family-name:var(--font-mono)] font-bold tabular-nums">
        <span className="text-orange-300">⚔{minion.atk}</span>
        <span className={cn(minion.hp < minion.hpMax ? "text-rose-300" : "text-emerald-300")}>
          {minion.hp}
        </span>
      </div>
      {hasTaunt && (
        <span className="absolute -top-1 -left-1 text-[10px] bg-gold text-veil rounded-full w-4 h-4 flex items-center justify-center" title="嘲諷">
          🛡
        </span>
      )}
      {hasDivineShield && (
        <span className="absolute -top-1 -right-1 text-[10px] bg-info text-veil rounded-full w-4 h-4 flex items-center justify-center" title="聖盾">
          ✨
        </span>
      )}
      {isSleeping && side === "player" && (
        <span className="absolute top-1 right-1 text-[10px] opacity-70" title="召喚沉睡">
          💤
        </span>
      )}
      {abilityIcon && (
        <span
          className="absolute -bottom-1 -left-1 text-[10px] bg-rarity-super/90 text-veil rounded-full w-4 h-4 flex items-center justify-center border border-rarity-super"
          title={primaryAbility?.description}
        >
          {abilityIcon}
        </span>
      )}
    </motion.button>
  );
}

const ABILITY_TRIGGER_ICON: Record<string, string> = {
  battlecry: "📜",
  deathrattle: "☠",
  start_of_turn: "🌅",
  end_of_turn: "🌙",
  on_attack: "⚔",
  on_damaged: "🩸",
};

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
      {/* Combo counter — surfaces what was previously hidden. The
          combo keyword pays out at ≥2 prior plays, so the threshold
          glow at 2+ tells the player when their next combo card will
          actually multiply (×1.5). */}
      {side.combosThisTurn > 0 && (
        <StatusPill
          icon="🔗"
          value={
            side.combosThisTurn >= 2
              ? `${side.combosThisTurn} · 連擊已啟動`
              : `${side.combosThisTurn}`
          }
          title="本回合出牌數 — 第 3 張起 combo 卡 +50% 威力"
          tone={side.combosThisTurn >= 2 ? "legend" : "muted"}
        />
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

function BattleCurtain({ palette }: { palette: { main: string; accent: string; dark: string } }) {
  // Mount-only, fires once per battle; auto-unmounts after the reveal.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1050);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: "-101%" }}
        transition={{ duration: 0.85, ease: [0.77, 0, 0.18, 1], delay: 0.08 }}
        className="absolute inset-y-0 left-0 w-1/2"
        style={{
          background: `linear-gradient(90deg, ${palette.dark} 0%, ${palette.main}dd 60%, ${palette.accent}80 100%)`,
          boxShadow: `inset -12px 0 32px ${palette.accent}60`,
        }}
      />
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: "101%" }}
        transition={{ duration: 0.85, ease: [0.77, 0, 0.18, 1], delay: 0.08 }}
        className="absolute inset-y-0 right-0 w-1/2"
        style={{
          background: `linear-gradient(270deg, ${palette.dark} 0%, ${palette.main}dd 60%, ${palette.accent}80 100%)`,
          boxShadow: `inset 12px 0 32px ${palette.accent}60`,
        }}
      />
      {/* Center seam glow right before curtains split */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0.2 }}
        animate={{ opacity: [0, 1, 0], scaleY: [0.2, 1, 0.3] }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2"
        style={{
          background: `linear-gradient(180deg, transparent, ${palette.accent}, transparent)`,
          boxShadow: `0 0 24px ${palette.accent}`,
        }}
      />
    </div>
  );
}

function TurnBanner({ phase, turn }: { phase: string; turn: number }) {
  const [showKey, setShowKey] = useState<string | null>(null);
  const prevRef = useRef<string>("");
  useEffect(() => {
    if (phase !== "player_turn" && phase !== "enemy_turn") return;
    const key = `${phase}-${turn}`;
    if (prevRef.current === key) return;
    prevRef.current = key;
    setShowKey(key);
    const t = setTimeout(() => setShowKey((k) => (k === key ? null : k)), 900);
    return () => clearTimeout(t);
  }, [phase, turn]);

  const visible = showKey !== null;
  const isPlayer = phase === "player_turn";
  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={showKey}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 0.97, 0.32, 1.08] }}
            className={cn(
              "px-8 py-3 rounded-full border-2 backdrop-blur-md shadow-2xl",
              "display-serif text-2xl tracking-[0.5em]",
              isPlayer
                ? "border-gold text-gold bg-gold/10"
                : "border-blood text-blood bg-blood/10",
            )}
          >
            {isPlayer ? "你的回合" : "敵方回合"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
