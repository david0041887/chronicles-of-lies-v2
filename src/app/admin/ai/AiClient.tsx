"use client";

import { CardTile } from "@/components/game/CardTile";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ERAS } from "@/lib/constants/eras";
import type { Card, Rarity } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearCardArt, generateCardArt } from "./actions";

interface Props {
  cards: Card[];
  enabled: boolean;
}

type RFilter = "ALL" | Rarity;
type EFilter = "ALL" | string;

const RARITIES: RFilter[] = ["ALL", "SSR", "SR", "R"];

export function AiClient({ cards, enabled }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rFilter, setRFilter] = useState<RFilter>("ALL");
  const [eFilter, setEFilter] = useState<EFilter>("ALL");

  const filtered = cards.filter((c) => {
    if (rFilter !== "ALL" && c.rarity !== rFilter) return false;
    if (eFilter !== "ALL" && c.eraId !== eFilter) return false;
    return true;
  });

  const runGenerate = (id: string) => {
    setActiveId(id);
    startTransition(async () => {
      const r = await generateCardArt(id);
      setActiveId(null);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      push("卡面生成完成", "success");
      router.refresh();
    });
  };

  const runClear = (id: string) => {
    setActiveId(id);
    startTransition(async () => {
      await clearCardArt(id);
      setActiveId(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="flex gap-1">
          {RARITIES.map((r) => (
            <button
              key={r}
              onClick={() => setRFilter(r)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                rFilter === r
                  ? "bg-gold/20 border-gold text-gold"
                  : "border-parchment/20 text-parchment/60 hover:border-gold/40"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-parchment/10 mx-1" />
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setEFilter("ALL")}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              eFilter === "ALL"
                ? "bg-gold/20 border-gold text-gold"
                : "border-parchment/20 text-parchment/60 hover:border-gold/40"
            }`}
          >
            全時代
          </button>
          {ERAS.map((e) => (
            <button
              key={e.id}
              onClick={() => setEFilter(e.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                eFilter === e.id
                  ? "border-gold text-gold bg-gold/10"
                  : "border-parchment/20 text-parchment/60 hover:border-gold/40"
              }`}
            >
              {e.emoji} {e.name}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-parchment/40">
          {filtered.length} 張
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((c) => {
          const busy = pending && activeId === c.id;
          return (
            <div key={c.id} className="flex flex-col items-center gap-2">
              <div className="relative">
                <CardTile card={c} size="sm" />
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-veil/80 backdrop-blur-sm rounded-xl">
                    <div className="text-xs text-gold tracking-widest animate-pulse">
                      生成中…
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-1 w-full">
                <Button
                  size="sm"
                  variant={c.imageUrl ? "ghost" : "primary"}
                  disabled={!enabled || pending}
                  onClick={() => runGenerate(c.id)}
                  className="flex-1 !text-xs"
                >
                  {c.imageUrl ? "重生成" : "生成"}
                </Button>
                {c.imageUrl && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={pending}
                    onClick={() => runClear(c.id)}
                    className="!text-xs !px-2"
                    title="清除卡面"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
