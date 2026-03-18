import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function ExhibitorArtworkNewLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
      </div>
      <AdminCardSkeleton className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 w-20 flex-shrink-0 animate-pulse rounded-lg bg-slate-200"
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
