'use client';

import { Link } from '@/i18n/navigation';

type Order = {
  id: string;
  order_no: string;
  artwork_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  buyer_name: string;
};

interface OrdersTabProps {
  orders: Order[];
  emptyMessage: string;
  viewDetailLabel: string;
}

const STATUS_LABEL: Record<string, string> = {
  paid: '결제완료',
  pending: '결제대기',
  cancelled: '취소됨',
  refunded: '환불됨',
  shipped: '배송중',
  delivered: '배송완료',
};

export default function OrdersTab({ orders, emptyMessage, viewDetailLabel }: OrdersTabProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-charcoal-muted">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li
          key={order.id}
          className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-charcoal truncate">주문 {order.order_no}</p>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {new Date(order.created_at).toLocaleDateString()} ·{' '}
              {STATUS_LABEL[order.status] ?? order.status}
            </p>
            <p className="text-sm font-semibold text-charcoal-deep mt-1">
              {order.total_amount.toLocaleString()}원
            </p>
          </div>
          <Link
            href={`/orders?orderNo=${order.order_no}`}
            className="shrink-0 text-xs font-medium text-primary-a11y hover:text-primary border border-primary/30 rounded-full px-3 py-1.5 transition-colors hover:bg-primary/5"
          >
            {viewDetailLabel}
          </Link>
        </li>
      ))}
    </ul>
  );
}
