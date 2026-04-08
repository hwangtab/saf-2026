'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { formatPriceForDisplay } from '@/lib/utils';
import { lookupOrders, lookupOrderDetail } from '@/app/actions/order-lookup';
import type { OrderListItem, OrderPublicInfo } from '@/app/actions/order-lookup';

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

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('orderLookup');
  const info = STATUS_STYLES[status];
  if (!info) return null;
  return (
    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold', info.className)}>
      {t(info.label as Parameters<typeof t>[0])}
    </span>
  );
}

function OrderDetail({ order }: { order: OrderPublicInfo }) {
  const t = useTranslations('orderLookup');
  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      {/* 가상계좌 입금 안내 */}
      {order.status === 'awaiting_deposit' && order.virtualAccount && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="mb-2 font-semibold text-amber-900">{t('virtualAccountInfo')}</p>
          <div className="space-y-1.5">
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
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">{t('orderNo')}</span>
          <span className="font-mono text-charcoal">{order.orderNo}</span>
        </div>
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

      {/* 배송 정보 */}
      <div className="space-y-2 border-t border-gray-100 pt-3 text-sm">
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

      {/* 금액 내역 */}
      <div className="space-y-2 border-t border-gray-100 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">{t('artworkAmount')}</span>
          <span className="text-charcoal">{formatPriceForDisplay(order.itemAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('shippingFee')}</span>
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
    </div>
  );
}

function OrderCard({ item, buyerEmail }: { item: OrderListItem; buyerEmail: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<OrderPublicInfo | null>(null);

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
      <button type="button" onClick={handleToggle} className="w-full text-left" disabled={loading}>
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
            <p className="mt-0.5 text-xs text-gray-400">{formatKstDate(item.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge status={item.status} />
            <span className="text-xs text-gray-400">{loading ? '...' : open ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {open && detail && <OrderDetail order={detail} />}
    </div>
  );
}

export default function OrderLookup() {
  const t = useTranslations('orderLookup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrders(null);

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
          setOrders(res.orders);
        }
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
          <label className="block text-sm font-medium text-charcoal mb-1.5">{t('nameLabel')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus:border-primary focus:outline-none"
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
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus:border-primary focus:outline-none"
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
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-charcoal placeholder-gray-400 focus:border-primary focus:outline-none"
            autoComplete="tel"
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

      {orders && (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.orderNo} item={order} buyerEmail={email} />
          ))}
          <Link
            href="/artworks"
            className="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            작품 더 보기
          </Link>
        </div>
      )}
    </div>
  );
}
