"use client";

import { useState, useTransition } from "react";
import { reseedStages } from "./actions";

export function ReseedStagesButton({ currentCount }: { currentCount: number }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = () => {
    if (
      !confirm(
        `重新填充關卡?\n\n目前資料庫有 ${currentCount} 關。\n執行後會新增 / 更新到 70 關(10 時代 × 4 普通 + 3 Prime)。`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await reseedStages();
      if (res.ok) {
        setMsg(`✔ ${res.created} 關已寫入(${res.eras} 時代)`);
      } else {
        setMsg(`✖ ${res.error ?? "失敗"}`);
      }
      setTimeout(() => setMsg(null), 5000);
    });
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={onClick}
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded border border-parchment/40 text-parchment hover:border-gold hover:text-gold tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "填充中…" : "🗺️ 重新填充關卡"}
      </button>
      {msg && (
        <span className="text-[10px] text-parchment/50 tabular-nums">{msg}</span>
      )}
    </div>
  );
}
