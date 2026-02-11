import { getArtistsWithArtworkCount } from '@/app/actions/admin-artists';
import { requireAdmin } from '@/lib/auth/guards';
import { ArtworkEditForm } from '../artwork-edit-form';

export default async function AdminNewArtworkPage() {
  await requireAdmin();
  const artists = await getArtistsWithArtworkCount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">새 작품 등록</h1>
        <p className="mt-2 text-sm text-slate-500">새로운 작품 정보를 입력하고 등록합니다.</p>
      </div>
      <ArtworkEditForm artists={artists} />
    </div>
  );
}
