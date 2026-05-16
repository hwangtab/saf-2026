import { requireAdmin } from '@/lib/auth/guards';
import { getOrders } from '@/app/actions/admin-orders';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { OrderList } from './order-list';

type Props = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;

  // sla_overdue, escalated 는 UI 가상 필터 — DB status 컬럼에 없으므로 제거 후 전체 조회
  const VIRTUAL_FILTERS = new Set(['sla_overdue', 'escalated']);
  const dbStatus = params.status && !VIRTUAL_FILTERS.has(params.status) ? params.status : undefined;
  const orders = await getOrders({ status: dbStatus, q: params.q });

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>주문 관리</AdminPageTitle>
        <AdminPageDescription>온라인 결제 주문을 조회하고 관리합니다.</AdminPageDescription>
      </AdminPageHeader>
      <OrderList orders={orders} initialStatus={params.status} initialQ={params.q} />
    </div>
  );
}
