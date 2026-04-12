import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminLogsLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
      </div>

      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="h-6 w-28 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="divide-y divide-gray-100">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-6 py-4">
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-3 w-24 animate-pulse rounded bg-gray-100 flex-shrink-0" />
            </div>
          ))}
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
