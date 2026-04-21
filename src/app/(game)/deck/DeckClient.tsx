"use client";

import { CardTile } from "@/components/game/CardTile";
import { CardDetailModal } from "@/components/game/CardDetailModal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { DECK_SIZE, MAX_COPIES_PER_CARD } from "@/lib/battle/deck";
import { ERAS } from "@/lib/constants/eras";
import { cn } from "@/lib/utils";
import type { Rarity } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { saveDeck } from "./actions";

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
  initialDeck: string[];
}

type RFilter = "ALL" | Rarity;
type EFilter = "ALL" | string;

const RARITIES: RFilter[] = ["ALL", "UR", "SSR", "SR", "R"];

export function DeckClient({ ownedCards, initialDeck }: Props) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  // Deck as count-by-cardId
  const initialCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const id of initialDeck) m[id] = (m[id] ?? 0) + 1;
    return m;
  }, [initialDeck]);

  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [rFilter, setRFilter] = useState<RFilter>("ALL");
  const [eFilter, setEFilter] = useState<EFilter>("ALL");
  const [preview, setPreview] = useState<Card | null>(null);

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const dirty = useMemo(() => {
    const current = Object.entries(counts)
      .flatMap(([id, n]) => Array(n).fill(id))
      .sort()
      .join(",");
    const init = [...initialDeck].sort().join(",");
    return current !== init;
  }, [counts, initialDeck]);

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
    const cardIds: string[] = [];
    for (const [id, n] of Object.entries(counts)) {
      for (let i = 0; i < n; i++) cardIds.push(id);
    }
    startTransition(async () => {
      const r = await saveDeck(cardIds);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      push("牌組已儲存", "success");
    });
  };

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-1">
            Deck Forge
          </p>
          <h1 className="display-serif text-3xl text-sacred">牌組編制</h1>
          <p className="text-parchment/60 text-xs mt-1">
            30 張牌,同名卡最多 {MAX_COPIES_PER_CARD} 張。
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

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
            <button
              key={r}
              onClick={() => setRFilter(r)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                rFilter === r
                  ? "bg-gold/20 border-gold text-gold"
                  : "border-parchment/20 text-parchment/60 hover:border-gold/40",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-parchment/10 mx-1" />
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setEFilter("ALL")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              eFilter === "ALL"
                ? "bg-gold/20 border-gold text-gold"
                : "border-parchment/20 text-parchment/60 hover:border-gold/40",
            )}
          >
            全時代
          </button>
          {ERAS.map((e) => (
            <button
              key={e.id}
              onClick={() => setEFilter(e.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                eFilter === e.id
                  ? "border-gold text-gold bg-gold/10"
                  : "border-parchment/20 text-parchment/60 hover:border-gold/40",
              )}
            >
              {e.emoji}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-parchment/40">
          {sorted.length} 種可用
        </span>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="py-20 text-center text-parchment/40">
          沒有符合條件的卡牌
        </div>
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
