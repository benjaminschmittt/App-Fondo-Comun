import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between bg-primary px-5 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full bg-white/10" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28 bg-white/10" />
            <Skeleton className="h-2.5 w-20 bg-white/10" />
          </div>
        </div>
        <Skeleton className="h-8 w-20 rounded-lg bg-white/10" />
      </div>

      <main className="mx-auto max-w-[1160px] px-5 py-6 md:px-8">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-2xl sm:col-span-2 lg:col-span-1" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="mb-5 h-24 rounded-2xl" />
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
