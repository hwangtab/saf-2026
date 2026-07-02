import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { getMonthlySettlements } from '@/app/actions/admin-settlements';
import { SettlementList } from './settlement-list';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ month?: string }> };

export default async function AdminSettlementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getMonthlySettlements(params.month);

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>정산 관리</AdminPageTitle>
        <AdminPageDescription>
          작가별·월별 정산 예정액(판매액의 50%)을 확인하고 지급 완료를 기록합니다.
        </AdminPageDescription>
      </AdminPageHeader>
      <SettlementList data={data} />
    </div>
  );
}
