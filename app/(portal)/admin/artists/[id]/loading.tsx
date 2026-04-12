import { ArtistFormSkeleton } from '../_artist-form-skeleton';

export default function AdminArtistDetailLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-100" />
      </div>
      <ArtistFormSkeleton />
    </div>
  );
}
