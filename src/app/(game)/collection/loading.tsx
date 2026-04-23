import { SkeletonCard } from "@/components/ui/Skeleton";

export default function CollectionLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="h-4 w-24 bg-parchment/10 rounded skeleton-shimmer mb-2" />
        <div className="h-8 w-40 bg-parchment/10 rounded skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </main>
  );
}
