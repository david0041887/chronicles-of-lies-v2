"use client";

/**
 * Full-viewport SVG backdrop that encodes an era's visual identity behind the
 * battle arena. Low-opacity, animated, strictly decorative (pointer-events:none).
 *
 * Each era composes:
 *   - a sky/sun/moon layer
 *   - a silhouette scene (pyramid, cathedral, torii, mountains…)
 *   - a drift layer (petals, runes, glitch bars, embers…)
 *
 * The drift layer uses pure CSS animations (compositor-friendly transforms)
 * with staggered delays so dozens of elements can loop without framer-motion
 * per-frame overhead. Respects `prefers-reduced-motion`.
 */

interface Props {
  eraId: string;
  palette: { main: string; accent: string; dark: string };
}

export function EraArenaBackdrop({ eraId, palette }: Props) {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden
    >
      {/* Deep base gradient — anchors the scene beneath the SVG silhouettes
          so the whole era has a tinted "atmosphere" even before art loads. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 25%, ${palette.main}26, transparent 55%),
                       radial-gradient(ellipse at 50% 95%, ${palette.accent}14, transparent 50%),
                       linear-gradient(180deg, ${palette.dark}, #020106 85%)`,
        }}
      />

      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full era-scene-breathe"
      >
        <EraScene eraId={eraId} palette={palette} />
      </svg>

      {/* Atmosphere layer — large, slow, blurred particles for parallax
          depth (sand motes, embers, snow, petals, etc.). Runs behind the
          sharper DriftLayer so glyphs read against a soft backdrop. */}
      <AtmosphereLayer eraId={eraId} palette={palette} />

      {/* Foreground drift layer — sharp glyphs/runes/chars */}
      <DriftLayer eraId={eraId} palette={palette} />

      {/* Vignette to keep focus on center UI */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, ${palette.dark}cc 100%)`,
        }}
      />

      <style>{`
        @keyframes era-scene-breathe {
          0%, 100% { opacity: 0.92; }
          50%      { opacity: 1;    }
        }
        .era-scene-breathe {
          animation: era-scene-breathe 9s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .era-scene-breathe { animation: none !important; opacity: 0.95 !important; }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Static scene layer (SVG silhouettes)
// ────────────────────────────────────────────────────────────────────────────

function EraScene({
  eraId,
  palette,
}: {
  eraId: string;
  palette: { main: string; accent: string; dark: string };
}) {
  switch (eraId) {
    case "egypt":
      return (
        <g>
          {/* sun disc */}
          <circle cx="400" cy="160" r="70" fill={palette.main} opacity="0.25" />
          <circle cx="400" cy="160" r="44" fill={palette.accent} opacity="0.3" />
          {/* pyramid trio */}
          <polygon points="200,500 100,580 300,580" fill={palette.dark} opacity="0.6" />
          <polygon points="400,420 240,580 560,580" fill={palette.dark} opacity="0.7" stroke={palette.main} strokeWidth="0.8" strokeOpacity="0.35" />
          <polygon points="640,490 540,580 740,580" fill={palette.dark} opacity="0.55" />
          {/* distant horizon line */}
          <line x1="0" y1="580" x2="800" y2="580" stroke={palette.main} strokeWidth="1" opacity="0.3" />
          {/* Eye of Horus */}
          <g transform="translate(400, 160)" opacity="0.45">
            <path d="M -30 0 Q 0 -20 30 0 Q 0 20 -30 0" fill="none" stroke={palette.accent} strokeWidth="2" />
            <circle cx="0" cy="0" r="8" fill={palette.accent} opacity="0.6" />
          </g>
        </g>
      );

    case "mesopotamia":
      return (
        <g>
          {/* ziggurat */}
          <g opacity="0.7">
            <rect x="250" y="460" width="300" height="120" fill={palette.dark} />
            <rect x="300" y="380" width="200" height="80" fill={palette.dark} />
            <rect x="350" y="310" width="100" height="70" fill={palette.dark} />
            <rect x="380" y="260" width="40" height="50" fill={palette.accent} opacity="0.6" />
          </g>
          {/* winged star of Ishtar */}
          <g transform="translate(400, 140)" opacity="0.55">
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * 45 * Math.PI) / 180;
              return (
                <polygon
                  key={i}
                  points={`0,0 ${Math.cos(a) * 50},${Math.sin(a) * 50} ${Math.cos(a + 0.2) * 16},${Math.sin(a + 0.2) * 16}`}
                  fill={palette.accent}
                  stroke={palette.accent}
                  strokeWidth="0.5"
                />
              );
            })}
          </g>
        </g>
      );

    case "greek":
      return (
        <g>
          {/* colonnade */}
          {[80, 200, 320, 480, 600, 720].map((x, i) => (
            <g key={i} opacity="0.55">
              <rect x={x} y="220" width="30" height="320" fill={palette.dark} opacity="0.8" />
              <rect x={x - 6} y="210" width="42" height="14" fill={palette.main} />
              <rect x={x - 6} y="530" width="42" height="14" fill={palette.main} />
            </g>
          ))}
          {/* laurel wreath sun */}
          <g transform="translate(400, 140)" opacity="0.55">
            <circle r="60" fill="none" stroke={palette.accent} strokeWidth="1.5" />
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i * 22.5 * Math.PI) / 180;
              return (
                <ellipse
                  key={i}
                  cx={Math.cos(a) * 60}
                  cy={Math.sin(a) * 60}
                  rx="10"
                  ry="4"
                  fill={palette.accent}
                  opacity="0.55"
                  transform={`rotate(${i * 22.5 + 90}, ${Math.cos(a) * 60}, ${Math.sin(a) * 60})`}
                />
              );
            })}
          </g>
        </g>
      );

    case "han":
      return (
        <g>
          {/* red sun */}
          <circle cx="400" cy="150" r="90" fill={palette.main} opacity="0.45" />
          <circle cx="400" cy="150" r="60" fill={palette.main} opacity="0.75" />
          {/* dragon curve */}
          <path
            d="M 0 450 Q 140 380 280 450 T 560 450 Q 700 400 800 450"
            fill="none"
            stroke={palette.accent}
            strokeWidth="4"
            opacity="0.55"
          />
          {/* 漢 watermark */}
          <text
            x="400"
            y="360"
            textAnchor="middle"
            fill={palette.accent}
            opacity="0.1"
            fontSize="240"
            fontFamily="serif"
            fontWeight="700"
          >
            漢
          </text>
        </g>
      );

    case "norse":
      return (
        <g>
          {/* mountain range */}
          <path
            d="M 0 560 L 120 320 L 220 420 L 340 260 L 480 400 L 600 300 L 720 380 L 800 560 Z"
            fill={palette.dark}
            opacity="0.75"
          />
          {/* snow caps */}
          <path
            d="M 105 340 L 135 340 M 325 280 L 355 280 M 585 320 L 615 320"
            stroke={palette.accent}
            strokeWidth="3"
            opacity="0.75"
          />
          {/* aurora bands */}
          <path d="M 0 100 Q 400 60 800 120" stroke={palette.main} strokeWidth="30" opacity="0.12" fill="none" />
          <path d="M 0 160 Q 400 120 800 200" stroke={palette.accent} strokeWidth="18" opacity="0.1" fill="none" />
        </g>
      );

    case "medieval":
      return (
        <g>
          {/* gothic arch cathedral */}
          <path
            d="M 280 560 L 280 280 Q 280 180 400 180 Q 520 180 520 280 L 520 560 Z"
            fill={palette.dark}
            opacity="0.7"
            stroke={palette.main}
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
          {/* rose window */}
          <circle cx="400" cy="280" r="50" fill={palette.main} opacity="0.3" />
          <circle cx="400" cy="280" r="30" fill={palette.accent} opacity="0.4" />
          {/* cross */}
          <line x1="400" y1="200" x2="400" y2="340" stroke={palette.accent} strokeWidth="3" opacity="0.55" />
          <line x1="360" y1="260" x2="440" y2="260" stroke={palette.accent} strokeWidth="3" opacity="0.55" />
          {/* flanking spires */}
          <polygon points="200,560 180,380 220,380" fill={palette.dark} opacity="0.6" />
          <polygon points="600,560 580,380 620,380" fill={palette.dark} opacity="0.6" />
        </g>
      );

    case "sengoku":
      return (
        <g>
          {/* giant moon */}
          <circle cx="620" cy="140" r="70" fill={palette.accent} opacity="0.5" />
          <circle cx="605" cy="128" r="52" fill={palette.dark} opacity="0.6" />
          {/* torii gate */}
          <g opacity="0.7">
            <rect x="270" y="340" width="24" height="220" fill={palette.accent} />
            <rect x="506" y="340" width="24" height="220" fill={palette.accent} />
            <rect x="240" y="310" width="320" height="30" fill={palette.accent} />
            <rect x="270" y="350" width="260" height="12" fill={palette.accent} opacity="0.7" />
          </g>
          {/* distant hills */}
          <path d="M 0 560 Q 200 500 400 540 T 800 540 L 800 600 L 0 600 Z" fill={palette.dark} opacity="0.55" />
        </g>
      );

    case "ming":
      return (
        <g>
          {/* pagoda */}
          <g opacity="0.7">
            <path d="M 200 490 L 280 450 L 400 480 L 520 450 L 600 490 L 600 560 L 200 560 Z" fill={palette.dark} />
            <path d="M 260 450 L 260 380 L 540 380 L 540 450" fill={palette.dark} />
            <path d="M 280 380 L 280 320 L 520 320 L 520 380" fill={palette.dark} />
            <path d="M 400 320 L 360 280 L 440 280 Z" fill={palette.accent} opacity="0.6" />
          </g>
          {/* tai chi */}
          <g transform="translate(400, 150)" opacity="0.55">
            <circle r="55" fill="none" stroke={palette.accent} strokeWidth="2" />
            <path
              d="M 0 -55 A 55 55 0 0 1 0 55 A 27.5 27.5 0 0 1 0 0 A 27.5 27.5 0 0 0 0 -55"
              fill={palette.accent}
            />
            <circle cx="0" cy="27.5" r="7" fill={palette.accent} />
            <circle cx="0" cy="-27.5" r="7" fill={palette.dark} />
          </g>
          {/* red lanterns */}
          {[120, 680].map((x, i) => (
            <g key={i} transform={`translate(${x}, 260)`} opacity="0.7">
              <ellipse cx="0" cy="0" rx="18" ry="22" fill={palette.main} />
              <line x1="0" y1="-22" x2="0" y2="-40" stroke={palette.accent} strokeWidth="1" />
              <line x1="0" y1="22" x2="0" y2="30" stroke={palette.accent} strokeWidth="1" />
            </g>
          ))}
        </g>
      );

    case "primitive":
      return (
        <g>
          {/* cave silhouette */}
          <path
            d="M 0 560 Q 400 420 800 560 L 800 600 L 0 600 Z"
            fill={palette.dark}
            opacity="0.78"
          />
          {/* bonfire */}
          <g transform="translate(400, 440)" opacity="0.85">
            <ellipse cx="0" cy="50" rx="70" ry="14" fill={palette.dark} opacity="0.5" />
            <path d="M -30 50 L 0 -60 L 30 50 Z" fill={palette.accent} />
            <path d="M -18 50 L 0 -25 L 18 50 Z" fill="#FFD29C" />
          </g>
          {/* handprints */}
          {[120, 680].map((x, i) => (
            <g key={i} transform={`translate(${x}, 200)`} opacity="0.2">
              <circle r="28" fill={palette.main} />
            </g>
          ))}
        </g>
      );

    case "modern":
      return (
        <g>
          {/* city skyline */}
          <g opacity="0.65">
            {[
              [0, 460, 90, 100],
              [80, 420, 60, 140],
              [130, 440, 100, 120],
              [220, 380, 80, 180],
              [290, 400, 90, 160],
              [370, 360, 110, 200],
              [470, 420, 80, 140],
              [540, 390, 100, 170],
              [630, 440, 80, 120],
              [700, 410, 100, 150],
            ].map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} fill={palette.dark} />
            ))}
            {/* window lights */}
            {Array.from({ length: 40 }).map((_, i) => (
              <rect
                key={i}
                x={20 + i * 20}
                y={460 + (i * 13) % 120}
                width="2"
                height="3"
                fill={palette.accent}
                opacity="0.7"
              />
            ))}
          </g>
          {/* scanline bars */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x="0"
              y={80 + i * 50}
              width="800"
              height="1"
              fill={palette.accent}
              opacity="0.08"
            />
          ))}
        </g>
      );

    default:
      return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Animated drift layer (DOM particles per era)
