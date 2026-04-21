import { cn } from "@/lib/utils";
import { forwardRef, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

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
