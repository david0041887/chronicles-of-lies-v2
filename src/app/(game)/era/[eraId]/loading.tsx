import { Skeleton } from "@/components/ui/Skeleton";

export default function EraLoading() {
  return (
    <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Hero band */}
      <div className="mb-8 text-center">
        <Skeleton className="h-3 w-24 mx-auto mb-3" />
        <Skeleton className="h-9 w-64 mx-auto mb-4" />
        <Skeleton className="h-3 w-80 mx-auto" />
      </div>

      {/* Stage timeline strip */}
      <div className="rounded-2xl border border-parchment/10 bg-veil/40 p-4 mb-6">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-24 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Story chapters */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-parchment/10 bg-veil/30 p-4"
          >
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    </main>
  );
}
