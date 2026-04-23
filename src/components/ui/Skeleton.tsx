import { cn } from "@/lib/utils";

/**
 * Shimmering placeholder block — used in loading.tsx route fallbacks.
 * Animation is CSS-driven and respects prefers-reduced-motion.
 */
export function Skeleton({
  className,
  rounded = "md",
}: {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  const roundClass = {
    sm: "rounded",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  }[rounded];
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden bg-parchment/5 skeleton-shimmer",
        roundClass,
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Skeleton className="w-32 aspect-[3/4]" rounded="xl" />
      <Skeleton className="w-20 h-3" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border border-parchment/10 bg-veil/30 space-y-3",
        className,
      )}
    >
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
