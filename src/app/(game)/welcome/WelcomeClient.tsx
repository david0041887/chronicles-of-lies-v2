"use client";

import { Button } from "@/components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface Props {
  username: string;
}

const PAGES = [
  {
    heading: "你從夢中醒來",
    body: (name: string) =>
      `${name},你手中握著一張泛著金光的卡片。夢中有個聲音說:「真實與虛構之間有一層薄膜,稱為帷幕。」`,
  },
  {
    heading: "你繼承了編織者的力量",
    body: () =>
      "每當足夠多的人相信同一件事,那件事就會成真。你,剛剛繼承了編織這張膜的力量。",
  },
  {
    heading: "但你不是第一個",
    body: () =>
      "阿努比斯、德古拉、嫦娥、奧丁—這些名字在你心中發亮。它們曾經存在,現在等你召喚。",
  },
  {
    heading: "帷幕戰爭百年未止",
    body: () =>
      "編織者議會、守真者教團、無相面者—三個立場,一個帷幕。你將站在哪一邊?",
  },
  {
    heading: "現在,讓我們開始第一次對決",
    body: () =>
      "試用大師的牌組感受戰鬥的節奏。教學結束後,你會收到屬於自己的 30 張起始牌組。",
  },
];

export function WelcomeClient({ username }: Props) {
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  return (
    <main className="relative min-h-[calc(100vh-3rem)] flex items-center justify-center px-6 py-10">
      <div className="max-w-xl w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <p className="font-[family-name:var(--font-cinzel)] text-gold/60 tracking-[0.35em] text-xs uppercase mb-4">
              Prologue · {page + 1} / {PAGES.length}
            </p>
            <h1 className="display-serif text-3xl sm:text-4xl text-sacred mb-6 leading-snug">
              {PAGES[page].heading}
            </h1>
            <p className="text-parchment/80 font-[family-name:var(--font-noto-serif)] leading-relaxed text-base sm:text-lg mb-10">
              {PAGES[page].body(username)}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots — clickable so the player can jump around. */}
        <div className="flex justify-center gap-2 mb-8">
          {PAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === page
                  ? "w-8 bg-gold"
                  : i < page
                    ? "w-2 bg-gold/40 hover:bg-gold/60"
                    : "w-2 bg-parchment/20 hover:bg-parchment/40"
              }`}
              aria-label={`第 ${i + 1} 頁`}
            />
          ))}
        </div>

        <div className="flex justify-center items-center gap-3 flex-wrap">
          {page > 0 && (
            <Button variant="ghost" size="md" onClick={() => setPage(page - 1)}>
              上一頁
            </Button>
          )}
          {!last && (
            <Button variant="primary" size="md" onClick={() => setPage(page + 1)}>
              繼續
            </Button>
          )}
          {last && (
            <Link href="/welcome/tutorial">
              <Button variant="primary" size="lg">
                ⚔️ 進入教學戰
              </Button>
            </Link>
          )}
        </div>

        {/* Skip link — small, low-key, never the primary action. Available
            from page 1+ so players who already know the lore can jump
            straight to the practice battle. */}
        {!last && (
          <div className="flex justify-center mt-6">
            <Link
              href="/welcome/tutorial"
              className="text-[11px] text-parchment/40 hover:text-parchment/70 tracking-widest min-h-[28px] px-2"
            >
              跳過序章 → 直接戰鬥
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
