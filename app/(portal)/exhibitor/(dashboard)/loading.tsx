import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function ExhibitorDashboardLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-36 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminCardSkeleton>
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 h-10 w-20 animate-pulse rounded bg-gray-200" />
        </AdminCardSkeleton>
        <AdminCardSkeleton>
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 h-10 w-20 animate-pulse rounded bg-gray-200" />
        </AdminCardSkeleton>
      </div>
    </div>
  );
}
