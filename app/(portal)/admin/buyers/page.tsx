import { getAllBuyers } from '@/app/actions/admin-buyers';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { BuyerList } from './buyer-list';

export const dynamic = 'force-dynamic';

export default async function AdminBuyersPage() {
  const buyers = await getAllBuyers();

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>구매자 관리</AdminPageTitle>
        <AdminPageDescription>
          전체 구매자 {buyers.length}명 · 이름/연락처 검색, 연락처 편집 가능
        </AdminPageDescription>
      </AdminPageHeader>

      <BuyerList buyers={buyers} />
    </div>
  );
}
