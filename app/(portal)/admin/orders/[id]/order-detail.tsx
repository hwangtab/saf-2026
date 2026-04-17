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
  AdminSelect,
} from '@/app/(portal)/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import {
  refundOrder,
  updateOrderStatus,
  updateTrackingInfo,
  confirmDeposit,
  cancelAwaitingOrder,
} from '@/app/actions/admin-orders';
import type { OrderDetail as OrderDetailType } from '@/app/actions/admin-orders';
import type { OrderStatus } from '@/lib/integrations/toss/types';
import { useToast } from '@/lib/hooks/useToast';
import { CARRIERS, getCarrierLabel, getTrackingUrl } from '@/lib/shipping';

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
      <dt className="w-36 flex-shrink-0 text-gray-500">{label}</dt>
      <dd className="flex-1 text-gray-800">{value ?? '—'}</dd>
    </div>
  );
}

const NEXT_STATUS_OPTIONS: Partial<Record<OrderStatus, { value: OrderStatus; label: string }[]>> = {
  paid: [{ value: 'preparing', label: '준비 중으로 변경' }],
  preparing: [{ value: 'shipped', label: '배송 중으로 변경' }],
  shipped: [{ value: 'delivered', label: '배송 완료로 변경' }],
  delivered: [{ value: 'completed', label: '거래 완료로 변경' }],
};

// ─── Tracking Edit Section ────────────────────────────────────────────────────

function TrackingEditSection({
  orderId,
  initialCarrier,
  initialTrackingNumber,
  onSaved,
}: {
  orderId: string;
  initialCarrier: string | null;
  initialTrackingNumber: string | null;
  onSaved: (carrier: string, trackingNumber: string) => void;
}) {
  const toast = useToast();
  const [carrier, setCarrier] = useState(initialCarrier ?? '');
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber ?? '');
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-primary-a11y hover:underline"
      >
        {initialCarrier ? '수정' : '운송장 입력'}
      </button>
    );
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateTrackingInfo(orderId, carrier, trackingNumber);
        toast.success('운송장 정보가 저장되었습니다.');
        onSaved(carrier, trackingNumber);
        setEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.');
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-primary-soft bg-primary-surface p-3">
      <div>
        <AdminFieldLabel>택배사</AdminFieldLabel>
        <AdminSelect value={carrier} onChange={(e) => setCarrier(e.target.value)}>
          <option value="">선택</option>
          {CARRIERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </AdminSelect>
      </div>
      <div>
        <AdminFieldLabel>운송장 번호</AdminFieldLabel>
        <AdminInput
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="운송장 번호 입력"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-primary-a11y px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-strong disabled:opacity-50"
        >
          저장
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          취소
        </button>
      </div>
    </div>
  );
}

// ─── Shipped Modal ────────────────────────────────────────────────────────────

function ShippedModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (carrier: string, trackingNumber: string) => void;
  isPending: boolean;
}) {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-bold text-gray-900">배송 중으로 변경</h2>
        <p className="mb-4 text-sm text-gray-500">
          택배사와 운송장 번호를 입력하세요. 나중에 입력하려면 비워두고 진행하세요.
        </p>
        <div className="space-y-3">
          <div>
            <AdminFieldLabel>택배사</AdminFieldLabel>
            <AdminSelect value={carrier} onChange={(e) => setCarrier(e.target.value)}>
              <option value="">선택 (선택 사항)</option>
              {CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div>
            <AdminFieldLabel>운송장 번호</AdminFieldLabel>
            <AdminInput
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="운송장 번호 (선택 사항)"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onConfirm(carrier, trackingNumber)}
            disabled={isPending}
            className="flex-1 rounded-xl bg-primary-a11y py-2.5 text-sm font-bold text-white hover:bg-primary-strong disabled:opacity-50"
          >
            {isPending ? '처리 중...' : '배송 시작'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OrderDetail({ order }: { order: OrderDetailType }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showShippedModal, setShowShippedModal] = useState(false);
  const [showConfirmDepositModal, setShowConfirmDepositModal] = useState(false);
  const [showCancelAwaitingModal, setShowCancelAwaitingModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelAwaitingReason, setCancelAwaitingReason] = useState('');
  const [refundBank, setRefundBank] = useState('');
  const [refundAccount, setRefundAccount] = useState('');
  const [refundHolder, setRefundHolder] = useState('');

  // Local tracking state (updated without page reload)
  const [trackingCarrier, setTrackingCarrier] = useState(order.shipping_carrier ?? null);
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? null);

  const isVirtualAccount =
    order.payment_method === '가상계좌' || order.payment_method === 'VIRTUAL_ACCOUNT';
  const isBankTransfer = !order.payment_key; // 계좌이체 주문은 Toss payment_key 없음
  const canRefund = ['paid', 'preparing'].includes(order.status);
  const isAwaitingDeposit = order.status === 'awaiting_deposit';
  const nextOptions = NEXT_STATUS_OPTIONS[order.status as OrderStatus] ?? [];
  const canEditTracking = ['shipped', 'delivered'].includes(order.status);

  const trackingUrl =
    trackingCarrier && trackingNumber ? getTrackingUrl(trackingCarrier, trackingNumber) : null;

  function handleConfirmDeposit() {
    startTransition(async () => {
      try {
        await confirmDeposit(order.id);
        toast.success('입금이 확인되었습니다. 결제 완료 처리되었습니다.');
        setShowConfirmDepositModal(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '입금 확인에 실패했습니다.');
      }
    });
  }

  function handleCancelAwaitingOrder() {
    if (!cancelAwaitingReason.trim()) {
      toast.error('취소 사유를 입력해주세요.');
      return;
    }
    startTransition(async () => {
      try {
        await cancelAwaitingOrder(order.id, cancelAwaitingReason);
        toast.success('주문이 취소되었습니다. 작품 예약이 해제되었습니다.');
        setShowCancelAwaitingModal(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '주문 취소에 실패했습니다.');
      }
    });
  }

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

  function handleShippedConfirm(carrier: string, trackingNo: string) {
    startTransition(async () => {
      try {
        await updateOrderStatus(order.id, 'shipped', { carrier, trackingNumber: trackingNo });
        if (carrier) setTrackingCarrier(carrier);
        if (trackingNo) setTrackingNumber(trackingNo);
        toast.success('배송 중으로 변경되었습니다.');
        setShowShippedModal(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '상태 변경에 실패했습니다.');
      }
    });
  }

  // Filter out 'shipped' from direct button click — handled via modal
  const directNextOptions = nextOptions.filter((opt) => opt.value !== 'shipped');
  const hasShippedOption = nextOptions.some((opt) => opt.value === 'shipped');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{order.order_no}</h1>
            <AdminBadge tone={statusBadgeVariant(order.status)}>
              {STATUS_LABELS[order.status] ?? order.status}
            </AdminBadge>
          </div>
          <p className="text-sm text-gray-500">주문일: {formatDate(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAwaitingDeposit && (
            <button
              onClick={() => setShowConfirmDepositModal(true)}
              disabled={isPending}
              className="rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-sm font-medium text-success-a11y hover:bg-success/20 disabled:opacity-50"
            >
              입금 확인
            </button>
          )}
          {isAwaitingDeposit && (
            <button
              onClick={() => setShowCancelAwaitingModal(true)}
              disabled={isPending}
              className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger-a11y hover:bg-danger/20 disabled:opacity-50"
            >
              주문 취소
            </button>
          )}
          {directNextOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusUpdate(opt.value)}
              disabled={isPending}
              className="rounded-md border border-primary-soft bg-primary-surface px-3 py-1.5 text-sm font-medium text-primary-strong hover:bg-primary-soft disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
          {hasShippedOption && (
            <button
              onClick={() => setShowShippedModal(true)}
              disabled={isPending}
              className="rounded-md border border-primary-soft bg-primary-surface px-3 py-1.5 text-sm font-medium text-primary-strong hover:bg-primary-soft disabled:opacity-50"
            >
              배송 중으로 변경
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => setShowRefundModal(true)}
              disabled={isPending}
              className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger-a11y hover:bg-danger/20 disabled:opacity-50"
            >
              환불 처리
            </button>
          )}
          <Link
            href="/admin/orders"
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← 목록
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 주문 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-gray-700">주문 정보</span>
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
            <span className="text-sm font-semibold text-gray-700">구매자 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow label="이름" value={order.buyer_name} />
            <InfoRow label="연락처" value={order.buyer_phone} />
          </dl>
        </AdminCard>

        {/* 배송 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-gray-700">배송 정보</span>
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

            {/* 운송장 정보 */}
            {(trackingCarrier || canEditTracking) && (
              <div className="border-t border-[var(--admin-border-soft)] pt-3">
                <InfoRow
                  label="택배사"
                  value={trackingCarrier ? getCarrierLabel(trackingCarrier) : '—'}
                />
                <div className="mt-2">
                  <InfoRow
                    label="운송장 번호"
                    value={
                      trackingNumber ? (
                        <span className="flex items-center gap-2 font-mono text-xs">
                          {trackingNumber}
                          {trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded bg-primary-soft px-1.5 py-0.5 text-xs font-medium text-primary-strong hover:bg-primary-soft"
                            >
                              조회
                            </a>
                          )}
                        </span>
                      ) : (
                        '—'
                      )
                    }
                  />
                </div>
                {canEditTracking && (
                  <div className="mt-2">
                    <TrackingEditSection
                      orderId={order.id}
                      initialCarrier={trackingCarrier}
                      initialTrackingNumber={trackingNumber}
                      onSaved={(c, t) => {
                        setTrackingCarrier(c || null);
                        setTrackingNumber(t || null);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </dl>
        </AdminCard>

        {/* 작품 정보 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-gray-700">작품 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow
              label="작품명"
              value={
                order.artwork_id ? (
                  <Link
                    href={`/admin/artworks/${order.artwork_id}`}
                    className="text-primary-a11y hover:underline"
                  >
                    {order.artwork_title ?? order.artwork_id}
                  </Link>
                ) : (
                  order.artwork_title
                )
              }
            />
            <InfoRow label="작가" value={order.artist_name ?? '—'} />
            {order.sale_id && (
              <InfoRow
                label="판매 기록"
                value={
                  <span className={order.sale_voided ? 'text-gray-400 line-through' : ''}>
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
            <span className="text-sm font-semibold text-gray-700">결제 정보</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow
              label="결제 수단"
              value={
                isBankTransfer
                  ? '계좌이체 (수동)'
                  : (METHOD_LABELS[order.payment_method ?? ''] ?? order.payment_method)
              }
            />
            {!isBankTransfer && (
              <>
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
              </>
            )}
          </dl>
        </AdminCard>

        {/* 금액 내역 */}
        <AdminCard>
          <AdminCardHeader>
            <span className="text-sm font-semibold text-gray-700">금액 내역</span>
          </AdminCardHeader>
          <dl className="space-y-3 p-5">
            <InfoRow label="작품 금액" value={formatKRW(order.item_amount)} />
            <InfoRow label="배송비" value={formatKRW(order.shipping_amount)} />
            <div className="border-t border-[var(--admin-border-soft)] pt-3">
              <InfoRow
                label="합계"
                value={
                  <span className="text-base font-bold text-gray-900">
                    {formatKRW(order.total_amount)}
                  </span>
                }
              />
            </div>
          </dl>
        </AdminCard>
      </div>

      {/* 배송 중 전환 모달 */}
      <ShippedModal
        isOpen={showShippedModal}
        onClose={() => setShowShippedModal(false)}
        onConfirm={handleShippedConfirm}
        isPending={isPending}
      />

      {/* 입금 확인 모달 */}
      <AdminConfirmModal
        isOpen={showConfirmDepositModal}
        onClose={() => setShowConfirmDepositModal(false)}
        onConfirm={handleConfirmDeposit}
        title="입금 확인"
        description={`주문 ${order.order_no}의 입금을 확인합니다.\n결제 완료 처리되며 판매 기록이 생성됩니다.`}
        confirmText="입금 확인"
        isLoading={isPending}
        variant="info"
      />

      {/* 입금대기 취소 모달 */}
      <AdminConfirmModal
        isOpen={showCancelAwaitingModal}
        onClose={() => setShowCancelAwaitingModal(false)}
        onConfirm={handleCancelAwaitingOrder}
        title="주문 취소"
        description={`주문 ${order.order_no}를 취소합니다.\n작품 예약이 해제되어 다시 판매 가능 상태가 됩니다.`}
        confirmText="주문 취소"
        isLoading={isPending}
        variant="danger"
      >
        <div>
          <AdminFieldLabel>취소 사유 *</AdminFieldLabel>
          <AdminTextarea
            value={cancelAwaitingReason}
            onChange={(e) => setCancelAwaitingReason(e.target.value)}
            placeholder="취소 사유를 입력하세요"
            rows={2}
          />
        </div>
      </AdminConfirmModal>

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
            <div className="space-y-2 rounded-lg border border-sun-soft bg-sun-soft p-3">
              <p className="text-xs font-medium text-sun-strong">
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
