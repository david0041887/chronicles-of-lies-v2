"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { Rarity } from "@prisma/client";

interface Props {
  active: boolean;
  highestRarity: Rarity;
  onComplete: () => void;
}

/**
 * Tightened summon animation — 1600ms total.
 * Phase 1 (0 → 500)  magic circle fades + scales in, rotation engaged
 * Phase 2 (500 → 900) runes ignite + sparks emit
 * Phase 3 (900 → 1400) rarity light column bursts
 * Phase 4 (1400 → 1600) fade out, reveal cards
 */
export function SummonAnimation({ active, highestRarity, onComplete }: Props) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    setPhase(1);
    const t1 = setTimeout(() => setPhase(2), 500);
    const t2 = setTimeout(() => setPhase(3), 900);
    const t3 = setTimeout(() => onComplete(), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active, onComplete]);

  const glow =
    highestRarity === "UR"
      ? "conic-gradient(from 0deg, #FFD700, #B87FEB, #06B6D4, #F5C242, #FFD700)"
      : highestRarity === "SSR"
        ? "radial-gradient(circle, #F5C242 0%, #D4A84B 40%, transparent 70%)"
        : highestRarity === "SR"
          ? "radial-gradient(circle, #B87FEB 0%, #6B2E8A 40%, transparent 70%)"
          : "radial-gradient(circle, #4A90E2 0%, #1B4D8E 40%, transparent 70%)";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="absolute inset-0 bg-veil/85 backdrop-blur-md" />

          <motion.svg
            viewBox="0 0 400 400"
            className="w-[70vmin] h-[70vmin] relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: phase >= 1 ? 1 : 0.5,
              opacity: phase >= 1 ? 1 : 0,
              rotate: phase >= 1 ? 180 : 0,
            }}
            transition={{
              scale: { duration: 0.55, ease: [0.22, 0.97, 0.32, 1.08] },
              opacity: { duration: 0.35 },
              rotate: { duration: 1.5, ease: "linear" },
            }}
          >
            <circle
              cx="200"
              cy="200"
              r="190"
              fill="none"
              stroke="#D4A84B"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <circle
              cx="200"
              cy="200"
              r="170"
              fill="none"
              stroke="#D4A84B"
              strokeWidth="0.8"
              strokeDasharray="10 6"
              opacity="0.6"
            />
            <polygon
              points="200,60 320,280 80,280"
              fill="none"
              stroke="#D4A84B"
              strokeWidth="1.2"
              opacity="0.7"
            />
            <polygon
              points="200,340 80,120 320,120"
              fill="none"
              stroke="#D4A84B"
              strokeWidth="1.2"
              opacity="0.7"
            />
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x = 200 + Math.cos(angle) * 140;
              const y = 200 + Math.sin(angle) * 140;
              return (
                <motion.circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#FFD29C"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: phase >= 2 ? 0.9 : 0,
                    scale: phase >= 2 ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: phase >= 2 ? (i * 0.025) : 0,
                    ease: "easeOut",
                  }}
                />
              );
            })}
            <g transform="translate(200, 200)">
              <circle r="40" fill="none" stroke="#D4A84B" strokeWidth="1" opacity="0.8" />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="#D4A84B"
                fontSize="36"
                fontWeight="700"
                style={{ fontFamily: "serif" }}
              >
                謊
              </text>
            </g>
          </motion.svg>

          {phase >= 3 && (
            <motion.div
              className="absolute w-full h-full"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1.8, 2.6] }}
              transition={{ duration: 0.7, ease: [0.22, 0.97, 0.32, 1.08] }}
            >
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmin] h-[60vmin] rounded-full blur-2xl"
                style={{ background: glow, opacity: 0.85 }}
              />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vmin] h-[90vmin] rounded-full blur-3xl"
                style={{ background: glow, opacity: 0.5 }}
              />
            </motion.div>
          )}

          {phase >= 2 && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                return (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-gold"
                    style={{ boxShadow: "0 0 10px #D4A84B" }}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                      x: Math.cos((angle * Math.PI) / 180) * 300,
                      y: Math.sin((angle * Math.PI) / 180) * 300,
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 0.8, ease: [0.22, 0.97, 0.32, 1] }}
                  />
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
