import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";

export default function ForgeLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </main>
  );
}
