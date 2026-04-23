"use client";

import { CardTile } from "@/components/game/CardTile";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ERAS } from "@/lib/constants/eras";
import {
  copiesNeeded,
  effectivePower,
  FUSION_INPUTS,
  MAX_STARS,
} from "@/lib/forge";
import { cn } from "@/lib/utils";
import type { Rarity } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fuseCards, upgradeCardStars } from "./actions";

interface CardLite {
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
}
interface Group {
  cardId: string;
  best: number;
  count: number;
  instances: { id: string; stars: number }[];
  card: CardLite;
}

interface Props {
  groups: Group[];
}

type Tab = "upgrade" | "fusion";
type RFilter = "ALL" | Rarity;
type EFilter = "ALL" | string;

const RARITIES: RFilter[] = ["ALL", "UR", "SSR", "SR", "R"];

export function ForgeClient({ groups }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("upgrade");
  const [rFilter, setRFilter] = useState<RFilter>("ALL");
  const [eFilter, setEFilter] = useState<EFilter>("ALL");

  return (
    <>
      <PageHeader
        eyebrow="Forge"
        title="鍛造所"
        subtitle="升星讓卡更強 · 融合把重複卡轉成高階卡"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-parchment/10">
        <button
          onClick={() => setTab("upgrade")}
          className={cn(
            "px-4 py-2 text-sm tracking-wider border-b-2 transition-colors",
            tab === "upgrade"
              ? "border-gold text-gold"
              : "border-transparent text-parchment/50 hover:text-parchment",
          )}
        >
          ⭐ 升星
        </button>
        <button
          onClick={() => setTab("fusion")}
          className={cn(
            "px-4 py-2 text-sm tracking-wider border-b-2 transition-colors",
            tab === "fusion"
              ? "border-gold text-gold"
              : "border-transparent text-parchment/50 hover:text-parchment",
          )}
        >
          🔮 融合
        </button>
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
      </div>

      {tab === "upgrade" ? (
        <UpgradeTab
          groups={groups.filter((g) => {
            if (rFilter !== "ALL" && g.card.rarity !== rFilter) return false;
            if (eFilter !== "ALL" && g.card.eraId !== eFilter) return false;
            return true;
          })}
          pending={pending}
          startTransition={startTransition}
          onSuccess={() => router.refresh()}
          push={push}
        />
      ) : (
        <FusionTab
          groups={groups.filter((g) => {
            if (rFilter !== "ALL" && g.card.rarity !== rFilter) return false;
            if (eFilter !== "ALL" && g.card.eraId !== eFilter) return false;
            return true;
          })}
          pending={pending}
          startTransition={startTransition}
          onSuccess={() => router.refresh()}
          push={push}
        />
      )}
    </>
  );
}

// =================================================================
// Upgrade Tab
// =================================================================

