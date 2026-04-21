"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { Rarity } from "@prisma/client";

interface Props {
  active: boolean;
  highestRarity: Rarity;
  onComplete: () => void;
}

const PHASE_DURATION = 2400; // total ms before calling onComplete

/**
 * 7-phase summon animation per spec A25/A26/A28:
 *   1. Magic circle appears + rotates
 *   2. Runes ignite
 *   3. Light column bursts
 *   4. Rarity flash (gold for SSR, rainbow for UR, purple for SR, blue for R)
 *   5. onComplete → parent reveals cards
 */
export function SummonAnimation({ active, highestRarity, onComplete }: Props) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    setPhase(1);
    const t1 = setTimeout(() => setPhase(2), 800);
    const t2 = setTimeout(() => setPhase(3), 1400);
    const t3 = setTimeout(() => onComplete(), PHASE_DURATION);
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
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 bg-veil/85 backdrop-blur-md" />

          {/* Magic circle */}
          <motion.svg
            viewBox="0 0 400 400"
            className="w-[80vmin] h-[80vmin] relative"
            initial={{ scale: 0.4, opacity: 0, rotate: 0 }}
            animate={{
              scale: phase >= 1 ? 1 : 0.4,
              opacity: phase >= 1 ? 1 : 0,
              rotate: phase >= 1 ? 360 : 0,
            }}
            transition={{
              scale: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
              opacity: { duration: 0.3 },
              rotate: { duration: 10, ease: "linear", repeat: Infinity },
            }}
          >
            {/* Outer ring */}
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
            {/* Hexagram */}
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
            {/* Inner runes */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x = 200 + Math.cos(angle) * 140;
              const y = 200 + Math.sin(angle) * 140;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={phase >= 2 ? "#FFD29C" : "#4A3F2D"}
                  opacity={phase >= 2 ? 0.9 : 0.4}
                />
              );
            })}
            {/* Center sigil */}
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

          {/* Light column burst */}
          {phase >= 3 && (
            <motion.div
              className="absolute w-full h-full"
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{ opacity: [0, 1, 0], scale: [0.2, 2, 3] }}
              transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
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

          {/* Particle sparks */}
          {phase >= 2 && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 32 }).map((_, i) => {
                const angle = (i * 360) / 32;
                return (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-gold"
                    style={{
                      boxShadow: "0 0 10px #D4A84B",
                    }}
                    initial={{ x: 0, y: 0, opacity: 0 }}
                    animate={{
                      x: Math.cos((angle * Math.PI) / 180) * 320,
                      y: Math.sin((angle * Math.PI) / 180) * 320,
                      opacity: [0, 1, 0],
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
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
