import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function DashboardProfileLoading() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-36 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-52 animate-pulse rounded bg-gray-100" />
      </div>
      <AdminCardSkeleton padded={false} className="p-5 sm:p-6 space-y-6">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div
              className={`w-full animate-pulse rounded bg-gray-100 ${i >= 4 ? 'h-24' : 'h-10'}`}
            />
          </div>
        ))}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <div className="h-10 w-28 animate-pulse rounded bg-gray-200" />
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
