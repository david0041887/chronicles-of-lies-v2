import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";

export default function DeckLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-20" />
      </div>
      <Skeleton className="h-1 w-full mb-4" rounded="full" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </main>
  );
}
