import { getArtistsWithArtworkCount } from '@/app/actions/admin-artists';
import { requireAdmin } from '@/lib/auth/guards';
import { ArtworkEditForm } from '../artwork-edit-form';

type AdminNewArtworkPageProps = {
  searchParams?: {
    artist_id?: string | string[];
    artist_created?: string | string[];
  };
};

export default async function AdminNewArtworkPage({ searchParams }: AdminNewArtworkPageProps) {
  await requireAdmin();
  const artists = await getArtistsWithArtworkCount();
  const initialArtistId = Array.isArray(searchParams?.artist_id)
    ? searchParams?.artist_id[0]
    : searchParams?.artist_id;
  const artistCreatedParam = Array.isArray(searchParams?.artist_created)
    ? searchParams?.artist_created[0]
    : searchParams?.artist_created;
  const artistJustCreated = artistCreatedParam === '1';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">새 작품 등록</h1>
        <p className="mt-2 text-sm text-slate-500">새로운 작품 정보를 입력하고 등록합니다.</p>
      </div>
      <ArtworkEditForm
        artists={artists}
        initialArtistId={initialArtistId}
        artistJustCreated={artistJustCreated}
      />
    </div>
  );
}
