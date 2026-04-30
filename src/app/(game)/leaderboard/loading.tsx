import { Skeleton } from "@/components/ui/Skeleton";

export default function LeaderboardLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Skeleton className="h-3 w-28 mb-2" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-8 flex-1 rounded-full" />
        <Skeleton className="h-8 flex-1 rounded-full" />
        <Skeleton className="h-8 flex-1 rounded-full" />
      </div>
      <div className="rounded-xl border border-parchment/10 bg-veil/30 divide-y divide-parchment/10">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </main>
  );
}
