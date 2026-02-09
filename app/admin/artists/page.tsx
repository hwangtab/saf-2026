import { requireAdmin } from '@/lib/auth/guards';
import { getArtistsWithArtworkCount } from '@/app/actions/admin-artists';
import { ArtistList } from './artist-list';

export default async function AdminArtistsPage() {
  await requireAdmin();
  const artists = await getArtistsWithArtworkCount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">작가 관리</h1>
        <p className="mt-2 text-sm text-slate-500">등록된 작가 정보를 관리합니다.</p>
      </div>
      <ArtistList artists={artists} />
    </div>
  );
}