// ────────────────────────────────────────────────────────────────────────────

function DriftLayer({
  eraId,
  palette,
}: {
  eraId: string;
  palette: { main: string; accent: string; dark: string };
}) {
  const config = DRIFT_CONFIG[eraId] ?? DRIFT_CONFIG.default;
  const animName = config.rotate ? "era-drift-spin" : "era-drift";

  return (
    <div className="absolute inset-0 overflow-hidden era-drift-layer">
      {Array.from({ length: config.count }).map((_, i) => {
        // Pseudo-random but stable per index so SSR/CSR agree.
        const left = (i * 97) % 100;
        const delay = -((i * 0.73) % config.duration);
        const duration = config.duration + ((i * 0.5) % 4);
        return (
          <span
            key={i}
            className="absolute will-change-transform"
            style={{
              left: `${left}%`,
              bottom: "-5%",
              fontSize: config.size,
              color: config.accent ? palette.accent : palette.main,
              textShadow: `0 0 6px ${palette.main}88`,
              opacity: 0,
              animation: `${animName} ${duration}s linear ${delay}s infinite`,
            }}
          >
            {config.glyphs[i % config.glyphs.length]}
          </span>
        );
      })}

      <style>{`
        @keyframes era-drift {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          8%   { opacity: 0.55; }
          92%  { opacity: 0.55; }
          100% { transform: translate3d(0, -110vh, 0); opacity: 0; }
        }
        @keyframes era-drift-spin {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
          8%   { opacity: 0.55; }
          92%  { opacity: 0.55; }
          100% { transform: translate3d(0, -110vh, 0) rotate(360deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .era-drift-layer > span {
            animation: none !important;
            opacity: 0.25 !important;
            transform: translate3d(0, -55vh, 0);
          }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Atmosphere layer — large soft-blurred particles behind the sharp drift
// layer, giving each era a recognisable climate (embers / sand / snow /
// petals / ink / neon) without needing actual image assets. One CSS
// animation per particle; transforms only, so it stays compositor-safe
// even at 30+ concurrent motes.
// ────────────────────────────────────────────────────────────────────────────

function AtmosphereLayer({
  eraId,
  palette,
}: {
  eraId: string;
  palette: { main: string; accent: string; dark: string };
}) {
  const cfg = ATMOSPHERE_CONFIG[eraId] ?? ATMOSPHERE_CONFIG.default;
  return (
    <div className="absolute inset-0 overflow-hidden era-atmosphere-layer">
      {Array.from({ length: cfg.count }).map((_, i) => {
        const left = (i * 113) % 100;
        const delay = -((i * 1.31) % cfg.duration);
        const duration = cfg.duration + ((i * 0.83) % 8);
        const sizePx = cfg.sizeMin + ((i * 7) % Math.max(1, cfg.sizeMax - cfg.sizeMin));
        const color = cfg.accent ? palette.accent : palette.main;
        const driftX = (((i * 37) % 30) - 15) + "vw";
        return (
          <span
            key={i}
            className="absolute rounded-full will-change-transform"
            style={{
              left: `${left}%`,
              bottom: "-6%",
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              background: `radial-gradient(circle, ${color}${cfg.centerAlpha}, transparent 70%)`,
              filter: `blur(${cfg.blur}px)`,
              opacity: 0,
              ["--atmos-drift-x" as string]: driftX,
              animation: `era-atmos-rise ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}

      <style>{`
        @keyframes era-atmos-rise {
          0%   { transform: translate3d(0, 0, 0) scale(0.6); opacity: 0; }
          12%  { opacity: 0.55; }
          80%  { opacity: 0.45; }
          100% { transform: translate3d(var(--atmos-drift-x), -115vh, 0) scale(1.15); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .era-atmosphere-layer > span {
            animation: none !important;
            opacity: 0.18 !important;
            transform: translate3d(0, -60vh, 0);
          }
        }
      `}</style>
    </div>
  );
}

