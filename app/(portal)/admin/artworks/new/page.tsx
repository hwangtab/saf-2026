import { getArtistsWithArtworkCount } from '@/app/actions/admin-artists';
import { requireAdmin } from '@/lib/auth/guards';
import { ArtworkEditForm } from '../artwork-edit-form';

type AdminNewArtworkPageProps = {
  searchParams: Promise<{
    artist_id?: string | string[];
    artist_created?: string | string[];
  }>;
};

export default async function AdminNewArtworkPage({ searchParams }: AdminNewArtworkPageProps) {
  await requireAdmin();
  const artists = await getArtistsWithArtworkCount();
  const params = await searchParams;
  const initialArtistId = Array.isArray(params.artist_id) ? params.artist_id[0] : params.artist_id;
  const artistCreatedParam = Array.isArray(params.artist_created)
    ? params.artist_created[0]
    : params.artist_created;
  const artistJustCreated = artistCreatedParam === '1';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">새 작품 등록</h1>
        <p className="mt-2 text-sm text-gray-500">새로운 작품 정보를 입력하고 등록합니다.</p>
      </div>
      <ArtworkEditForm
        artists={artists}
        initialArtistId={initialArtistId}
        artistJustCreated={artistJustCreated}
      />
    </div>
  );
}
