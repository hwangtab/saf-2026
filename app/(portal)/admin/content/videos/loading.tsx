import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminContentVideosLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" />
      </div>
      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-6 py-5">
              <div className="h-12 w-20 animate-pulse rounded bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
