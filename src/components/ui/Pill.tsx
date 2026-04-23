import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

type Tone = "neutral" | "gold" | "info" | "success" | "danger" | "rarity-super";

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: Tone;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const INACTIVE: Record<Tone, string> = {
  neutral: "border-parchment/20 text-parchment/60 hover:border-gold/40 hover:text-gold",
  gold: "border-gold/40 text-gold/80 hover:bg-gold/10",
  info: "border-info/40 text-info/80 hover:bg-info/10",
  success: "border-success/40 text-success hover:bg-success/10",
  danger: "border-blood/40 text-blood/80 hover:bg-blood/10",
  "rarity-super": "border-rarity-super/40 text-rarity-super/90 hover:bg-rarity-super/10",
};

const ACTIVE: Record<Tone, string> = {
  neutral: "bg-gold/20 border-gold text-gold",
  gold: "bg-gold/20 border-gold text-gold",
  info: "bg-info/15 border-info text-info",
  success: "bg-success/15 border-success text-success",
  danger: "bg-blood/15 border-blood text-blood",
  "rarity-super": "bg-rarity-super/15 border-rarity-super text-rarity-super",
};

/**
 * Filter chip / selectable pill. Use `active` for currently-selected state.
 * Renders as a button — pair with `onClick` or use as a <span> by passing
 * tabIndex={-1} and styling manually if needed.
 */
export const Pill = forwardRef<HTMLButtonElement, PillProps>(function Pill(
  { active = false, tone = "neutral", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(BASE, active ? ACTIVE[tone] : INACTIVE[tone], className)}
      {...rest}
    >
      {children}
    </button>
  );
});
