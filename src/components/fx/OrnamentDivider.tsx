/**
 * Ornamental horizontal divider — twin rules with a rhombus/sigil at the
 * centre. Takes an accent colour to tint. Use for visual rhythm between
 * sections where a plain border feels flat.
 */

interface Props {
  color?: string;
  glyph?: string;
  className?: string;
}

export function OrnamentDivider({
  color = "rgba(212, 168, 75, 0.55)",
  glyph = "◆",
  className = "",
}: Props) {
  return (
    <div
      className={`flex items-center gap-3 select-none ${className}`}
      aria-hidden
    >
      <span
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <span
        className="text-xs tracking-[0.3em]"
        style={{ color, textShadow: `0 0 8px ${color}` }}
      >
        {glyph}
      </span>
      <span
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
    </div>
  );
}

/**
 * Corner flourishes — four "L" brackets pinned to the corners of the parent.
 * Parent must be `position: relative`. Purely decorative.
 */
export function CornerFlourish({
  color = "rgba(212, 168, 75, 0.5)",
  size = 24,
}: {
  color?: string;
  size?: number;
}) {
  const common = "absolute border-current pointer-events-none";
  const s = `${size}px`;
  return (
    <div aria-hidden className="absolute inset-0" style={{ color }}>
      <span
        className={`${common} top-2 left-2 border-t-2 border-l-2`}
        style={{ width: s, height: s }}
      />
      <span
        className={`${common} top-2 right-2 border-t-2 border-r-2`}
        style={{ width: s, height: s }}
      />
      <span
        className={`${common} bottom-2 left-2 border-b-2 border-l-2`}
        style={{ width: s, height: s }}
      />
      <span
        className={`${common} bottom-2 right-2 border-b-2 border-r-2`}
        style={{ width: s, height: s }}
      />
    </div>
  );
}
