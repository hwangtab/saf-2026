'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AdminCard,
  AdminCardHeader,
  AdminBadge,
  AdminFieldLabel,
  AdminInput,
  AdminTextarea,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { refundOrder, updateOrderStatus } from '@/app/actions/admin-orders';
import type { OrderDetail as OrderDetailType } from '@/app/actions/admin-orders';
import type { OrderStatus } from '@/lib/integrations/toss/types';
import { useToast } from '@/lib/hooks/useToast';

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

const METHOD_LABELS: Record<string, string> = {
  카드: '카드',
  CARD: '카드',
  가상계좌: '가상계좌',
  VIRTUAL_ACCOUNT: '가상계좌',
  계좌이체: '계좌이체',
  TRANSFER: '계좌이체',
};

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

function formatKRW(amount: number) {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-36 flex-shrink-0 text-slate-500">{label}</dt>
      <dd className="flex-1 text-slate-800">{value ?? '—'}</dd>
    </div>
  );
}

const NEXT_STATUS_OPTIONS: Partial<Record<OrderStatus, { value: OrderStatus; label: string }[]>> = {
  paid: [{ value: 'preparing', label: '준비 중으로 변경' }],
  preparing: [{ value: 'shipped', label: '배송 중으로 변경' }],
  shipped: [{ value: 'delivered', label: '배송 완료로 변경' }],
  delivered: [{ value: 'completed', label: '거래 완료로 변경' }],
};

