import { Skeleton } from "@/components/ui/Skeleton";

export default function GachaLoading() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-8">
        <Skeleton className="h-3 w-52 mx-auto mb-3" />
        <Skeleton className="h-10 w-28 mx-auto mb-2" />
        <Skeleton className="h-4 w-80 mx-auto" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14" rounded="lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" rounded="xl" />
        ))}
      </div>
      <Skeleton className="h-28 mb-5" rounded="xl" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Skeleton className="h-36" rounded="xl" />
        <Skeleton className="h-36" rounded="xl" />
      </div>
    </main>
  );
}
