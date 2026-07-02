'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminSelect,
  AdminBadge,
  AdminEmptyState,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import { ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { confirmDeposit, type AdminOrderListItem } from '@/app/actions/admin-orders';
import type { OrderStatus } from '@/lib/integrations/toss/types';
import { useToast } from '@/lib/hooks/useToast';

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'sla_overdue', label: '⏰ SLA 위반' },
  { value: 'escalated', label: '🚨 에스컬레이션' },
  { value: 'pending_payment', label: '결제 대기' },
  { value: 'awaiting_deposit', label: '입금 대기' },
  { value: 'paid', label: '결제 완료' },
  { value: 'preparing', label: '준비 중' },
  { value: 'shipped', label: '배송 중' },
  { value: 'delivered', label: '배송 완료' },
  { value: 'completed', label: '거래 완료' },
  { value: 'refund_requested', label: '환불 요청' },
  { value: 'cancelled', label: '취소됨' },
  { value: 'refunded', label: '환불됨' },
];

function statusBadgeVariant(
  status: OrderStatus
): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'pending_payment':
    case 'awaiting_deposit':
      return 'warning';
    case 'paid':
    case 'preparing':
    case 'shipped':
    case 'delivered':
      return 'info';
    case 'completed':
      return 'success';
    case 'cancelled':
    case 'refunded':
    case 'refund_requested':
      return 'danger';
    default:
      return 'default';
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: '결제 대기',
  awaiting_deposit: '입금 대기',
  paid: '결제 완료',
  preparing: '준비 중',
  shipped: '배송 중',
  delivered: '배송 완료',
  completed: '거래 완료',
  cancelled: '취소됨',
  refund_requested: '환불 요청',
  refunded: '환불됨',
};

function formatKRW(amount: number) {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderList({
  orders,
  initialStatus,
  initialQ,
  truncated = false,
  limit,
}: {
  orders: AdminOrderListItem[];
  initialStatus?: string;
  initialQ?: string;
  truncated?: boolean;
  limit?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? '');
  const [query, setQuery] = useState(initialQ ?? '');
  const [confirmTarget, setConfirmTarget] = useState<AdminOrderListItem | null>(null);
  const [isConfirming, startConfirm] = useTransition();

  function handleConfirmDeposit() {
    if (!confirmTarget) return;
    const target = confirmTarget;
    startConfirm(async () => {
      try {
        await confirmDeposit(target.id);
        toast.success('입금이 확인되어 결제 완료 처리되었습니다.');
        setConfirmTarget(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '입금 확인에 실패했습니다.');
      }
    });
  }

  const filtered = useMemo(() => {
    let result = orders;
    if (statusFilter === 'sla_overdue') {
      result = result.filter((o) => o.sla_overdue);
    } else if (statusFilter === 'escalated') {
      result = result.filter((o) => o.escalated_at != null);
    } else if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.order_no.toLowerCase().includes(q) || (o.buyer_name?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [orders, statusFilter, query]);

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    const params = new URLSearchParams();
    if (value) params.set('status', value);
    if (query.trim()) params.set('q', query.trim());
    router.push(`/admin/orders?${params.toString()}`);
  }

  return (
    <AdminCard>
      {truncated && (
        <div className="mb-3 rounded-md border border-danger-a11y/30 bg-danger-a11y/10 px-3 py-2 text-xs text-danger-a11y">
          최대 {limit?.toLocaleString('ko-KR')}건까지만 표시됩니다. 오래된 주문은 잘렸을 수 있으니
          상태·검색 필터로 범위를 좁혀 조회하세요.
        </div>
      )}
      <AdminCardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AdminInput
            placeholder="주문번호 / 구매자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <AdminSelect
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full sm:w-48"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
        </div>
        <p className="text-sm text-gray-500">{filtered.length}건</p>
      </AdminCardHeader>

      {filtered.length === 0 ? (
        <AdminEmptyState title="주문 없음" description="조건에 맞는 주문이 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border-soft)] text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">주문번호</th>
                <th className="px-4 py-3">작품명</th>
                <th className="px-4 py-3">작가</th>
                <th className="px-4 py-3">구매자</th>
                <th className="px-4 py-3 text-right">금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">주문일시</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border-soft)]">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.order_no}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-gray-800">
                    {order.artwork_title ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{order.artist_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{order.buyer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {formatKRW(order.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <AdminBadge tone={statusBadgeVariant(order.status)}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </AdminBadge>
                      {order.sla_overdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-charcoal-deep">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          SLA 위반
                        </span>
                      )}
                      {order.escalated_at != null && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-danger-a11y">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          에스컬레이션
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {order.status === 'awaiting_deposit' && (
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(order)}
                          className="whitespace-nowrap rounded-md bg-primary-strong px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-strong/90"
                        >
                          입금 확인
                        </button>
                      )}
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs text-primary-a11y hover:underline"
                      >
                        <span className="inline-flex items-center gap-1">
                          상세
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmModal
        isOpen={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmDeposit}
        title="입금 확인"
        description={
          confirmTarget
            ? `주문 ${confirmTarget.order_no} (${confirmTarget.buyer_name ?? '구매자'}, ${formatKRW(
                confirmTarget.total_amount
              )})의 입금을 확인하고 결제 완료 처리합니다.`
            : ''
        }
        confirmText="입금 확인"
        variant="info"
        isLoading={isConfirming}
      />
    </AdminCard>
  );
}
