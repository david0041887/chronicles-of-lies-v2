import { ERAS, type EraId } from "@/lib/constants/eras";
import type { Rarity } from "@prisma/client";

interface Props {
  cardId: string;
  eraId: EraId | string;
  type: string;
  rarity: Rarity;
  name: string;
  className?: string;
}

// Deterministic hash from card id → number 0..N
function seed(id: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

const RARITY_FRAME: Record<Rarity, { stroke: string; accent: string }> = {
  R: { stroke: "#4A90E2", accent: "#93C2F1" },
  SR: { stroke: "#B87FEB", accent: "#E0C4FF" },
  SSR: { stroke: "#F5C242", accent: "#FFEBA3" },
  UR: { stroke: "#FFD700", accent: "#FFFFFF" },
};

// =====================================================
// Era-specific background patterns
// =====================================================
function EraBackdrop({ era, seedN }: { era: EraId | string; seedN: number }) {
  const palette = ERAS.find((e) => e.id === era)?.palette ?? {
    main: "#444",
    accent: "#888",
    dark: "#111",
  };

  switch (era) {
    case "egypt":
      return (
        <>
          {/* sun disc */}
          <circle cx="90" cy="70" r="22" fill={palette.main} opacity="0.25" />
          <circle cx="90" cy="70" r="14" fill={palette.main} opacity="0.35" />
          {/* pyramid */}
          <polygon
            points="90,90 40,180 140,180"
            fill={palette.dark}
            opacity="0.7"
            stroke={palette.main}
            strokeWidth="0.5"
            opacity-stroke="0.3"
          />
          {/* hieroglyph marks */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x={20 + ((seedN + i * 23) % 140)}
              y={200 - ((seedN + i * 17) % 25)}
              width="3"
              height="7"
              fill={palette.accent}
              opacity="0.4"
            />
          ))}
          {/* Eye of Horus (simplified) */}
          <g transform="translate(90, 70)" opacity="0.7">
            <path
              d="M -12 0 Q 0 -8 12 0 Q 0 8 -12 0"
              fill="none"
              stroke={palette.main}
              strokeWidth="1.5"
            />
            <circle cx="0" cy="0" r="3" fill={palette.main} />
          </g>
        </>
      );

    case "medieval":
      return (
        <>
          {/* gothic arch */}
          <path
            d="M 50 200 L 50 110 Q 50 70 90 70 Q 130 70 130 110 L 130 200 Z"
            fill={palette.dark}
            opacity="0.55"
            stroke={palette.main}
            strokeWidth="0.8"
            opacity-stroke="0.4"
          />
          {/* stained glass inner */}
          <circle cx="90" cy="110" r="18" fill={palette.main} opacity="0.25" />
          <circle cx="90" cy="110" r="10" fill={palette.accent} opacity="0.25" />
          {/* cross */}
          <line x1="90" y1="85" x2="90" y2="135" stroke={palette.accent} strokeWidth="2" opacity="0.55" />
          <line x1="75" y1="105" x2="105" y2="105" stroke={palette.accent} strokeWidth="2" opacity="0.55" />
          {/* candle flames */}
          {[30, 60, 120, 150].map((x, i) => (
            <ellipse
              key={i}
              cx={x}
              cy={200 - ((seedN + i * 13) % 10)}
              rx="2.5"
              ry="5"
              fill="#FFD29C"
              opacity="0.6"
            />
          ))}
        </>
      );

    case "ming":
      return (
        <>
          {/* pagoda roof silhouettes */}
          <path
            d="M 30 160 L 60 140 L 90 155 L 120 140 L 150 160 L 150 210 L 30 210 Z"
            fill={palette.dark}
            opacity="0.6"
          />
          <path
            d="M 60 140 L 60 110 L 120 110 L 120 140"
            fill={palette.dark}
            opacity="0.6"
          />
          <path
            d="M 90 110 L 75 95 L 105 95 Z"
            fill={palette.accent}
            opacity="0.5"
          />
          {/* Tai Chi */}
          <g transform="translate(90, 75)" opacity="0.7">
            <circle cx="0" cy="0" r="18" fill="none" stroke={palette.accent} strokeWidth="1.5" />
            <path d="M 0 -18 A 18 18 0 0 1 0 18 A 9 9 0 0 1 0 0 A 9 9 0 0 0 0 -18" fill={palette.accent} />
            <circle cx="0" cy="9" r="2.5" fill={palette.accent} />
            <circle cx="0" cy="-9" r="2.5" fill={palette.dark} />
          </g>
          {/* falling petals */}
          {Array.from({ length: 5 }).map((_, i) => (
            <ellipse
              key={i}
              cx={20 + ((seedN + i * 31) % 140)}
              cy={180 - ((seedN + i * 19) % 50)}
              rx="3"
              ry="1.5"
              fill={palette.main}
              opacity="0.4"
              transform={`rotate(${(seedN + i * 47) % 180}, ${20 + ((seedN + i * 31) % 140)}, ${
                180 - ((seedN + i * 19) % 50)
              })`}
            />
          ))}
        </>
      );

    case "modern":
      return (
        <>
          {/* circuit board lines */}
          {Array.from({ length: 8 }).map((_, i) => {
            const x = ((seedN + i * 37) % 160) + 10;
            const y = ((seedN + i * 59) % 120) + 40;
            return (
              <g key={i} opacity="0.4">
                <line x1={x} y1={y} x2={x + 25} y2={y} stroke={palette.main} strokeWidth="0.8" />
                <line x1={x + 25} y1={y} x2={x + 25} y2={y + 15} stroke={palette.main} strokeWidth="0.8" />
                <circle cx={x} cy={y} r="1.5" fill={palette.accent} />
              </g>
            );
          })}
          {/* glitch bars */}
          {Array.from({ length: 3 }).map((_, i) => (
            <rect
              key={i}
              x="10"
              y={80 + ((seedN + i * 33) % 70)}
              width="160"
              height="1.5"
              fill={palette.accent}
              opacity={0.25 + (i % 3) * 0.1}
            />
          ))}
          {/* binary 666 easter egg */}
          <text
            x="90"
            y="100"
            textAnchor="middle"
            fill={palette.accent}
            opacity="0.35"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="1"
          >
            10 10 10
          </text>
          <text
            x="90"
            y="115"
            textAnchor="middle"
            fill={palette.accent}
            opacity="0.2"
            fontSize="7"
            fontFamily="monospace"
          >
            MMX
          </text>
        </>
      );

    default:
      return null;
  }
}