export function OrderDetail({ order }: { order: OrderDetailType }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundBank, setRefundBank] = useState('');
  const [refundAccount, setRefundAccount] = useState('');
  const [refundHolder, setRefundHolder] = useState('');

  const isVirtualAccount =
    order.payment_method === '가상계좌' || order.payment_method === 'VIRTUAL_ACCOUNT';
  const canRefund = ['paid', 'preparing'].includes(order.status);
  const nextOptions = NEXT_STATUS_OPTIONS[order.status as OrderStatus] ?? [];

  function handleRefund() {
    if (!cancelReason.trim()) {
      toast.error('취소 사유를 입력해주세요.');
      return;
    }
    if (isVirtualAccount && (!refundBank.trim() || !refundAccount.trim() || !refundHolder.trim())) {
      toast.error('가상계좌 결제는 환불 계좌 정보를 모두 입력해주세요.');
      return;
    }

    startTransition(async () => {
      try {
        await refundOrder({
          orderId: order.id,
          cancelReason,
          ...(isVirtualAccount
            ? {
                refundReceiveAccount: {
                  bank: refundBank,
                  accountNumber: refundAccount,
                  holderName: refundHolder,
                },
              }
            : {}),
        });
        toast.success('환불이 처리되었습니다.');
        setShowRefundModal(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '환불 처리에 실패했습니다.');
      }
    });
  }

  function handleStatusUpdate(newStatus: OrderStatus) {
    startTransition(async () => {
      try {
        await updateOrderStatus(order.id, newStatus);
        toast.success(`상태가 "${STATUS_LABELS[newStatus]}"로 변경되었습니다.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{order.order_no}</h1>
            <AdminBadge tone={statusBadgeVariant(order.status)}>
              {STATUS_LABELS[order.status] ?? order.status}
            </AdminBadge>
          </div>
          <p className="text-sm text-slate-500">주문일: {formatDate(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nextOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusUpdate(opt.value)}
              disabled={isPending}
              className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
          {canRefund && (
            <button
              onClick={() => setShowRefundModal(true)}
              disabled={isPending}
              className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              환불 처리
            </button>
          )}
          <Link
            href="/admin/orders"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← 목록
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 주문 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-slate-700">주문 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow
              label="주문번호"
              value={<span className="font-mono text-xs">{order.order_no}</span>}
            />
            <InfoRow label="주문일" value={formatDate(order.created_at)} />
            <InfoRow label="결제일" value={formatDate(order.paid_at)} />
            <InfoRow
              label="상태"
              value={
                <AdminBadge tone={statusBadgeVariant(order.status)}>
                  {STATUS_LABELS[order.status]}
                </AdminBadge>
              }
            />
            {order.cancelled_at && (
              <InfoRow label="취소일" value={formatDate(order.cancelled_at)} />
            )}
            {order.refunded_at && <InfoRow label="환불일" value={formatDate(order.refunded_at)} />}
          </dl>
        </AdminCard>

        {/* 구매자 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-slate-700">구매자 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow label="이름" value={order.buyer_name} />
            <InfoRow label="연락처" value={order.buyer_phone} />
          </dl>
        </AdminCard>

        {/* 배송 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-slate-700">배송 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow label="수령인" value={order.shipping_name} />
            <InfoRow label="연락처" value={order.shipping_phone} />
            <InfoRow
              label="주소"
              value={
                order.shipping_address
                  ? `${order.shipping_address}${order.shipping_address_detail ? ' ' + order.shipping_address_detail : ''}`
                  : null
              }
            />
            <InfoRow label="메모" value={order.shipping_memo} />
          </dl>
        </AdminCard>

        {/* 작품 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-slate-700">작품 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow
              label="작품명"
              value={
                order.artwork_id ? (
                  <Link
                    href={`/admin/artworks/${order.artwork_id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {order.artwork_title ?? order.artwork_id}
                  </Link>
                ) : (
                  order.artwork_title
                )
              }
            />
            {order.sale_id && (
              <InfoRow
                label="판매 기록"
                value={
                  <span className={order.sale_voided ? 'text-slate-400 line-through' : ''}>
                    {order.sale_voided ? '취소됨' : '기록됨'}
                  </span>
                }
              />
            )}
          </dl>
        </AdminCard>

        {/* 결제 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-slate-700">결제 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow
              label="결제 수단"
              value={METHOD_LABELS[order.payment_method ?? ''] ?? order.payment_method}
            />
            <InfoRow label="결제 상태" value={order.payment_status} />
            <InfoRow label="승인일시" value={formatDate(order.approved_at)} />
            {order.virtual_account_number && (
              <>
                <InfoRow
                  label="가상계좌"
                  value={`${order.virtual_account_bank} ${order.virtual_account_number}`}
                />
                <InfoRow
                  label="입금 기한"
                  value={
                    order.virtual_account_due_date
                      ? formatDate(order.virtual_account_due_date)
                      : null
                  }
                />
              </>
            )}
            <InfoRow
              label="결제키"
              value={<span className="font-mono text-xs break-all">{order.payment_key}</span>}
            />
          </dl>
        </AdminCard>

        {/* 금액 내역 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-slate-700">금액 내역</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow label="작품 금액" value={formatKRW(order.item_amount)} />
            <InfoRow label="배송비" value={formatKRW(order.shipping_amount)} />
            <div className="border-t border-[var(--admin-border-soft)] pt-3">
              <InfoRow
                label="합계"
                value={
                  <span className="text-base font-bold text-slate-900">
                    {formatKRW(order.total_amount)}
                  </span>
                }
              />
            </div>
          </dl>
        </AdminCard>
      </div>

      {/* 환불 모달 */}
      <AdminConfirmModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onConfirm={handleRefund}
        title="환불 처리"
        description={`주문 ${order.order_no}를 환불 처리합니다.\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="환불 처리"
        isLoading={isPending}
        variant="danger"
      >
        <div className="space-y-3">
          <div>
            <AdminFieldLabel>취소 사유 *</AdminFieldLabel>
            <AdminTextarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유를 입력하세요"
              rows={2}
            />
          </div>
          {isVirtualAccount && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-800">
                가상계좌 결제 — 환불 계좌 입력 필수
              </p>
              <div>
                <AdminFieldLabel>은행명 *</AdminFieldLabel>
                <AdminInput
                  value={refundBank}
                  onChange={(e) => setRefundBank(e.target.value)}
                  placeholder="예: 국민은행"
                />
              </div>
              <div>
                <AdminFieldLabel>계좌번호 *</AdminFieldLabel>
                <AdminInput
                  value={refundAccount}
                  onChange={(e) => setRefundAccount(e.target.value)}
                  placeholder="계좌번호 (숫자만)"
                />
              </div>
              <div>
                <AdminFieldLabel>예금주 *</AdminFieldLabel>
                <AdminInput
                  value={refundHolder}
                  onChange={(e) => setRefundHolder(e.target.value)}
                  placeholder="예금주명"
                />
              </div>
            </div>
          )}
        </div>
      </AdminConfirmModal>
    </div>
  );
}