const ATMOSPHERE_CONFIG: Record<
  string,
  {
    count: number;
    sizeMin: number;
    sizeMax: number;
    duration: number;
    blur: number;
    accent?: boolean;
    /** Appended to the CSS color for the centre stop alpha, e.g. "aa" */
    centerAlpha: string;
  }
> = {
  primitive: { count: 28, sizeMin: 4, sizeMax: 14, duration: 9,  blur: 2, accent: true,  centerAlpha: "cc" },  // embers
  mesopotamia:{ count: 22, sizeMin: 12, sizeMax: 32, duration: 22, blur: 10, accent: true, centerAlpha: "55" },  // sand motes
  egypt:    { count: 20, sizeMin: 8, sizeMax: 22, duration: 20, blur: 6, accent: true, centerAlpha: "66" },    // sand motes
  greek:    { count: 18, sizeMin: 10, sizeMax: 26, duration: 26, blur: 8, accent: false, centerAlpha: "44" },  // marble dust
  han:      { count: 20, sizeMin: 10, sizeMax: 24, duration: 24, blur: 8, accent: false, centerAlpha: "55" },  // ink mist
  norse:    { count: 34, sizeMin: 3, sizeMax: 9,  duration: 14, blur: 2, accent: false, centerAlpha: "dd" },   // snowflakes (cool blue)
  medieval: { count: 18, sizeMin: 6, sizeMax: 16, duration: 20, blur: 5, accent: true, centerAlpha: "77" },    // candle embers
  sengoku:  { count: 26, sizeMin: 6, sizeMax: 14, duration: 16, blur: 3, accent: true, centerAlpha: "aa" },    // petals (tinted)
  ming:     { count: 22, sizeMin: 10, sizeMax: 24, duration: 22, blur: 7, accent: true, centerAlpha: "66" },   // lantern glow
  modern:   { count: 30, sizeMin: 3, sizeMax: 8,  duration: 7,  blur: 1, accent: true, centerAlpha: "cc" },    // neon dots
  default:  { count: 16, sizeMin: 6, sizeMax: 16, duration: 22, blur: 6, accent: true, centerAlpha: "55" },
};

