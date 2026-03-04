import { requireAdmin } from '@/lib/auth/guards';
import { ArtistEditForm } from '../artist-edit-form';

type AdminNewArtistPageProps = {
  searchParams?: { returnTo?: string | string[] };
};

export default async function AdminNewArtistPage({ searchParams }: AdminNewArtistPageProps) {
  await requireAdmin();

  const returnToRaw = Array.isArray(searchParams?.returnTo)
    ? searchParams?.returnTo[0]
    : searchParams?.returnTo;
  const returnTo = returnToRaw?.startsWith('/admin/') ? returnToRaw : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">새 작가 등록</h1>
        <p className="mt-2 text-sm text-slate-500">새로운 작가 정보를 입력하고 등록합니다.</p>
      </div>
      <ArtistEditForm returnTo={returnTo} />
    </div>
  );
}
