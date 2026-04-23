"use client";

import { CardDetailModal } from "@/components/game/CardDetailModal";
import { CardTile } from "@/components/game/CardTile";
import { ERAS } from "@/lib/constants/eras";
import { cn } from "@/lib/utils";
import type { Card, Rarity } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";

type RarityFilter = "ALL" | Rarity;
type EraFilter = "ALL" | string;

type CardWithImage = Omit<Card, "imageBytes" | never> & { hasImage: boolean };

interface Props {
  cards: CardWithImage[];
  ownedMap: Record<string, number>;
}

const RARITY_FILTERS: RarityFilter[] = ["ALL", "SSR", "SR", "R"];

const SEEN_STORAGE_KEY = "chroniclesCollectionSeen_v1";

export function CollectionClient({ cards, ownedMap }: Props) {
  const [rarity, setRarity] = useState<RarityFilter>("ALL");
  const [era, setEra] = useState<EraFilter>("ALL");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selected, setSelected] = useState<CardWithImage | null>(null);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const [showNewOnly, setShowNewOnly] = useState(false);

  // Compare current owned counts against locally-stored "seen" counts.
  // Cards whose count grew since the last visit get the NEW badge.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let prev: Record<string, number> = {};
    try {
      const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
      if (raw) prev = JSON.parse(raw) as Record<string, number>;
    } catch {
      prev = {};
    }
    const fresh = new Set<string>();
    for (const [id, n] of Object.entries(ownedMap)) {
      if (n > (prev[id] ?? 0)) fresh.add(id);
    }
    setNewCardIds(fresh);
    // After 8 seconds on this page, mark everything as seen so the badges
    // clear on next visit. (Still visible during the current viewing.)
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          SEEN_STORAGE_KEY,
          JSON.stringify(ownedMap),
        );
      } catch {
        /* ignore quota */
      }
    }, 8000);
    return () => window.clearTimeout(t);
  }, [ownedMap]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (rarity !== "ALL" && c.rarity !== rarity) return false;
      if (era !== "ALL" && c.eraId !== era) return false;
      if (ownedOnly && (ownedMap[c.id] ?? 0) === 0) return false;
      if (showNewOnly && !newCardIds.has(c.id)) return false;
      return true;
    });
  }, [cards, rarity, era, ownedOnly, ownedMap, showNewOnly, newCardIds]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Rarity pills */}
        <div className="flex items-center gap-1">
          {RARITY_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRarity(r)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                rarity === r
                  ? "bg-gold/20 border-gold text-gold"
                  : "border-parchment/20 text-parchment/60 hover:border-gold/40",
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-parchment/10 mx-1" />

        {/* Era pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setEra("ALL")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              era === "ALL"
                ? "bg-gold/20 border-gold text-gold"
                : "border-parchment/20 text-parchment/60 hover:border-gold/40",
            )}
          >
            全時代
          </button>
          {ERAS.map((e) => (
            <button
              key={e.id}
              onClick={() => setEra(e.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                era === e.id
                  ? "border-gold text-gold bg-gold/10"
                  : "border-parchment/20 text-parchment/60 hover:border-gold/40",
              )}
            >
              {e.emoji} {e.name}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-parchment/10 mx-1" />

        <label className="flex items-center gap-2 text-xs text-parchment/70 cursor-pointer">
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(e) => setOwnedOnly(e.target.checked)}
            className="accent-gold"
          />
          僅顯示已擁有
        </label>

        {newCardIds.size > 0 && (
          <button
            onClick={() => setShowNewOnly((v) => !v)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              showNewOnly
                ? "bg-amber-400/20 border-amber-400 text-amber-200"
                : "border-amber-400/40 text-amber-300 hover:bg-amber-400/10",
            )}
          >
            ✨ 僅顯示新卡 ({newCardIds.size})
          </button>
        )}

        <span className="ml-auto text-xs text-parchment/40">
          {filtered.length} 張
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-parchment/40">
          沒有符合條件的卡牌。
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
          {filtered.map((c) => (
            <CardTile
              key={c.id}
              card={c}
              ownedCount={ownedMap[c.id] ?? 0}
              size="sm"
              onClick={() => setSelected(c)}
              isNew={newCardIds.has(c.id)}
            />
          ))}
        </div>
      )}

      <CardDetailModal
        card={selected}
        ownedCount={selected ? (ownedMap[selected.id] ?? 0) : 0}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
