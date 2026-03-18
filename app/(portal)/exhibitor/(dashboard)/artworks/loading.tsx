import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function ExhibitorArtworksLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" />
      </div>
      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-14 w-14 animate-pulse rounded bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-7 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
