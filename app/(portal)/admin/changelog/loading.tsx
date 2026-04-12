import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminChangelogLoading() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <AdminCardSkeleton key={i} padded={false} className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
              <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
          </AdminCardSkeleton>
        ))}
      </div>
    </div>
  );
}
