import { ArtworkFormSkeleton } from '../_artwork-form-skeleton';
import { AdminCardSkeleton } from '@/components/ui/Skeleton';

export default function AdminArtworkDetailLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded bg-slate-200" />
      </div>

      <ArtworkFormSkeleton />

      {/* 판매 이력 */}
      <AdminCardSkeleton className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-6 py-3 border-t border-slate-100">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            <div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </AdminCardSkeleton>
    </div>
  );
}
