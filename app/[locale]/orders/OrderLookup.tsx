'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import { Link, useRouter } from '@/i18n/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import SafeImage from '@/components/common/SafeImage';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ExternalLink } from 'lucide-react';
import { formatPriceForDisplay } from '@/lib/utils';
import { getCarrierLabel, getTrackingUrl } from '@/lib/shipping';
import {
  lookupOrders,
  lookupOrderDetail,
  updateBuyerShipping,
  cancelBuyerOrder,
} from '@/app/actions/order-lookup';
import type {
  PublicOrderListItem,
  OrderPublicInfo,
  UpdateShippingInput,
} from '@/app/actions/order-lookup';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'statusPendingPayment', className: 'bg-gray-100 text-charcoal-muted' },
  awaiting_deposit: {
    label: 'statusAwaitingDeposit',
    className: 'bg-gray-100 text-charcoal-muted',
  },
  paid: { label: 'statusPaid', className: 'bg-primary-surface text-primary-strong' },
  preparing: { label: 'statusPreparing', className: 'bg-primary-surface text-primary-strong' },
  shipped: { label: 'statusShipped', className: 'bg-primary-soft text-primary-strong' },
  delivered: { label: 'statusDelivered', className: 'bg-success/20 text-success-a11y' },
  completed: { label: 'statusCompleted', className: 'bg-success/20 text-success-a11y' },
  cancelled: { label: 'statusCancelled', className: 'bg-danger/20 text-danger-a11y' },
  refunded: { label: 'statusRefunded', className: 'bg-danger/20 text-danger-a11y' },
};

const PAYMENT_METHOD_I18N_KEYS: Record<string, string> = {
  CARD: 'paymentMethodCard',
  TRANSFER: 'paymentMethodTransfer',
  VIRTUAL_ACCOUNT: 'paymentMethodVirtualAccount',
  MOBILE_PHONE: 'paymentMethodMobilePhone',
};

// The ordered steps for the normal flow stepper
const STEPPER_STEPS: { status: string; labelKey: string }[] = [
  { status: 'paid', labelKey: 'statusStepPaid' },
  { status: 'preparing', labelKey: 'statusStepPreparing' },
  { status: 'shipped', labelKey: 'statusStepShipped' },
  { status: 'delivered', labelKey: 'statusStepDelivered' },
  { status: 'completed', labelKey: 'statusStepCompleted' },
];

function formatKstDate(utcString: string | null): string {
  if (!utcString) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utcString));
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('orderLookup');
  const info = STATUS_STYLES[status];
  if (!info) return null;
  return (
    <Badge className={clsx('font-semibold', info.className)}>
      {t(info.label as Parameters<typeof t>[0])}
    </Badge>
  );
}

