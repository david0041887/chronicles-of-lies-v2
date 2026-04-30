import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* HUD strip */}
      <div className="mb-6 rounded-2xl border border-parchment/10 bg-veil/40 p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
        ))}
      </div>

      {/* Daily missions / milestones */}
      <div className="rounded-2xl border border-parchment/10 bg-veil/40 p-5 mb-4">
        <Skeleton className="h-4 w-28 mb-3" />
        <SkeletonRow />
      </div>
      <div className="rounded-2xl border border-parchment/10 bg-veil/40 p-5">
        <Skeleton className="h-4 w-28 mb-3" />
        <SkeletonRow />
      </div>
    </main>
  );
}
