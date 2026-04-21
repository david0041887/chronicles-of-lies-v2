import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger" | "sacred";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-veil hover:brightness-110 shadow-[var(--shadow-glow-gold)]",
  ghost:
    "bg-transparent border border-parchment/30 text-parchment hover:bg-parchment/10",
  danger:
    "bg-blood text-parchment hover:brightness-110 shadow-[var(--shadow-glow-red)]",
  sacred:
    "bg-ichor text-parchment hover:brightness-110 shadow-[var(--shadow-glow-purple)]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-5 py-2.5 text-base rounded-lg",
  lg: "px-7 py-3.5 text-lg rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold tracking-wide",
          "transition-all duration-200 ease-[var(--ease-fluid)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.97]",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
