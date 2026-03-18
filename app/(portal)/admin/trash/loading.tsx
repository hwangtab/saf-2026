import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminTrashLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-slate-100" />
      </div>

      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-48 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="space-y-px">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
              <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
