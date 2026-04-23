import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

export default function WorldLoading() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-10">
        <Skeleton className="h-3 w-40 mx-auto mb-3" />
        <Skeleton className="h-10 w-32 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </main>
  );
}
