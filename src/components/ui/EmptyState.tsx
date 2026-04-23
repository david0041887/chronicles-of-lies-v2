import { ReactNode } from "react";

interface Props {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Empty-state illustration for grids with no results, or tabs without content.
 */
export function EmptyState({
  icon = "✧",
  title,
  hint,
  action,
  className = "",
}: Props) {
  return (
    <div
      className={`py-14 sm:py-20 px-6 text-center flex flex-col items-center gap-3 ${className}`}
    >
      <div
        className="text-4xl sm:text-5xl opacity-50"
        style={{ filter: "drop-shadow(0 0 10px rgba(212,168,75,0.3))" }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="display-serif text-base sm:text-lg text-parchment/80">
        {title}
      </div>
      {hint && (
        <div className="text-xs text-parchment/50 max-w-sm">{hint}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
