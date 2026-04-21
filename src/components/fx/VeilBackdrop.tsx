import { Particles } from "./Particles";

interface Props {
  main?: string;
  accent?: string;
  dark?: string;
  intensity?: "low" | "medium" | "high";
  className?: string;
}

/**
 * Full-viewport animated veil backdrop. Parallax blobs + golden particles.
 * Used behind era pages and battle scenes.
 */
export function VeilBackdrop({
  main = "#6B2E8A",
  accent = "#D4A84B",
  dark = "#0A0612",
  intensity = "medium",
  className,
}: Props) {
  const particleCount = intensity === "high" ? 48 : intensity === "medium" ? 28 : 14;

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

      {/* Particles */}
      <Particles count={particleCount} color={accent} />

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
        .veil-blob-a { animation: veil-blob-drift-a 30s ease-in-out infinite; }
        .veil-blob-b { animation: veil-blob-drift-b 38s ease-in-out infinite; }
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