function UpgradeTab({
  groups,
  pending,
  startTransition,
  onSuccess,
  push,
}: {
  groups: Group[];
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onSuccess: () => void;
  push: (msg: string, v?: "success" | "danger" | "warning") => void;
}) {
  const upgradable = useMemo(() => {
    return [...groups]
      .filter((g) => g.best < MAX_STARS && g.count - 1 >= copiesNeeded(g.best))
      .sort((a, b) => b.best - a.best);
  }, [groups]);

  const locked = useMemo(() => {
    return groups
      .filter((g) => g.best < MAX_STARS && g.count - 1 < copiesNeeded(g.best))
      .slice(0, 24);
  }, [groups]);

  const maxed = useMemo(() => {
    return groups.filter((g) => g.best >= MAX_STARS);
  }, [groups]);

  const onUpgrade = (cardId: string) => {
    startTransition(async () => {
      const r = await upgradeCardStars(cardId);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      push(`升星成功 → ${r.newStars}★(消耗 ${r.consumed} 張)`, "success");
      onSuccess();
    });
  };

  return (
    <>
      {upgradable.length > 0 && (
        <section className="mb-6">
          <h2 className="display-serif text-sm text-sacred mb-3 tracking-wider">
            ⭐ 可升星({upgradable.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {upgradable.map((g) => (
              <UpgradeCardItem
                key={g.cardId}
                group={g}
                disabled={pending}
                onUpgrade={() => onUpgrade(g.cardId)}
              />
            ))}
          </div>
        </section>
      )}

      {locked.length > 0 && (
        <section className="mb-6">
          <h2 className="display-serif text-sm text-parchment/60 mb-3 tracking-wider">
            📋 需要更多同名卡({locked.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {locked.map((g) => (
              <UpgradeCardItem
                key={g.cardId}
                group={g}
                disabled={true}
                onUpgrade={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {maxed.length > 0 && (
        <section>
          <h2 className="display-serif text-sm text-gold/70 mb-3 tracking-wider">
            👑 已達 {MAX_STARS}★({maxed.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {maxed.map((g) => (
              <UpgradeCardItem
                key={g.cardId}
                group={g}
                disabled={true}
                onUpgrade={() => {}}
              />
            ))}
          </div>
        </section>
      )}

      {groups.length === 0 && (
        <div className="py-20 text-center text-parchment/40">
          尚未擁有卡牌
        </div>
      )}
    </>
  );
}

function UpgradeCardItem({
  group,
  disabled,
  onUpgrade,
}: {
  group: Group;
  disabled: boolean;
  onUpgrade: () => void;
}) {
  const needed = copiesNeeded(group.best);
  const available = group.count - 1;
  const maxedOut = group.best >= MAX_STARS;
  const pct = needed > 0 ? Math.min(100, (available / needed) * 100) : 100;
  const currentPower = effectivePower(group.card.power, group.best);
  const nextPower = effectivePower(group.card.power, group.best + 1);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <CardTile card={group.card} size="sm" />
        <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-gold text-veil font-bold">
          {group.best}★
        </div>
      </div>
      <div className="w-full text-[10px] text-parchment/60 text-center">
        擁有 {group.count} 張 · 威 {currentPower}
        {!maxedOut && ` → ${nextPower}`}
      </div>
      {!maxedOut && (
        <>
          <div className="w-full h-1 rounded-full bg-parchment/10 overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                pct >= 100 ? "bg-gold" : "bg-parchment/40",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[10px] text-parchment/50">
            {available} / {needed} 同名卡
          </div>
          <Button
            variant={pct >= 100 ? "primary" : "ghost"}
            size="sm"
            disabled={disabled || pct < 100}
            onClick={onUpgrade}
            className="w-full !text-xs"
          >
            升至 {group.best + 1}★
          </Button>
        </>
      )}
      {maxedOut && (
        <div className="text-[10px] text-gold tracking-widest">極星已達</div>
      )}
    </div>
  );
}

// =================================================================
// Fusion Tab
// =================================================================

function FusionTab({
  groups,
  pending,
  startTransition,
  onSuccess,
  push,
}: {
  groups: Group[];
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onSuccess: () => void;
  push: (msg: string, v?: "success" | "danger" | "warning") => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<
    | { name: string; rarity: string }
    | null
  >(null);

  // Validation: same rarity + same era
  const selectedGroups = selected
    .map((ownedId) => {
      for (const g of groups) {
        const inst = g.instances.find((i) => i.id === ownedId);
        if (inst) return { g, inst };
      }
      return null;
    })
    .filter((x): x is { g: Group; inst: { id: string; stars: number } } => x !== null);

  const selectionValid = useMemo(() => {
    if (selected.length !== FUSION_INPUTS) return false;
    const rarity = selectedGroups[0]?.g.card.rarity;
    const era = selectedGroups[0]?.g.card.eraId;
    return selectedGroups.every(
      (s) => s.g.card.rarity === rarity && s.g.card.eraId === era,
    );
  }, [selected, selectedGroups]);

  const selectionReason = useMemo(() => {
    if (selected.length === 0) return `選 ${FUSION_INPUTS} 張同稀有度同時代的卡`;
    if (selected.length < FUSION_INPUTS) return `再選 ${FUSION_INPUTS - selected.length} 張`;
    if (!selectionValid) return "三張必須稀有度 + 時代相同";
    const r = selectedGroups[0].g.card.rarity;
    return `融合成 1 張 ${nextRarityLabel(r)}`;
  }, [selected, selectionValid, selectedGroups]);

  const toggle = (ownedId: string, group: Group, instance: { id: string; stars: number }) => {
    if (selected.includes(ownedId)) {
      setSelected(selected.filter((s) => s !== ownedId));
      return;
    }
    if (selected.length >= FUSION_INPUTS) {
      push(`最多 ${FUSION_INPUTS} 張`, "warning");
      return;
    }
    // Prevent fusing highest-star owned card (prevents accidental progress loss)
    if (instance.stars === group.best && group.count === 1) {
      push("這是您這張卡的唯一副本,無法融合", "warning");
      return;
    }
    setSelected([...selected, ownedId]);
  };

  const fuse = () => {
    if (!selectionValid) return;
    startTransition(async () => {
      const r = await fuseCards(selected);
      if (!r.ok) {
        push(r.error, "danger");
        return;
      }
      setResult({ name: r.resultName, rarity: r.resultRarity });
      setSelected([]);
      onSuccess();
    });
  };

  // Flatten instances for display
  const fusibleGroups = groups.filter((g) => {
    // Only show groups where user has AT LEAST 1 instance that isn't their "only best copy"
    return g.count > 0 && g.card.rarity !== "UR";
  });

  return (
    <>
      {/* Selection panel */}
      <div className="sticky top-12 z-10 mb-4 p-4 rounded-xl border border-gold/30 bg-veil/80 backdrop-blur">
        <div className="flex items-center gap-3 mb-3">
          {Array.from({ length: FUSION_INPUTS }).map((_, i) => {
            const entry = selectedGroups[i];
            return (
              <div
                key={i}
                className={cn(
                  "w-14 h-18 rounded-lg border-2 flex items-center justify-center text-xs",
                  entry ? "border-gold" : "border-parchment/20 border-dashed",
                )}
              >
                {entry ? (
                  <div className="text-center">
                    <div className="text-xs text-parchment">{entry.g.card.name.slice(0, 3)}</div>
                    <div className="text-[9px] text-gold">{entry.inst.stars}★</div>
                  </div>
                ) : (
                  <span className="text-parchment/30">#{i + 1}</span>
                )}
              </div>
            );
          })}
          <span className="text-[10px] text-gold">→</span>
          <div className="w-14 h-18 rounded-lg border-2 border-dashed border-rarity-legend flex items-center justify-center text-xs text-rarity-legend">
            ???
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-parchment/70">{selectionReason}</div>
          <Button
            variant="primary"
            size="sm"
            disabled={pending || !selectionValid}
            onClick={fuse}
          >
            {pending ? "融合中…" : "🔮 融合"}
          </Button>
        </div>
      </div>

      {/* Grid of fusible cards (showing every instance so star-1 dupes are clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {fusibleGroups.flatMap((g) =>
          g.instances.map((inst) => {
            const picked = selected.includes(inst.id);
            return (
              <button
                key={inst.id}
                onClick={() => toggle(inst.id, g, inst)}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-0 rounded-lg transition-transform",
                  picked && "ring-2 ring-gold ring-offset-2 ring-offset-veil -translate-y-1",
                )}
              >
                <div className="relative">
                  <CardTile card={g.card} size="sm" />
                  <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-gold text-veil font-bold">
                    {inst.stars}★
                  </div>
                  {picked && (
                    <div className="absolute inset-0 bg-gold/20 rounded-xl flex items-center justify-center">
                      <span className="text-3xl">✓</span>
                    </div>
                  )}
                </div>
              </button>
            );
          }),
        )}
      </div>

      {fusibleGroups.length === 0 && (
        <div className="py-20 text-center text-parchment/40">
          沒有可融合的卡牌
        </div>
      )}

      <Modal
        open={result !== null}
        onClose={() => setResult(null)}
        title="融合成功"
        className="max-w-md text-center"
      >
        {result && (
          <>
            <div className="text-5xl mb-3">🎆</div>
            <div className="text-xs text-rarity-legend tracking-widest mb-1">
              {result.rarity}
            </div>
            <div className="display-serif text-2xl text-sacred mb-4">{result.name}</div>
            <p className="text-parchment/60 text-xs mb-4">
              三張卡融為一張新生。已加入您的圖鑑。
            </p>
            <Button variant="primary" size="sm" onClick={() => setResult(null)}>
              收下
            </Button>
          </>
        )}
      </Modal>
    </>
  );
}

function nextRarityLabel(r: Rarity): string {
  if (r === "R") return "SR";
  if (r === "SR") return "SSR";
  if (r === "SSR") return "UR";
  return "—";
}
