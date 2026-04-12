import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminFeedbackLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
      </div>
      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="divide-y divide-gray-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