function OrderStatusStepper({ status }: { status: string }) {
  const t = useTranslations('orderLookup');

  // Not a normal flow status — show notice instead
  if (status === 'cancelled') {
    return (
      <div
        role="alert"
        className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y text-center font-medium"
      >
        {t('orderCancelledNotice')}
      </div>
    );
  }
  if (status === 'refunded') {
    return (
      <div
        role="alert"
        className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y text-center font-medium"
      >
        {t('orderRefundedNotice')}
      </div>
    );
  }
  if (status === 'awaiting_deposit') {
    // Virtual account UI is handled separately below, skip stepper
    return null;
  }

  const currentIndex = STEPPER_STEPS.findIndex((s) => s.status === status);

  return (
    <div className="py-2">
      <div className="flex items-start justify-between">
        {STEPPER_STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.status} className="flex flex-1 flex-col items-center">
              {/* connector + circle row */}
              <div className="flex w-full items-center">
                {/* left connector */}
                <div
                  className={clsx(
                    'h-0.5 flex-1',
                    idx === 0 ? 'invisible' : isDone || isCurrent ? 'bg-primary' : 'bg-gray-200'
                  )}
                />
                {/* circle */}
                <div
                  className={clsx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                    isDone
                      ? 'border-primary-strong bg-primary-strong text-white'
                      : isCurrent
                        ? 'border-primary bg-white text-primary-strong'
                        : 'border-gray-200 bg-white text-gray-300'
                  )}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                {/* right connector */}
                <div
                  className={clsx(
                    'h-0.5 flex-1',
                    idx === STEPPER_STEPS.length - 1
                      ? 'invisible'
                      : isDone
                        ? 'bg-primary'
                        : 'bg-gray-200'
                  )}
                />
              </div>
              {/* label */}
              <p
                className={clsx(
                  'mt-1.5 text-center text-xs leading-tight',
                  isCurrent
                    ? 'font-bold text-primary-strong'
                    : isDone
                      ? 'text-charcoal-soft'
                      : 'text-gray-300'
                )}
              >
                {t(step.labelKey as Parameters<typeof t>[0])}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Edit Shipping Form ───────────────────────────────────────────────────────

interface EditShippingFormProps {
  order: OrderPublicInfo;
  buyerEmail: string;
  onSaved: (updated: Partial<OrderPublicInfo>) => void;
  onCancel: () => void;
}

function EditShippingForm({ order, buyerEmail, onSaved, onCancel }: EditShippingFormProps) {
  const t = useTranslations('orderLookup');
  const [name, setName] = useState(order.shippingName);
  const [phone, setPhone] = useState(order.shippingPhone ?? '');
  const [postalCode, setPostalCode] = useState(order.shippingPostalCode ?? '');
  const [address, setAddress] = useState(order.shippingAddress);
  const [detail, setDetail] = useState(order.shippingAddressDetail ?? '');
  const [memo, setMemo] = useState(order.shippingMemo ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError(t('shippingRequiredFields'));
      return;
    }
    setLoading(true);
    const input: UpdateShippingInput = {
      shippingName: name,
      shippingPhone: phone,
      shippingPostalCode: postalCode || undefined,
      shippingAddress: address,
      shippingAddressDetail: detail || undefined,
      shippingMemo: memo || undefined,
    };
    const res = await updateBuyerShipping(order.orderNo, buyerEmail, input);
    setLoading(false);
    if (res.success) {
      onSaved({
        shippingName: name.trim(),
        shippingPhone: phone.trim(),
        shippingPostalCode: postalCode.trim() || null,
        shippingAddress: address.trim(),
        shippingAddressDetail: detail.trim() || null,
        shippingMemo: memo.trim() || null,
      });
    } else {
      setError(t('shippingUpdateFailed'));
    }
  }

  // text-base(16px) — text-sm(14px)이면 iOS Safari가 input focus 시 auto-zoom.
  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-charcoal placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary';

  return (
    <div className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-charcoal-soft">
            {t('recipient')}
          </label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-charcoal-soft">
            {t('shippingPhone')}
          </label>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-charcoal-soft">
          {t('shippingPostalCode')}
        </label>
        <input
          className={inputClass}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          inputMode="numeric"
          maxLength={10}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-charcoal-soft">{t('address')}</label>
        <input
          className={inputClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div>
        <input
          className={inputClass}
          placeholder={t('addressDetailPlaceholder')}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-charcoal-soft">
          {t('shippingMemo')}
        </label>
        <input
          className={inputClass}
          placeholder={t('shippingMemoPlaceholder')}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-danger-a11y">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="flex-1 rounded-lg bg-primary py-2 text-sm font-bold text-white hover:bg-primary-strong transition-colors disabled:opacity-50"
        >
          {loading ? t('saving') : t('saveChanges')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-charcoal hover:bg-gray-50 transition-colors"
        >
          {t('cancelEdit')}
        </button>
      </div>
    </div>
  );
}

// ─── Cancel Order Modal ───────────────────────────────────────────────────────

interface CancelModalProps {
  order: OrderPublicInfo;
  buyerEmail: string;
  onCancelled: () => void;
  onClose: () => void;
}

function CancelModal({ order, buyerEmail, onCancelled, onClose }: CancelModalProps) {
  const t = useTranslations('orderLookup');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError(t('cancelReasonPlaceholder'));
      return;
    }
    setError(null);
    setLoading(true);
    const res = await cancelBuyerOrder(order.orderNo, buyerEmail, reason);
    setLoading(false);
    if (res.success) {
      onCancelled();
    } else {
      setError(t('cancelOrderFailed'));
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div
        aria-labelledby="cancel-modal-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="cancel-modal-title" className="mb-1 text-base font-bold text-charcoal">
          {t('cancelOrderConfirm')}
        </h2>
        <p className="mb-4 text-sm text-charcoal-soft">
          {order.status === 'awaiting_deposit'
            ? t('cancelOrderDescriptionAwaiting')
            : t('cancelOrderDescription')}
        </p>

        <label className="mb-1.5 block text-sm font-medium text-charcoal">
          {t('cancelReasonLabel')}
        </label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('cancelReasonPlaceholder')}
          className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-charcoal placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary resize-none"
        />

        {error && <p className="mb-3 text-xs text-danger-a11y">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-danger-a11y py-2.5 text-sm font-bold text-white hover:bg-danger-a11y transition-colors disabled:opacity-50"
          >
            {loading ? t('processing') : t('cancelOrderButton')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-charcoal hover:bg-gray-50 transition-colors"
          >
            {t('cancelEdit')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────

function OrderDetail({
  order: initialOrder,
  buyerEmail,
  onStatusChange,
  onDetailUpdate,
}: {
  order: OrderPublicInfo;
  buyerEmail: string;
  onStatusChange: (status: string) => void;
  onDetailUpdate: (updated: Partial<OrderPublicInfo>) => void;
}) {
  const t = useTranslations('orderLookup');
  const tCheckout = useTranslations('checkout');
  const tA11y = useTranslations('a11y');
  const locale = useLocale();
  const [order, setOrder] = useState(initialOrder);
  const [editingShipping, setEditingShipping] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const canEditShipping = ['paid', 'preparing'].includes(order.status);
  const canCancel = ['paid', 'awaiting_deposit'].includes(order.status);

  const bankTransferDeadline =
    order.status === 'awaiting_deposit' && !order.virtualAccount
      ? (() => {
          const dl = new Date(new Date(order.createdAt).getTime() + 24 * 60 * 60 * 1000);
          if (locale === 'ko') {
            const m = dl.getMonth() + 1;
            const d = dl.getDate();
            const hh = String(dl.getHours()).padStart(2, '0');
            const mm = String(dl.getMinutes()).padStart(2, '0');
            return `${m}월 ${d}일 ${hh}:${mm}`;
          }
          return dl.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        })()
      : '';

  function handleShippingSaved(updated: Partial<OrderPublicInfo>) {
    setOrder((prev) => ({ ...prev, ...updated }));
    onDetailUpdate(updated);
    setEditingShipping(false);
  }

  function handleCancelled() {
    setOrder((prev) => ({ ...prev, status: 'cancelled' }));
    onStatusChange('cancelled');
    onDetailUpdate({ status: 'cancelled' });
    setShowCancelModal(false);
  }

  return (
    <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
      {/* Status Stepper */}
      <OrderStatusStepper status={order.status} />

      {/* 가상계좌 입금 안내 */}
      {order.status === 'awaiting_deposit' && order.virtualAccount && (
        <div className="rounded-xl border border-primary-soft bg-primary-surface p-4 text-sm">
          <p className="mb-2 font-semibold text-primary-strong">{t('virtualAccountInfo')}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-charcoal-muted">{t('bankName')}</span>
              <span className="font-semibold text-charcoal-deep">
                {order.virtualAccount.bankName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">{t('accountNumber')}</span>
              <span className="font-mono font-semibold text-charcoal-deep">
                {order.virtualAccount.accountNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">{t('dueDate')}</span>
              <span className="font-semibold text-charcoal-deep">
                {order.virtualAccount.dueDate}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 수동 계좌이체 입금 안내 */}
      {order.status === 'awaiting_deposit' && !order.virtualAccount && (
        <div className="rounded-xl border border-primary-soft bg-primary-surface p-4 text-sm">
          <p className="mb-2 font-semibold text-primary-strong">{tCheckout('bankTransferTitle')}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-charcoal-muted">{t('bankName')}</span>
              <span className="font-semibold text-charcoal-deep">
                {tCheckout('bankTransferBank')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">{t('accountNumber')}</span>
              <span className="font-mono font-semibold text-charcoal-deep">
                {tCheckout('bankTransferAccount')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-muted">{tCheckout('bankTransferHolder')}</span>
              <span className="font-semibold text-charcoal-deep">
                {tCheckout('bankTransferHolderName')}
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-charcoal-muted space-y-0.5">
            <p>{tCheckout('bankTransferNoticeName')}</p>
            <p>{tCheckout('bankTransferNoticeDeadline', { deadline: bankTransferDeadline })}</p>
          </div>
        </div>
      )}

      {/* 주문 정보 */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-charcoal-soft">{t('orderNo')}</span>
          <span className="font-mono text-charcoal">{order.orderNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-charcoal-soft">{t('orderDate')}</span>
          <span className="text-charcoal">{formatKstDate(order.createdAt)}</span>
        </div>
        {order.paymentMethod && (
          <div className="flex justify-between">
            <span className="text-charcoal-soft">{t('paymentMethod')}</span>
            <span className="text-charcoal">
              {PAYMENT_METHOD_I18N_KEYS[order.paymentMethod]
                ? t(PAYMENT_METHOD_I18N_KEYS[order.paymentMethod] as Parameters<typeof t>[0])
                : order.paymentMethod}
            </span>
          </div>
        )}
        {order.paidAt && (
          <div className="flex justify-between">
            <span className="text-charcoal-soft">{t('paymentDate')}</span>
            <span className="text-charcoal">{formatKstDate(order.paidAt)}</span>
          </div>
        )}
      </div>

      {/* 배송 정보 */}
      <div className="space-y-2 border-t border-gray-100 pt-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-charcoal">{t('shippingInfo')}</span>
          {canEditShipping && !editingShipping && (
            <button
              type="button"
              onClick={() => setEditingShipping(true)}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {t('editShipping')}
            </button>
          )}
        </div>

        {editingShipping ? (
          <EditShippingForm
            order={order}
            buyerEmail={buyerEmail}
            onSaved={handleShippingSaved}
            onCancel={() => setEditingShipping(false)}
          />
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-charcoal-soft">{t('recipient')}</span>
              <span className="text-charcoal">{order.shippingName}</span>
            </div>
            {order.shippingPhone && (
              <div className="flex justify-between">
                <span className="text-charcoal-soft">{t('shippingPhone')}</span>
                <span className="text-charcoal">{order.shippingPhone}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-charcoal-soft">{t('address')}</span>
              <span className="text-right text-charcoal">
                {order.shippingAddress}
                {order.shippingAddressDetail && ` ${order.shippingAddressDetail}`}
              </span>
            </div>
            {order.shippingMemo && (
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-charcoal-soft">{t('shippingMemo')}</span>
                <span className="text-right text-charcoal">{order.shippingMemo}</span>
              </div>
            )}
          </div>
        )}

        {/* 운송장 정보 */}
        {['shipped', 'delivered', 'completed'].includes(order.status) && (
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            {order.trackingNumber ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-soft">{t('shippingCarrier')}</span>
                  <span className="text-charcoal">
                    {order.shippingCarrier ? getCarrierLabel(order.shippingCarrier) : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-soft">{t('trackingNumber')}</span>
                  <span className="font-mono text-charcoal">{order.trackingNumber}</span>
                </div>
                {order.shippingCarrier &&
                  getTrackingUrl(order.shippingCarrier, order.trackingNumber) && (
                    <a
                      href={getTrackingUrl(order.shippingCarrier, order.trackingNumber)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary-surface py-2.5 text-sm font-semibold text-primary-strong hover:bg-primary-surface transition-colors"
                    >
                      {t('trackDelivery')}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{tA11y('opensInNewTab')}</span>
                    </a>
                  )}
              </>
            ) : (
              <p className="text-sm text-charcoal-soft text-center py-1">{t('noTrackingYet')}</p>
            )}
          </div>
        )}
      </div>

      {/* 금액 내역 */}
      <div className="space-y-2 border-t border-gray-100 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-charcoal-soft">{t('artworkAmount')}</span>
          <span className="text-charcoal">{formatPriceForDisplay(order.itemAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-charcoal-soft">{t('shippingFee')}</span>
          <span className="text-charcoal">
            {order.shippingAmount === 0
              ? t('freeShipping')
              : formatPriceForDisplay(order.shippingAmount)}
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span className="text-charcoal">{t('totalAmount')}</span>
          <span className="text-primary-a11y">{formatPriceForDisplay(order.totalAmount)}</span>
        </div>
      </div>

      {/* 결제 취소 */}
      {canCancel && (
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="w-full rounded-xl border border-danger/30 py-2.5 text-sm font-medium text-danger-a11y hover:bg-danger/10 transition-colors"
          >
            {order.status === 'awaiting_deposit' ? t('cancelOrderAwaiting') : t('cancelOrder')}
          </button>
        </div>
      )}

      {showCancelModal && (
        <CancelModal
          order={order}
          buyerEmail={buyerEmail}
          onCancelled={handleCancelled}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  item,
  buyerEmail,
  initialDetail,
}: {
  item: PublicOrderListItem;
  buyerEmail: string;
  initialDetail?: OrderPublicInfo | null;
}) {
  const [open, setOpen] = useState(!!initialDetail);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<OrderPublicInfo | null>(initialDetail ?? null);
  const [cardStatus, setCardStatus] = useState(item.status);

  function handleDetailUpdate(updated: Partial<OrderPublicInfo>) {
    setDetail((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    if (detail) {
      setOpen(true);
      return;
    }
    setLoading(true);
    const res = await lookupOrderDetail(item.orderNo, buyerEmail);
    setLoading(false);
    if (res.success) {
      setDetail(res.order);
      setOpen(true);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="w-full text-left"
        disabled={loading}
      >
        <div className="flex items-center gap-4">
          {item.artworkImage && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <SafeImage
                src={item.artworkImage}
                alt={item.artworkTitle}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-charcoal">{item.artworkTitle}</p>
            <p className="mt-0.5 text-sm font-bold text-primary-a11y">
              {formatPriceForDisplay(item.totalAmount)}
            </p>
            <p className="mt-0.5 text-xs text-charcoal-soft">{formatKstDate(item.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge status={cardStatus} />
            <span className="text-xs text-charcoal-soft">{loading ? '...' : open ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {open && detail && (
        <OrderDetail
          order={detail}
          buyerEmail={buyerEmail}
          onStatusChange={setCardStatus}
          onDetailUpdate={handleDetailUpdate}
        />
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function OrderLookup() {
  const t = useTranslations('orderLookup');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PublicOrderListItem[] | null>(null);
  const [firstDetail, setFirstDetail] = useState<OrderPublicInfo | null>(null);

  // 로그인 회원 자동 처리 — 게스트(비회원)에게만 조회 폼을 노출하기 위해 먼저 세션을 확인한다.
  // 서버가 아닌 클라이언트에서 판단하는 이유: 이 페이지는 정적 생성(force-static)이고,
  // 미들웨어 rewrite가 ?orderNo= 쿼리를 서버 searchParams에서 떨구기 때문. 브라우저의
  // 실제 URL(window.location.search)과 세션은 이런 함정의 영향을 받지 않는다.
  const [authChecking, setAuthChecking] = useState(true);
  const [autoDetail, setAutoDetail] = useState<OrderPublicInfo | null>(null);
  const [autoEmail, setAutoEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    // getSession은 로컬 세션을 즉시 읽으므로 게스트는 사실상 깜빡임 없이 폼으로 진입.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        const user = session?.user;
        if (!user) {
          setAuthChecking(false); // 게스트 → 조회 폼
          return;
        }
        // 로그인 회원: 실제 브라우저 URL의 주문번호로 자동 조회 (마이페이지·결제완료 → 주문상세 흐름)
        const urlOrderNo = new URLSearchParams(window.location.search).get('orderNo');
        if (urlOrderNo) {
          const res = await lookupOrderDetail(urlOrderNo, user.email ?? '');
          if (cancelled) return;
          if (res.success) {
            setAutoDetail(res.order);
            setAutoEmail(user.email ?? '');
            setAuthChecking(false);
            return;
          }
        }
        // 주문번호가 없거나(헤더 메뉴 직접 진입) 조회 실패 → 마이페이지 주문 목록으로
        router.replace('/mypage');
      })
      .catch(() => {
        // 세션 확인 실패 시에도 최소한 게스트 조회 폼은 제공
        if (!cancelled) setAuthChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 로그인 회원의 주문 상세 자동 표시 — 폼 없이 바로 노출
  // (buyerEmail은 OrderCard의 배송지 수정·취소 버튼 작동에 필요)
  if (autoDetail) {
    const item: PublicOrderListItem = {
      orderNo: autoDetail.orderNo,
      status: autoDetail.status,
      artworkTitle: autoDetail.artworkTitle,
      artworkImage: autoDetail.artworkImage,
      totalAmount: autoDetail.totalAmount,
      createdAt: autoDetail.createdAt,
    };
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-charcoal">{t('pageTitle')}</h1>
        <OrderCard item={item} buyerEmail={autoEmail} initialDetail={autoDetail} />
      </div>
    );
  }

  // 로그인 여부 확인 중 — 회원이 게스트 폼을 잠깐이라도 보지 않도록 대기
  // (세션은 로컬에서 즉시 읽혀 게스트 영향은 무시할 수준)
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-charcoal">{t('pageTitle')}</h1>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrders(null);
    setFirstDetail(null);

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError(t('errorRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await lookupOrders(name, email, phone);
      if (res.success) {
        if (res.orders.length === 0) {
          setError(t('errorNotFound'));
        } else {
          // 첫 번째 주문 상세를 미리 조회 — setOrders 전에 setFirstDetail 먼저 세팅해야
          // OrderCard의 useState(!!initialDetail) 초기값이 true로 설정됨
          const detailRes = await lookupOrderDetail(res.orders[0].orderNo, email);
          if (detailRes.success) {
            setFirstDetail(detailRes.order);
          }
          setOrders(res.orders);
        }
      } else {
        setError(res.error === 'REQUIRED' ? t('errorRequired') : t('errorNotFound'));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setOrders(null);
    setFirstDetail(null);
    setError(null);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-charcoal">{t('pageTitle')}</h1>

      {orders ? (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-charcoal-soft">
              {t('orderCount', { name: name.trim(), count: orders.length })}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {t('searchAgain')}
            </button>
          </div>
          <div className="space-y-3">
            {orders.map((order, idx) => (
              <OrderCard
                key={order.orderNo}
                item={order}
                buyerEmail={email}
                initialDetail={idx === 0 ? firstDetail : undefined}
              />
            ))}
            <Link
              href="/artworks"
              className="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {t('viewMoreArtworks')}
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mb-8 text-sm text-charcoal-soft">{t('pageDescription')}</p>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                {t('nameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                {t('emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                {t('phoneLabel')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phonePlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                autoComplete="tel"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y"
              >
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? t('lookingUp') : t('lookupButton')}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
