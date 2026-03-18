import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminRevenueLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-52 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <AdminCardSkeleton key={i}>
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100 mb-3" />
            <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
          </AdminCardSkeleton>
        ))}
      </div>

      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="p-6">
          <div className="h-64 animate-pulse rounded bg-slate-100" />
        </div>
      </AdminCardSkeleton>

      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="space-y-px">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
