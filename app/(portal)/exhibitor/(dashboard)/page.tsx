import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import {
  AdminCard,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

export default async function ExhibitorDashboard() {
  const artists = await getExhibitorArtists();
  const artworkCount = artists.reduce((sum: number, a: any) => sum + (a.artwork_count || 0), 0);

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>대시보드</AdminPageTitle>
        <AdminPageDescription>현재 계정에서 관리 중인 작가와 작품 현황입니다.</AdminPageDescription>
      </AdminPageHeader>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AdminCard className="p-6">
          <h2 className="text-sm font-medium text-slate-500">관리 중인 작가</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{artists.length}</p>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-sm font-medium text-slate-500">등록된 작품</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{artworkCount}</p>
        </AdminCard>
      </div>
    </div>
  );
}
