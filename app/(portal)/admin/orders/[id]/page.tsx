import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { getOrderDetail } from '@/app/actions/admin-orders';
import { OrderDetail } from './order-detail';

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const order = await getOrderDetail(id);
  if (!order) notFound();

  return <OrderDetail order={order} />;
}
