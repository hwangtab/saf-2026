'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { formatPriceForDisplay } from '@/lib/utils';
import { lookupOrder } from '@/app/actions/order-lookup';
import type { OrderPublicInfo } from '@/app/actions/order-lookup';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'statusPendingPayment', className: 'bg-gray-100 text-gray-600' },
  awaiting_deposit: { label: 'statusAwaitingDeposit', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'statusPaid', className: 'bg-blue-100 text-blue-700' },
  preparing: { label: 'statusPreparing', className: 'bg-indigo-100 text-indigo-700' },
  shipped: { label: 'statusShipped', className: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'statusDelivered', className: 'bg-green-100 text-green-700' },
  completed: { label: 'statusCompleted', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'statusCancelled', className: 'bg-red-100 text-red-700' },
  refunded: { label: 'statusRefunded', className: 'bg-red-100 text-red-700' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: '신용/체크카드',
  TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  MOBILE_PHONE: '휴대폰결제',
};

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

function OrderResult({ order }: { order: OrderPublicInfo }) {
  const t = useTranslations('orderLookup');
  const statusInfo = STATUS_STYLES[order.status];

  return (
    <div className="mt-8 space-y-4">
      {/* 주문 상태 헤더 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{t('orderNo')}</p>
            <p className="mt-0.5 font-mono font-semibold text-charcoal">{order.orderNo}</p>
          </div>
          {statusInfo && (
            <span
              className={clsx('rounded-full px-3 py-1 text-sm font-semibold', statusInfo.className)}
            >
              {t(statusInfo.label as Parameters<typeof t>[0])}
            </span>
          )}
        </div>
      </div>

      {/* 작품 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {order.artworkImage && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <SafeImage
                src={order.artworkImage}
                alt={order.artworkTitle}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{order.artistName}</p>
            <p className="mt-0.5 font-semibold text-charcoal truncate">{order.artworkTitle}</p>
          </div>
        </div>
      </div>

      {/* 가상계좌 입금 안내 */}
      {order.status === 'awaiting_deposit' && order.virtualAccount && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-amber-900">{t('virtualAccountInfo')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-amber-700">{t('bankName')}</span>
              <span className="font-semibold text-amber-900">{order.virtualAccount.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-700">{t('accountNumber')}</span>
              <span className="font-mono font-semibold text-amber-900">
                {order.virtualAccount.accountNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-700">{t('dueDate')}</span>
              <span className="font-semibold text-amber-900">{order.virtualAccount.dueDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* 주문 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-charcoal">{t('orderInfo')}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('orderDate')}</span>
            <span className="text-charcoal">{formatKstDate(order.createdAt)}</span>
          </div>
          {order.paymentMethod && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t('paymentMethod')}</span>
              <span className="text-charcoal">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
              </span>
            </div>
          )}
          {order.paidAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t('paymentDate')}</span>
              <span className="text-charcoal">{formatKstDate(order.paidAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 배송 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-charcoal">{t('shippingInfo')}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('recipient')}</span>
            <span className="text-charcoal">{order.shippingName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="shrink-0 text-gray-500">{t('address')}</span>
            <span className="text-right text-charcoal">
              {order.shippingAddress}
              {order.shippingAddressDetail && ` ${order.shippingAddressDetail}`}
            </span>
          </div>
        </div>
      </div>

      {/* 금액 내역 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-charcoal">{t('amountInfo')}</h3>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 text-gray-600">{t('artworkAmount')}</td>
              <td className="py-2 text-right font-medium text-charcoal">
                {formatPriceForDisplay(order.itemAmount)}
              </td>
            </tr>
            <tr>
              <td className="py-2 text-gray-600">{t('shippingFee')}</td>
              <td className="py-2 text-right font-medium text-charcoal">
                {order.shippingAmount === 0
                  ? t('freeShipping')
                  : formatPriceForDisplay(order.shippingAmount)}
              </td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-charcoal">{t('totalAmount')}</td>
              <td className="py-2 text-right text-lg font-bold text-primary-a11y">
                {formatPriceForDisplay(order.totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Link
        href="/artworks"
        className="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        작품 더 보기
      </Link>
    </div>
  );
}

export default function OrderLookup() {
  const t = useTranslations('orderLookup');
  const [orderNo, setOrderNo] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderPublicInfo | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!orderNo.trim() || !email.trim()) {
      setError(t('errorRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await lookupOrder(orderNo, email);
      if (res.success) {
        setResult(res.order);
      } else {
        setError(res.error === 'REQUIRED' ? t('errorRequired') : t('errorNotFound'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-charcoal">{t('pageTitle')}</h1>
      <p className="mb-8 text-sm text-gray-500">{t('pageDescription')}</p>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            {t('orderNoLabel')}
          </label>
          <input
            type="text"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder={t('orderNoPlaceholder')}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus:border-primary focus:outline-none"
            autoComplete="off"
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
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus:border-primary focus:outline-none"
            autoComplete="email"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t('lookingUp') : t('lookupButton')}
        </button>
      </form>

      {result && <OrderResult order={result} />}
    </div>
  );
}
