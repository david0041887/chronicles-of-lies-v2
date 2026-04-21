"use client";

import { CardTile } from "@/components/game/CardTile";
import { ERAS } from "@/lib/constants/eras";
import { cn } from "@/lib/utils";
import type { Card, Rarity } from "@prisma/client";
import { useMemo, useState } from "react";

type RarityFilter = "ALL" | Rarity;
type EraFilter = "ALL" | string;

interface Props {
  cards: Card[];
  ownedMap: Record<string, number>;
}

const RARITY_FILTERS: RarityFilter[] = ["ALL", "SSR", "SR", "R"];

export function CollectionClient({ cards, ownedMap }: Props) {
  const [rarity, setRarity] = useState<RarityFilter>("ALL");
  const [era, setEra] = useState<EraFilter>("ALL");
  const [ownedOnly, setOwnedOnly] = useState(false);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (rarity !== "ALL" && c.rarity !== rarity) return false;
      if (era !== "ALL" && c.eraId !== era) return false;
      if (ownedOnly && (ownedMap[c.id] ?? 0) === 0) return false;
      return true;
    });
  }, [cards, rarity, era, ownedOnly, ownedMap]);

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
