"use client";

import { EraCard } from "@/components/game/EraCard";
import type { Era } from "@/lib/constants/eras";
import { motion } from "framer-motion";

interface Tile {
  era: Era;
  believers: number;
  dailyLegendName?: string;
}

export function WorldGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map((t, i) => (
        <motion.div
          key={t.era.id}
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: i * 0.06,
            duration: 0.5,
            ease: [0.22, 0.97, 0.32, 1.08],
          }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <EraCard
            era={t.era}
            believers={t.believers}
            dailyLegendName={t.dailyLegendName}
          />
        </motion.div>
      ))}
    </div>
  );
}
