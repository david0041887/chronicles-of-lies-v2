"use client";

import { Pill } from "@/components/ui/Pill";
import { useState } from "react";

const FACTION_LABEL: Record<string, { label: string; tint: string }> = {
  weavers: { label: "編織者", tint: "#D4A84B" },
  veritas: { label: "守真者", tint: "#4A90E2" },
  faceless: { label: "無相", tint: "#9B5DE5" },
};

interface LeaderRow {
  rank: number;
  userId: string;
  username: string;
  faction: string;
  level: number;
  primary: number;
  secondary?: number;
}

export interface LeaderboardData {
  me: { userId: string; username: string };
  tower: LeaderRow[];
  believers: LeaderRow[];
  bosses: LeaderRow[];
  mySnapshot: {
    towerHighest: number;
    towerClears: number;
    believers: number;
    bossesCleared: number;
  };
}

type Tab = "tower" | "believers" | "bosses";

const TAB_META: Record<
  Tab,
  {
    label: string;
    emoji: string;
    primaryLabel: string;
    secondaryLabel?: string;
    suffix?: string;
    explainer: string;
  }
> = {
  tower: {
    label: "幽音塔",
    emoji: "🗼",
    primaryLabel: "最高層",
    secondaryLabel: "累計通過",
    explainer: "依塔內最高紀錄排序;同分時看累計通過次數。",
  },
  believers: {
    label: "信徒",
    emoji: "✨",
    primaryLabel: "總信徒",
    explainer: "歷代累計信徒總數,衡量編織者的歷史影響力。",
  },
  bosses: {
    label: "時代征服",
    emoji: "👑",
    primaryLabel: "通關時代",
    secondaryLabel: "/ 10",
    explainer: "已通關 BOSS 的時代數 — 滿 10 個代表全帷幕征服。",
  },
};

export function LeaderboardClient({ data }: { data: LeaderboardData }) {
  const [tab, setTab] = useState<Tab>("tower");
  const meta = TAB_META[tab];
  const rows = data[tab];
  const myRow = rows.find((r) => r.userId === data.me.userId);

  // What to show for "my own" stats when I'm not in the top N.
  const mySnapshot = (() => {
    switch (tab) {
      case "tower":
        return {
          primary: data.mySnapshot.towerHighest,
          secondary: data.mySnapshot.towerClears,
          show: data.mySnapshot.towerHighest > 0,
        };
      case "believers":
        return {
          primary: data.mySnapshot.believers,
          secondary: undefined,
          show: data.mySnapshot.believers > 0,
        };
      case "bosses":
        return {
          primary: data.mySnapshot.bossesCleared,
          secondary: 10,
          show: data.mySnapshot.bossesCleared > 0,
        };
    }
  })();

  return (
    <div>
      {/* Tab strip */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(TAB_META) as Tab[]).map((t) => (
          <Pill
            key={t}
            active={tab === t}
            onClick={() => setTab(t)}
            className="flex-1 text-center"
          >
            <span className="mr-1">{TAB_META[t].emoji}</span>
            {TAB_META[t].label}
          </Pill>
        ))}
      </div>

      <p className="text-[11px] text-parchment/50 leading-relaxed mb-4 px-1">
        {meta.explainer}
      </p>

      {/* My own snapshot — always visible so the player sees their stat
          even when not in the top 50. Hidden for stats they haven't
          started accumulating yet. */}
      {mySnapshot.show && !myRow && (
        <div className="mb-4 rounded-xl border border-gold/40 bg-gold/8 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] tracking-widest text-gold/70 uppercase font-[family-name:var(--font-cinzel)] mb-0.5">
                我的排名
              </div>
              <div className="text-sm text-parchment">
                {data.me.username} <span className="text-parchment/50">· 未進前 {rows.length || 0} 名</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-[family-name:var(--font-mono)] text-lg text-gold tabular-nums">
                {mySnapshot.primary.toLocaleString()}
                {meta.suffix ?? ""}
              </div>
              {mySnapshot.secondary !== undefined && (
                <div className="text-[10px] text-parchment/50 tabular-nums">
                  {meta.secondaryLabel} {mySnapshot.secondary}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top 50 list */}
      {rows.length === 0 ? (
        <div className="text-center py-12 text-parchment/40 text-sm">
          榜單尚無紀錄 — 第一個踏進去的就是你。
        </div>
      ) : (
        <ol className="rounded-xl border border-parchment/10 bg-veil/40 divide-y divide-parchment/10 overflow-hidden">
          {rows.map((row) => {
            const isMe = row.userId === data.me.userId;
            const factionMeta =
              FACTION_LABEL[row.faction] ?? FACTION_LABEL.weavers;
            return (
              <li
                key={row.userId}
                className={
                  "flex items-center gap-3 px-4 py-2.5 " +
                  (isMe ? "bg-gold/8" : "")
                }
              >
                <span
                  className={
                    "w-8 text-center text-sm font-[family-name:var(--font-cinzel)] tracking-widest shrink-0 " +
                    (row.rank === 1
                      ? "text-gold text-base"
                      : row.rank <= 3
                        ? "text-rarity-super"
                        : "text-parchment/50")
                  }
                >
                  {row.rank === 1
                    ? "🥇"
                    : row.rank === 2
                      ? "🥈"
                      : row.rank === 3
                        ? "🥉"
                        : row.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-parchment truncate">
                      {row.username}
                    </span>
                    {isMe && (
                      <span className="text-[9px] tracking-widest bg-gold text-veil rounded px-1 py-0.5 font-bold shrink-0">
                        我
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-parchment/50 tabular-nums">
                    <span style={{ color: factionMeta.tint }}>● {factionMeta.label}</span>
                    <span>Lv.{row.level}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-[family-name:var(--font-mono)] text-base text-parchment tabular-nums">
                    {row.primary.toLocaleString()}
                  </div>
                  {row.secondary !== undefined && (
                    <div className="text-[10px] text-parchment/45 tabular-nums">
                      {meta.secondaryLabel} {row.secondary}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
