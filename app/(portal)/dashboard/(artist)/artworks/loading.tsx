import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function DashboardArtworksLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-52 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <AdminCardSkeleton key={i} padded={false} className="overflow-hidden">
            <div className="aspect-[4/3] animate-pulse bg-slate-100" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </AdminCardSkeleton>
        ))}
      </div>
    </div>
  );
}
