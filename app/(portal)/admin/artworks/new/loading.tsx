import { ArtworkFormSkeleton } from '../_artwork-form-skeleton';

export default function AdminNewArtworkLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
      </div>
      <ArtworkFormSkeleton />
    </div>
  );
}
