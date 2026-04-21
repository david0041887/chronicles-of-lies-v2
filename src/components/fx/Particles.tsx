"use client";

import { useMemo } from "react";

interface Props {
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  className?: string;
}

/**
 * Floating particle backdrop. Pure CSS keyframe animations — no JS per frame.
 * Seed-stable per mount so it doesn't re-randomize on re-render.
 */
export function Particles({
  count = 28,
  color = "#D4A84B",
  minSize = 1,
  maxSize = 3,
  className,
}: Props) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const size = minSize + Math.random() * (maxSize - minSize);
        return {
          id: i,
          size,
          left: Math.random() * 100,
          top: Math.random() * 100,
          delay: Math.random() * -20,
          duration: 14 + Math.random() * 18,
          opacity: 0.25 + Math.random() * 0.5,
        };
      }),
    [count, minSize, maxSize],
  );

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`}
    >
      {dots.map((d) => (
        <span
          key={d.id}
          className="particle-dot absolute rounded-full"
          style={{
            width: d.size,
            height: d.size,
            left: `${d.left}%`,
            top: `${d.top}%`,
            backgroundColor: color,
            opacity: d.opacity,
            boxShadow: `0 0 ${d.size * 3}px ${color}`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes particle-drift {
          0%   { transform: translate3d(0, 0, 0) scale(1); opacity: 0; }
          10%  { opacity: var(--peak, 0.6); }
          50%  { transform: translate3d(24px, -60px, 0) scale(1.2); }
          90%  { opacity: var(--peak, 0.6); }
          100% { transform: translate3d(0, -120px, 0) scale(0.8); opacity: 0; }
        }
        .particle-dot {
          animation-name: particle-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}
