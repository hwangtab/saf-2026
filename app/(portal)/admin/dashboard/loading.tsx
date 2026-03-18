import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
      </div>

      {/* 작가/작품 stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <AdminCardSkeleton key={i}>
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100 mb-3" />
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          </AdminCardSkeleton>
        ))}
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <AdminCardSkeleton key={i}>
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100 mb-3" />
            <div className="h-10 w-40 animate-pulse rounded bg-slate-200" />
          </AdminCardSkeleton>
        ))}
      </div>

      {/* 사이트 현황 stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <AdminCardSkeleton key={i}>
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100 mb-3" />
            <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          </AdminCardSkeleton>
        ))}
      </div>

      {/* 인기 페이지 + 피드백 lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <AdminCardSkeleton key={i} padded={false} className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </AdminCardSkeleton>
        ))}
      </div>

      {/* 최근 활동 lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <AdminCardSkeleton key={i} padded={false} className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-12 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </AdminCardSkeleton>
        ))}
      </div>
    </div>
  );
}