// =====================================================
// Type-specific central glyph (overlaid on era backdrop)
// =====================================================
function TypeGlyph({ type, color }: { type: string; color: string }) {
  const base = "translate(90, 140)";
  switch (type) {
    case "attack":
      // Sword
      return (
        <g transform={base} opacity="0.85">
          <path
            d="M 0 -35 L -6 -30 L -3 15 L 0 20 L 3 15 L 6 -30 Z"
            fill={color}
            stroke="#000"
            strokeWidth="0.5"
          />
          <rect x="-10" y="15" width="20" height="4" fill={color} />
          <rect x="-2" y="19" width="4" height="14" fill={color} />
          <circle cx="0" cy="35" r="3" fill={color} />
        </g>
      );
    case "heal":
      // Chalice
      return (
        <g transform={base} opacity="0.85">
          <path d="M -18 -25 Q -18 5 0 10 Q 18 5 18 -25 Z" fill={color} opacity="0.6" />
          <path d="M -15 -22 Q -15 2 0 6 Q 15 2 15 -22 Z" fill="none" stroke={color} strokeWidth="1" />
          <rect x="-3" y="10" width="6" height="12" fill={color} />
          <rect x="-12" y="22" width="24" height="5" fill={color} />
          <circle cx="0" cy="-20" r="4" fill="#FFD29C" opacity="0.9" />
        </g>
      );
    case "spread":
      // Whisper waves
      return (
        <g transform={base} opacity="0.8">
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M -25 ${-15 + i * 15} Q 0 ${-30 + i * 15} 25 ${-15 + i * 15}`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity={0.9 - i * 0.25}
            />
          ))}
          <circle cx="0" cy="0" r="5" fill={color} />
        </g>
      );
    case "confuse":
      // Spiral
      return (
        <g transform={base} opacity="0.85">
          <path
            d="M 0 0 m -3 0 a 3 3 0 1 1 6 0 a 6 6 0 1 1 -12 0 a 12 12 0 1 1 24 0 a 18 18 0 1 1 -36 0"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
        </g>
      );
    case "buff":
      // Up crown
      return (
        <g transform={base} opacity="0.85">
          <path
            d="M -20 10 L -20 -15 L -10 0 L 0 -22 L 10 0 L 20 -15 L 20 10 Z"
            fill={color}
            stroke="#000"
            strokeWidth="0.5"
          />
          <circle cx="-15" cy="-10" r="2.5" fill="#FFD29C" />
          <circle cx="0" cy="-15" r="3" fill="#FFD29C" />
          <circle cx="15" cy="-10" r="2.5" fill="#FFD29C" />
        </g>
      );
    case "debuff":
      // Chains
      return (
        <g transform={base} opacity="0.8">
          {[0, 1, 2, 3].map((i) => (
            <ellipse
              key={i}
              cx={0}
              cy={-20 + i * 13}
              rx="6"
              ry="3"
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              transform={`rotate(${i % 2 === 0 ? 0 : 90}, 0, ${-20 + i * 13})`}
            />
          ))}
        </g>
      );
    case "ritual":
      // Pentagram + eye
      return (
        <g transform={base} opacity="0.85">
          <polygon
            points="0,-22 6.5,-7 22,-7 9.5,3 15,18 0,9 -15,18 -9.5,3 -22,-7 -6.5,-7"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
          />
          <circle cx="0" cy="0" r="5" fill={color} opacity="0.85" />
          <circle cx="0" cy="0" r="2" fill="#000" />
        </g>
      );
    default:
      return null;
  }
}

// =====================================================
// Rarity ornate corner flourishes
// =====================================================
function RarityFrame({ rarity }: { rarity: Rarity }) {
  const { stroke, accent } = RARITY_FRAME[rarity];

  const corner = (x: number, y: number, flipX: boolean, flipY: boolean) => {
    const sx = flipX ? -1 : 1;
    const sy = flipY ? -1 : 1;
    return (
      <g transform={`translate(${x}, ${y}) scale(${sx}, ${sy})`}>
        <path
          d="M 0 0 L 16 0 L 18 2 L 18 4 L 4 4 L 4 18 L 2 18 L 0 16 Z"
          fill={stroke}
        />
        {rarity === "SSR" || rarity === "UR" ? (
          <>
            <circle cx="10" cy="10" r="2.5" fill={accent} opacity="0.85" />
            <path
              d="M 6 6 L 14 14 M 14 6 L 6 14"
              stroke={accent}
              strokeWidth="0.6"
              opacity="0.6"
            />
          </>
        ) : null}
      </g>
    );
  };

  return (
    <g>
      {corner(3, 3, false, false)}
      {corner(177, 3, true, false)}
      {corner(3, 237, false, true)}
      {corner(177, 237, true, true)}
      <rect
        x="2.5"
        y="2.5"
        width="175"
        height="235"
        fill="none"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.4"
      />
      {(rarity === "SSR" || rarity === "UR") && (
        <rect
          x="5.5"
          y="5.5"
          width="169"
          height="229"
          fill="none"
          stroke={accent}
          strokeWidth="0.3"
          opacity="0.45"
          strokeDasharray="4 2"
        />
      )}
    </g>
  );
}

export function CardArt({ cardId, eraId, type, rarity, name, className }: Props) {
  const palette = ERAS.find((e) => e.id === eraId)?.palette ?? {
    main: "#444",
    accent: "#888",
    dark: "#111",
  };
  const seedN = seed(cardId, 100);
  const uid = cardId.replace(/[^a-z0-9]/gi, "");
  const { stroke: rarityColor } = RARITY_FRAME[rarity];

  return (
    <svg
      viewBox="0 0 180 240"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-label={name}
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.dark} />
          <stop offset="60%" stopColor={palette.dark} />
          <stop offset="100%" stopColor={palette.main} stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={palette.dark} stopOpacity="0" />
        </radialGradient>
        <filter id={`noise-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seedN} />
          <feColorMatrix values="0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 0 0.08  0 0 0 0.15 0" />
        </filter>
      </defs>

      <rect width="180" height="240" fill={`url(#bg-${uid})`} />
      <rect width="180" height="240" fill={`url(#glow-${uid})`} />
      <rect width="180" height="240" filter={`url(#noise-${uid})`} opacity="0.6" />

      <EraBackdrop era={eraId} seedN={seedN} />
      <TypeGlyph type={type} color={rarityColor} />
      <RarityFrame rarity={rarity} />

      {/* Subtle vignette */}
      <rect
        x="0"
        y="0"
        width="180"
        height="240"
        fill="url(#vignette)"
        pointerEvents="none"
      />
      <defs>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
    </svg>
  );
}