const DRIFT_CONFIG: Record<
  string,
  {
    glyphs: string[];
    count: number;
    size: string;
    duration: number;
    accent?: boolean;
    rotate?: boolean;
  }
> = {
  egypt: { glyphs: ["𓂀", "𓃭", "𓊖", "𓏏", "𓎟"], count: 14, size: "1.4rem", duration: 18, accent: true },
  mesopotamia: { glyphs: ["𒀭", "𒂗", "𒆠", "𒌋"], count: 14, size: "1.2rem", duration: 20, accent: true },
  greek: { glyphs: ["Α", "Ω", "Ψ", "Φ", "Δ"], count: 14, size: "1.1rem", duration: 22, accent: true },
  han: { glyphs: ["道", "天", "漢", "神", "龍"], count: 14, size: "1.3rem", duration: 20, accent: true },
  norse: { glyphs: ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ"], count: 18, size: "1.2rem", duration: 16, accent: true, rotate: true },
  medieval: { glyphs: ["✚", "☩", "✟", "✦"], count: 14, size: "1rem", duration: 24, accent: true },
  sengoku: { glyphs: ["❀", "✿", "❁", "🌸"], count: 22, size: "1rem", duration: 14, rotate: true },
  ming: { glyphs: ["福", "壽", "龍", "鳳", "仙"], count: 14, size: "1.3rem", duration: 22, accent: true },
  primitive: { glyphs: ["•", "·", "∘", "◦"], count: 24, size: "0.8rem", duration: 12, accent: true },
  modern: { glyphs: ["0", "1", "0", "1", "¤"], count: 20, size: "0.75rem", duration: 10, accent: true },
  default: { glyphs: ["·"], count: 10, size: "0.6rem", duration: 20 },
};
