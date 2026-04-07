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

  const orders = await getOrders({ status: params.status, q: params.q });

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
