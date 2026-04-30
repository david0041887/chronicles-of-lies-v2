"use client";

import { CardTile } from "@/components/game/CardTile";
import { CardDetailModal } from "@/components/game/CardDetailModal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/Toast";
import { DECK_SIZE, MAX_COPIES_PER_CARD } from "@/lib/battle/deck";
import { ERAS } from "@/lib/constants/eras";
import { cn } from "@/lib/utils";
import type { Rarity } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  clearDeckSlot,
  copyDeckSlot,
  saveDeck,
  switchActiveSlot,
} from "./actions";
import { SLOT_LABEL } from "./constants";

interface Card {
  id: string;
  name: string;
  nameEn: string | null;
  eraId: string;
  rarity: Rarity;
  type: string;
  cost: number;
  power: number;
  keywords: string[];
  flavor: string | null;
  imageUrl: string | null;
  hasImage: boolean;
  ownedCount: number;
}

interface Props {
  ownedCards: Card[];
  /** Card ids saved in each slot 1..maxSlots. Empty arrays for unused
   *  slots so the UI can render placeholder tabs. */
  slotDecks: Record<number, string[]>;
  /** Slot used in battles. Switching is a separate server action. */
  activeSlot: number;
  /** Total slots available (currently 3). */
  maxSlots: number;
}

type RFilter = "ALL" | Rarity;
type EFilter = "ALL" | string;

const RARITIES: RFilter[] = ["ALL", "UR", "SSR", "SR", "R"];

function countsFromIds(ids: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const id of ids) m[id] = (m[id] ?? 0) + 1;
  return m;
}

function idsFromCounts(counts: Record<string, number>): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) out.push(id);
  }
  return out;
}

