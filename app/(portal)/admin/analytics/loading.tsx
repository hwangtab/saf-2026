import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminAnalyticsLoading() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-20 animate-pulse rounded bg-slate-200" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 w-16 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <AdminCardSkeleton key={i} className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          </AdminCardSkeleton>
        ))}
      </div>

      {/* Daily views — full width */}
      <AdminCardSkeleton>
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200 mb-4" />
        <div className="h-64 animate-pulse rounded bg-slate-100" />
      </AdminCardSkeleton>

      {/* Hourly heatmap — full width */}
      <AdminCardSkeleton>
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 mb-4" />
        <div className="h-40 animate-pulse rounded bg-slate-100" />
      </AdminCardSkeleton>

      {/* Top pages + device pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <AdminCardSkeleton key={i}>
            <div className="h-5 w-28 animate-pulse rounded bg-slate-200 mb-4" />
            <div className="h-56 animate-pulse rounded bg-slate-100" />
          </AdminCardSkeleton>
        ))}
      </div>

      {/* Browser/OS — full width */}
      <AdminCardSkeleton>
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 mb-4" />
        <div className="h-48 animate-pulse rounded bg-slate-100" />
      </AdminCardSkeleton>
    </div>
  );
}
