import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminContentTestimonialsLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" />
      </div>
      <AdminCardSkeleton padded={false} className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
