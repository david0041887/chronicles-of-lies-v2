import { Particles } from "./Particles";

interface Props {
  main?: string;
  accent?: string;
  dark?: string;
  intensity?: "low" | "medium" | "high";
  className?: string;
}

/**
 * Full-viewport animated veil backdrop. Stack of parallax layers:
 *
 *   1. Gradient base                    — calm color wash
 *   2. Drifting twin blobs              — slow 30–40s parallax
 *   3. Slanted veil threads             — subtle diagonal lines that scan
 *   4. Golden particle motes            — rising flecks
 *   5. Corner vignette ring             — frames the content area
 *   6. Film grain                       — tiny noise texture
 *
 * Each layer is composited for free — no per-frame JS, `prefers-reduced-
 * motion` is honoured, all transforms are GPU-friendly. Used as the
 * default backdrop for most non-battle pages.
 */
export function VeilBackdrop({
  main = "#6B2E8A",
  accent = "#D4A84B",
  dark = "#0A0612",
  intensity = "medium",
  className,
}: Props) {
  const particleCount = intensity === "high" ? 56 : intensity === "medium" ? 32 : 16;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className ?? ""}`}
      aria-hidden
    >
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${main}22, transparent 55%),
                       radial-gradient(ellipse at 70% 80%, ${accent}15, transparent 55%),
                       linear-gradient(180deg, ${dark}, #030107)`,
        }}
      />

      {/* Drifting blobs */}
      <div
        className="absolute w-[40rem] h-[40rem] rounded-full blur-3xl opacity-30 veil-blob-a"
        style={{
          background: `radial-gradient(circle, ${main}, transparent 60%)`,
          top: "-10rem",
          left: "-10rem",
        }}
      />
      <div
        className="absolute w-[36rem] h-[36rem] rounded-full blur-3xl opacity-25 veil-blob-b"
        style={{
          background: `radial-gradient(circle, ${accent}, transparent 60%)`,
          bottom: "-8rem",
          right: "-8rem",
        }}
      />

      {/* Slanted veil threads — diagonal scan lines that slowly drift */}
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-screen veil-threads"
        style={{
          background: `repeating-linear-gradient(115deg, transparent 0 38px, ${accent}33 38px 39px, transparent 39px 78px)`,
        }}
      />

      {/* Particles */}
      <Particles count={particleCount} color={accent} />

      {/* Corner rings — cathedral vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 55%, transparent 48%, ${dark}99 95%)`,
        }}
      />
      <div
        className="absolute inset-0 veil-breathe"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${main}18, transparent 60%)`,
        }}
      />

      {/* Grain (subtle film noise) */}
      <div className="absolute inset-0 grain" />

      <style>{`
        @keyframes veil-blob-drift-a {
          0%,100% { transform: translate(0, 0) scale(1); }
          33%     { transform: translate(5%, 4%) scale(1.08); }
          66%     { transform: translate(-3%, 6%) scale(0.95); }
        }
        @keyframes veil-blob-drift-b {
          0%,100% { transform: translate(0, 0) scale(1); }
          50%     { transform: translate(-6%, -4%) scale(1.1); }
        }
        @keyframes veil-thread-scan {
          0%   { background-position: 0 0; }
          100% { background-position: 240px -120px; }
        }
        @keyframes veil-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 0.9;  transform: scale(1.05); }
        }
        .veil-blob-a { animation: veil-blob-drift-a 30s ease-in-out infinite; }
        .veil-blob-b { animation: veil-blob-drift-b 38s ease-in-out infinite; }
        .veil-threads { animation: veil-thread-scan 28s linear infinite; }
        .veil-breathe { animation: veil-breathe 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .veil-blob-a, .veil-blob-b, .veil-threads, .veil-breathe {
            animation: none !important;
          }
        }
        .grain {
          background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 3px 3px;
          mix-blend-mode: overlay;
          opacity: 0.25;
        }
      `}</style>
    </div>
  );
}
