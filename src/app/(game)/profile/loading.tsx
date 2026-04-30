import { Skeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-8 w-40" />
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-parchment/10 bg-veil/40 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-2 w-full mb-2" />
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Stats grids */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mb-6">
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      ))}

      {/* Era list */}
      <div className="rounded-xl border border-parchment/10 bg-veil/40 p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </main>
  );
}
