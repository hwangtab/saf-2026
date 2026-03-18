import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function ExhibitorArtistDetailLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-28 animate-pulse rounded bg-slate-100" />
      </div>
      <AdminCardSkeleton className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ))}
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      </AdminCardSkeleton>
    </div>
  );
}
