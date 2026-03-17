import { getAllArtistSales } from '@/app/actions/admin-artist-sales';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { ArtistSalesList } from './artist-sales-list';

export const dynamic = 'force-dynamic';

export default async function AdminArtistSalesPage() {
  const artists = await getAllArtistSales();

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>작가별 판매</AdminPageTitle>
        <AdminPageDescription>
          판매 실적이 있는 작가 {artists.length}명의 매출과 판매 수량을 확인합니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <ArtistSalesList artists={artists} />
    </div>
  );
}
