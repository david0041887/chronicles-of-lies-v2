import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes } from "react";

// Equivalent to `interface InputProps extends InputHTMLAttributes<...> {}`
// but uses a type alias so ESLint's @typescript-eslint/no-empty-object-type
// rule doesn't flag the empty body. We may add Input-specific props later.
type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-2.5 rounded-lg",
          "bg-veil/60 border border-parchment/20 text-parchment",
          "placeholder:text-parchment/40",
          "focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/30",
          // aria-invalid="true" should also show a visual cue rather than
          // only relying on a separate hint line below — borderless red
          // input next to a "兩次輸入不一致" hint is more obvious to a
          // glancing user than just the hint text.
          "aria-[invalid=true]:border-blood/70 aria-[invalid=true]:focus:border-blood aria-[invalid=true]:focus:ring-blood/30",
          "transition-colors duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
