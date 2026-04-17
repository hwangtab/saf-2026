import { requireAdmin } from '@/lib/auth/guards';
import { ArtistEditForm } from '../artist-edit-form';

type AdminNewArtistPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function AdminNewArtistPage({ searchParams }: AdminNewArtistPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const returnToRaw = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = returnToRaw?.startsWith('/admin/') ? returnToRaw : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">새 작가 등록</h1>
        <p className="mt-2 text-sm text-gray-500">새로운 작가 정보를 입력하고 등록합니다.</p>
      </div>
      <ArtistEditForm returnTo={returnTo} />
    </div>
  );
}