export function DeckClient({
  ownedCards,
  slotDecks,
  activeSlot: initialActiveSlot,
  maxSlots,
}: Props) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  // Which slot the user is currently editing (UI state — independent of
  // which slot is "active in battle"). Defaults to the active slot.
  const [editSlot, setEditSlot] = useState<number>(initialActiveSlot);
  // Snapshot of the in-DB cardIds list per slot. Updated on save / copy
  // / clear so the dirty check is correct against the latest server
  // state without needing a router.refresh().
  const [savedSlots, setSavedSlots] =
    useState<Record<number, string[]>>(slotDecks);
  // Which slot the server thinks is the active one. Updated locally
  // when switchActiveSlot succeeds so UI feedback is instant.
  const [activeSlot, setActiveSlot] = useState<number>(initialActiveSlot);

  // Counts for the slot currently being edited.
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    countsFromIds(savedSlots[initialActiveSlot] ?? []),
  );
  // When the user switches tabs, re-load that slot's contents into the
  // editor. Switching only via the slot-tabs UI path so we won't fight
  // unrelated re-renders.
  useEffect(() => {
    setCounts(countsFromIds(savedSlots[editSlot] ?? []));
  }, [editSlot, savedSlots]);

  const [rFilter, setRFilter] = useState<RFilter>("ALL");
  const [eFilter, setEFilter] = useState<EFilter>("ALL");
  const [preview, setPreview] = useState<Card | null>(null);

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const dirty = useMemo(() => {
    const current = idsFromCounts(counts).sort().join(",");
    const init = [...(savedSlots[editSlot] ?? [])].sort().join(",");
    return current !== init;
  }, [counts, savedSlots, editSlot]);

  // Mana curve: bucket deck cards by cost (0-1, 2, 3, 4, 5+).
  const { curveBuckets, avgCost, typeTotals } = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // 0-1, 2, 3, 4, 5+
    const types: Record<string, number> = {};
    let sumCost = 0;
    let totalInDeck = 0;
    const byId = new Map(ownedCards.map((c) => [c.id, c]));
    for (const [id, n] of Object.entries(counts)) {
      const c = byId.get(id);
      if (!c) continue;
      const b =
        c.cost <= 1 ? 0 : c.cost === 2 ? 1 : c.cost === 3 ? 2 : c.cost === 4 ? 3 : 4;
      buckets[b] += n;
      sumCost += c.cost * n;
      totalInDeck += n;
      types[c.type] = (types[c.type] ?? 0) + n;
    }
    return {
      curveBuckets: buckets,
      avgCost: totalInDeck > 0 ? sumCost / totalInDeck : 0,
      typeTotals: types,
    };
  }, [counts, ownedCards]);

  const filtered = ownedCards.filter((c) => {
    if (rFilter !== "ALL" && c.rarity !== rFilter) return false;
    if (eFilter !== "ALL" && c.eraId !== eFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const rank = { R: 0, SR: 1, SSR: 2, UR: 3 } as const;
    return rank[b.rarity] - rank[a.rarity] || b.power - a.power;
  });

  const add = (id: string) => {
    if (total >= DECK_SIZE) {
      push(`牌組已滿 ${DECK_SIZE} / ${DECK_SIZE}`, "warning");
      return;
    }
    const cur = counts[id] ?? 0;
    if (cur >= MAX_COPIES_PER_CARD) {
      push(`同名卡最多 ${MAX_COPIES_PER_CARD} 張`, "warning");
      return;
    }
    setCounts({ ...counts, [id]: cur + 1 });
  };

  const sub = (id: string) => {
    const cur = counts[id] ?? 0;
    if (cur <= 0) return;
    const next = { ...counts, [id]: cur - 1 };
    if (next[id] === 0) delete next[id];
    setCounts(next);
  };

  const clear = () => setCounts({});

  const autoFill = () => {
    const next: Record<string, number> = {};
    let placed = 0;
    for (const c of sorted) {
      if (placed >= DECK_SIZE) break;
      const cap = Math.min(MAX_COPIES_PER_CARD, DECK_SIZE - placed);
      const copies = Math.min(cap, c.ownedCount);
      if (copies > 0) {
        next[c.id] = copies;
        placed += copies;
      }
    }
    setCounts(next);
    push(`自動填入 ${placed} 張`, "success");
  };

  const onSave = () => {
    if (total !== DECK_SIZE) {
      push(`需要 ${DECK_SIZE} 張,目前 ${total}`, "warning");
      return;
    }
    const cardIds = idsFromCounts(counts);
    startTransition(async () => {
      const r = await saveDeck(cardIds, editSlot);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      // Mirror the just-saved cardIds into local state so the dirty
      // check flips back to clean without waiting for a router refresh.
      setSavedSlots((s) => ({ ...s, [r.slot]: cardIds }));
      push(
        `${SLOT_LABEL[r.slot] ?? `欄位 ${r.slot}`} 已儲存`,
        "success",
      );
    });
  };

  const onSwitchActive = () => {
    if (editSlot === activeSlot) return;
    if ((savedSlots[editSlot]?.length ?? 0) !== DECK_SIZE) {
      push("此欄位牌組不完整,無法設為使用中", "warning");
      return;
    }
    startTransition(async () => {
      const r = await switchActiveSlot(editSlot);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      setActiveSlot(r.slot);
      push(`已切換為「${SLOT_LABEL[r.slot] ?? `欄位 ${r.slot}`}」`, "success");
    });
  };

  const onCopyToHere = (fromSlot: number) => {
    if (fromSlot === editSlot) return;
    if ((savedSlots[fromSlot]?.length ?? 0) !== DECK_SIZE) {
      push("來源牌組不完整", "warning");
      return;
    }
    startTransition(async () => {
      const r = await copyDeckSlot(fromSlot, editSlot);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      const sourceIds = savedSlots[fromSlot] ?? [];
      setSavedSlots((s) => ({ ...s, [r.toSlot]: sourceIds }));
      setCounts(countsFromIds(sourceIds));
      push("已複製到此欄位", "success");
    });
  };

  const onClearSlot = () => {
    if (editSlot === 1) {
      push("主牌組不可刪除,可改為儲存其他內容", "warning");
      return;
    }
    if (!window.confirm(`確定要清空「${SLOT_LABEL[editSlot] ?? `欄位 ${editSlot}`}」?`)) {
      return;
    }
    startTransition(async () => {
      const r = await clearDeckSlot(editSlot);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      setSavedSlots((s) => ({ ...s, [r.slot]: [] }));
      setCounts({});
      // Server may have reset activeSlot to 1 if we just deleted the
      // active one — mirror that locally.
      if (activeSlot === r.slot) setActiveSlot(1);
      push("欄位已清空", "success");
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Deck Forge"
        title="牌組編制"
        subtitle={`30 張牌,同名卡最多 ${MAX_COPIES_PER_CARD} 張。`}
        actions={
          <div className="text-right">
            <div className="text-[10px] text-parchment/50 tracking-wider">牌組</div>
            <div
              className={cn(
                "font-[family-name:var(--font-mono)] text-2xl tabular-nums",
                total === DECK_SIZE ? "text-gold" : "text-parchment",
              )}
            >
              {total} / {DECK_SIZE}
            </div>
          </div>
        }
      />

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-parchment/10 overflow-hidden mb-4">
        <div
          className={cn(
            "h-full transition-all duration-300",
            total === DECK_SIZE ? "bg-gold" : "bg-parchment/40",
          )}
          style={{ width: `${(total / DECK_SIZE) * 100}%` }}
        />
      </div>

      {/* Slot tabs — switch which deck the user is editing */}
      <div className="flex items-stretch gap-2 mb-3">
        {Array.from({ length: maxSlots }).map((_, i) => {
          const slot = i + 1;
          const cardCount = savedSlots[slot]?.length ?? 0;
          const isEditing = editSlot === slot;
          const isActive = activeSlot === slot;
          return (
            <button
              key={slot}
              onClick={() => {
                if (dirty && slot !== editSlot) {
                  if (!window.confirm("目前牌組有未儲存變更,要切換嗎?")) return;
                }
                setEditSlot(slot);
              }}
              className={cn(
                "flex-1 rounded-lg border-2 px-3 py-2 text-left transition-all min-h-[56px]",
                isEditing
                  ? "border-gold bg-gold/10"
                  : "border-parchment/15 bg-veil/40 hover:bg-veil/60",
                pending && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs tracking-widest font-[family-name:var(--font-cinzel)]",
                    isEditing ? "text-gold" : "text-parchment/70",
                  )}
                >
                  {SLOT_LABEL[slot] ?? `欄位 ${slot}`}
                </span>
                {isActive && (
                  <span className="text-[9px] tracking-widest bg-gold text-veil rounded px-1.5 py-0.5 font-bold">
                    使用中
                  </span>
                )}
              </div>
              <div className="text-[11px] text-parchment/50 tabular-nums mt-0.5">
                {cardCount === 0
                  ? "空欄位"
                  : cardCount === DECK_SIZE
                    ? "完整 · 30 張"
                    : `未完成 · ${cardCount}/${DECK_SIZE}`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Slot management bar — set as active / copy from another slot /
          clear this slot. Only shown when there are multiple slots in
          play, so first-time players don't see clutter. */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {editSlot !== activeSlot && (
          <Button
            variant="primary"
            size="sm"
            onClick={onSwitchActive}
            disabled={
              pending ||
              (savedSlots[editSlot]?.length ?? 0) !== DECK_SIZE
            }
          >
            ⚔️ 設為使用中
          </Button>
        )}
        {/* Per-other-slot copy buttons */}
        {Array.from({ length: maxSlots })
          .map((_, i) => i + 1)
          .filter((s) => s !== editSlot && (savedSlots[s]?.length ?? 0) === DECK_SIZE)
          .map((s) => (
            <Button
              key={s}
              variant="ghost"
              size="sm"
              onClick={() => onCopyToHere(s)}
              disabled={pending}
              className="text-xs"
            >
              📋 從「{SLOT_LABEL[s] ?? `欄位 ${s}`}」複製
            </Button>
          ))}
        {editSlot !== 1 && (savedSlots[editSlot]?.length ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSlot}
            disabled={pending}
            className="text-blood/80"
          >
            🗑 清空此欄
          </Button>
        )}
      </div>

      {/* Mana curve + type mix */}
      {total > 0 && (
        <ManaCurvePanel
          buckets={curveBuckets}
          avgCost={avgCost}
          typeTotals={typeTotals}
          total={total}
        />
      )}

      {/* Current deck composition — visible list of what's in the deck */}
      {total > 0 && (
        <CurrentDeckPanel
          counts={counts}
          ownedCards={ownedCards}
          onRemove={(id) => sub(id)}
          onPreview={(id) => {
            const c = ownedCards.find((x) => x.id === id);
            if (c) setPreview(c);
          }}
        />
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="primary" size="sm" onClick={onSave} disabled={pending || !dirty}>
          {pending ? "儲存中…" : dirty ? "儲存牌組" : "已儲存"}
        </Button>
        <Button variant="ghost" size="sm" onClick={autoFill} disabled={pending}>
          🔮 自動填入
        </Button>
        <Button variant="ghost" size="sm" onClick={clear} disabled={pending || total === 0}>
          清空
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1">
          {RARITIES.map((r) => (
            <Pill key={r} active={rFilter === r} onClick={() => setRFilter(r)}>
              {r}
            </Pill>
          ))}
        </div>
        <div className="w-px h-6 bg-parchment/10 mx-1" />
        <div className="flex gap-1 flex-wrap">
          <Pill active={eFilter === "ALL"} onClick={() => setEFilter("ALL")}>
            全時代
          </Pill>
          {ERAS.map((e) => (
            <Pill
              key={e.id}
              active={eFilter === e.id}
              onClick={() => setEFilter(e.id)}
              title={e.name}
            >
              {e.emoji}
            </Pill>
          ))}
        </div>
        <span className="ml-auto text-xs text-parchment/40">
          {sorted.length} 種可用
        </span>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <EmptyState
          icon="🃏"
          title="沒有符合條件的卡牌"
          hint="放寬篩選條件,或先到召喚儀式擴充牌庫。"
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {sorted.map((c) => {
            const inDeck = counts[c.id] ?? 0;
            const capped = inDeck >= MAX_COPIES_PER_CARD;
            return (
              <div key={c.id} className="relative flex flex-col items-center gap-1">
                <div onClick={() => setPreview(c)} className="cursor-pointer">
                  <CardTile
                    card={c}
                    size="sm"
                    ownedCount={c.ownedCount}
                  />
                </div>
                <div className="flex items-stretch gap-1 w-full">
                  <button
                    onClick={() => sub(c.id)}
                    disabled={inDeck === 0}
                    className="flex-1 px-1 py-1 rounded-l bg-veil/60 border border-parchment/20 text-parchment/70 hover:bg-parchment/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  >
                    −
                  </button>
                  <div
                    className={cn(
                      "flex-1 text-center px-1 py-1 text-xs font-[family-name:var(--font-mono)] tabular-nums border-y border-parchment/20",
                      inDeck > 0 ? "bg-gold/20 text-gold" : "bg-veil/60 text-parchment/50",
                    )}
                  >
                    {inDeck}/{MAX_COPIES_PER_CARD}
                  </div>
                  <button
                    onClick={() => add(c.id)}
                    disabled={capped || total >= DECK_SIZE}
                    className={cn(
                      "flex-1 px-1 py-1 rounded-r border border-parchment/20 text-xs",
                      capped || total >= DECK_SIZE
                        ? "bg-veil/60 text-parchment/20 cursor-not-allowed"
                        : "bg-gold/20 text-gold hover:bg-gold/30",
                    )}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CardDetailModal
        card={preview}
        ownedCount={preview?.ownedCount ?? 0}
        onClose={() => setPreview(null)}
      />
    </>
  );
}

/** List of cards currently in the deck, grouped by cardId with count badge. */
function CurrentDeckPanel({
  counts,
  ownedCards,
  onRemove,
  onPreview,
}: {
  counts: Record<string, number>;
  ownedCards: Card[];
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const byId = useMemo(
    () => new Map(ownedCards.map((c) => [c.id, c])),
    [ownedCards],
  );
  const entries = useMemo(() => {
    const rank = { R: 0, SR: 1, SSR: 2, UR: 3 } as const;
    return Object.entries(counts)
      .map(([id, n]) => ({ card: byId.get(id), count: n }))
      .filter((e): e is { card: Card; count: number } => !!e.card)
      .sort((a, b) => {
        const r = rank[b.card.rarity] - rank[a.card.rarity];
        if (r !== 0) return r;
        return a.card.cost - b.card.cost;
      });
  }, [counts, byId]);

  const RARITY_TINT: Record<Rarity, string> = {
    R: "border-rarity-rare/50 text-rarity-rare",
    SR: "border-rarity-super/60 text-rarity-super",
    SSR: "border-rarity-legend/60 text-rarity-legend",
    UR: "border-gold/70 text-gold",
  };

  return (
    <div className="mb-4 p-4 rounded-xl border border-parchment/10 bg-veil/30">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-parchment/50 tracking-[0.25em] uppercase font-[family-name:var(--font-cinzel)]">
          Current Deck · 牌組內容
        </div>
        <div className="text-xs text-parchment/60">
          {entries.length} 種 · 共 {entries.reduce((s, e) => s + e.count, 0)} 張
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(({ card, count }) => (
          <button
            key={card.id}
            onClick={() => onPreview(card.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onRemove(card.id);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border bg-veil/50 hover:bg-veil/70 transition-colors",
              RARITY_TINT[card.rarity],
            )}
            title={`左鍵預覽,右鍵 −1  (${card.rarity} · 費 ${card.cost} · 威 ${card.power})`}
          >
            <span className="text-[9px] opacity-60">{card.rarity}</span>
            <span className="text-parchment max-w-[8rem] truncate">
              {card.name}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] bg-black/40 rounded px-1 text-parchment tabular-nums">
              ×{count}
            </span>
            <span
              role="button"
              aria-label="移除一張"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(card.id);
              }}
              className="text-[10px] text-parchment/50 hover:text-blood cursor-pointer px-0.5"
            >
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ManaCurvePanel({
  buckets,
  avgCost,
  typeTotals,
  total,
}: {
  buckets: number[];
  avgCost: number;
  typeTotals: Record<string, number>;
  total: number;
}) {
  const labels = ["0-1", "2", "3", "4", "5+"];
  const maxBucket = Math.max(1, ...buckets);
  const curveVerdict =
    avgCost < 2
      ? { text: "急速型 · 開場壓制", tone: "text-emerald-400" }
      : avgCost < 3
        ? { text: "均衡型 · 穩健推進", tone: "text-gold" }
        : avgCost < 3.8
          ? { text: "中後期型 · 強度堆疊", tone: "text-sky-400" }
          : { text: "重甲型 · 高費曲線", tone: "text-rose-400" };

  const TYPE_ICONS: Record<string, string> = {
    attack: "⚔️",
    heal: "💚",
    spread: "📢",
    confuse: "🌀",
    buff: "⬆️",
    debuff: "⬇️",
    ritual: "🔮",
  };
  const typeOrder: string[] = [
    "attack",
    "ritual",
    "debuff",
    "heal",
    "spread",
    "buff",
    "confuse",
  ];

  return (
    <div className="mb-4 p-4 rounded-xl border border-parchment/10 bg-veil/30">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <div className="text-[10px] text-parchment/50 tracking-[0.25em] uppercase font-[family-name:var(--font-cinzel)]">
            Mana Curve
          </div>
          <div className={cn("text-sm mt-0.5", curveVerdict.tone)}>
            {curveVerdict.text}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-parchment/50 tracking-wider">
            平均費用
          </div>
          <div className="font-[family-name:var(--font-mono)] text-xl text-parchment tabular-nums">
            {avgCost.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Cost histogram */}
      <div className="grid grid-cols-5 gap-2 items-end h-24">
        {buckets.map((n, i) => {
          const pct = (n / maxBucket) * 100;
          const isHot = i <= 1 && n >= Math.ceil(total * 0.3);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "text-[10px] tabular-nums",
                  n === 0 ? "text-parchment/30" : "text-parchment/80",
                )}
              >
                {n}
              </div>
              <div className="w-full h-full flex items-end">
                <div
                  className={cn(
                    "w-full rounded-t transition-all",
                    n === 0
                      ? "bg-parchment/10"
                      : isHot
                        ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                        : "bg-gradient-to-t from-gold/60 to-gold",
                  )}
                  style={{ height: `${Math.max(4, pct)}%` }}
                />
              </div>
              <div className="text-[10px] text-parchment/50 tabular-nums">
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Type mix */}
      {Object.keys(typeTotals).length > 0 && (
        <div className="mt-3 pt-3 border-t border-parchment/10 flex flex-wrap gap-1.5 text-[11px]">
          {typeOrder
            .filter((t) => typeTotals[t])
            .map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded bg-veil/60 border border-parchment/15 text-parchment/75"
              >
                {TYPE_ICONS[t] ?? "·"} ×{typeTotals[t]}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
