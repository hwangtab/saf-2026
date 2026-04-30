'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import LinkButton from '@/components/ui/LinkButton';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { formatPriceForDisplay } from '@/lib/utils';
import { formatUsd } from '@/lib/utils/currency';

interface Props {
  paymentKey: string;
  orderId: string;
  amount: string;
  currency: 'KRW' | 'USD';
  /** 'BANK_TRANSFER' for manual NH 농협 무통장 입금 안내 */
  method: string;
}

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  dueDate: string;
}

type PageState = 'loading' | 'success' | 'virtual' | 'bank_transfer' | 'error';

function formatAmount(amount: number, currency: 'KRW' | 'USD'): string {
  return currency === 'USD' ? formatUsd(amount) : formatPriceForDisplay(amount);
}

function formatDeadline(locale: string): string {
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (locale === 'ko') {
    const m = deadline.getMonth() + 1;
    const d = deadline.getDate();
    const hh = String(deadline.getHours()).padStart(2, '0');
    const mm = String(deadline.getMinutes()).padStart(2, '0');
    return `${m}월 ${d}일 ${hh}:${mm}`;
  }
  return deadline.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function SuccessClient({ paymentKey, orderId, amount, currency, method }: Props) {
  const t = useTranslations('checkout');
  const tOrder = useTranslations('orderLookup');
  const locale = useLocale();

  const deadline = useMemo(() => formatDeadline(locale), [locale]);
  const [state, setPageState] = useState<PageState>('loading');
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    // 무통장 계좌이체 흐름은 Toss confirm 호출 없이 바로 안내 페이지 노출
    if (method === 'BANK_TRANSFER') {
      setPageState('bank_transfer');
      return;
    }

    async function confirm() {
      try {
        const res = await fetch('/api/payments/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          alreadyPaid?: boolean;
          status?: string;
          virtualAccount?: VirtualAccount | null;
          error?: string;
        };

        if (!res.ok || !data.success) {
          setErrorMessage(data.error ?? t('confirmationError'));
          setPageState('error');
          return;
        }

        if (data.alreadyPaid || data.status === 'DONE') {
          setPageState('success');
        } else if (data.status === 'WAITING_FOR_DEPOSIT') {
          setVirtualAccount(data.virtualAccount ?? null);
          setPageState('virtual');
        } else {
          setPageState('success');
        }
      } catch {
        setErrorMessage(t('networkError'));
        setPageState('error');
      }
    }

    void confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
        <p className="text-sm text-gray-500">{t('confirmingPayment')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
      >
        <div className="max-w-lg w-full mx-auto px-4 text-center">
          <div className="rounded-2xl border border-danger/20 bg-white p-10 shadow-sm">
            <p className="text-4xl mb-4">!</p>
            <h1 className="text-xl font-bold text-charcoal mb-2">{t('confirmationFailed')}</h1>
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <LinkButton href="/artworks" variant="primary" size="sm">
              {t('backToArtworks')}
            </LinkButton>
          </div>
        </div>
      </div>
    );
  }

  // 무통장 계좌이체 — 우리 계좌번호 안내 (NH 농협 / 한국스마트협동조합)
  if (state === 'bank_transfer') {
    return (
      <div
        className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
      >
        <div className="max-w-lg w-full mx-auto px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
            <p className="text-4xl mb-4">🏦</p>
            <h1 className="text-2xl font-bold text-charcoal mb-2">{t('bankTransferTitle')}</h1>
            <p className="text-sm text-gray-500 mb-8">{t('bankTransferGuide')}</p>

            <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('depositBankName')}</span>
                <span className="font-semibold text-charcoal">{t('bankTransferBank')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('depositAccountNumber')}</span>
                <span className="font-semibold text-charcoal font-mono">
                  {t('bankTransferAccount')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('bankTransferHolder')}</span>
                <span className="font-semibold text-charcoal">{t('bankTransferHolderName')}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
                <span className="text-gray-500">{t('orderNo')}</span>
                <span className="font-mono font-semibold text-charcoal">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('depositAmount')}</span>
                <span className="font-bold text-primary-a11y">
                  {formatAmount(Number(amount), currency)}
                </span>
              </div>
            </div>

            <div className="text-xs text-charcoal-soft mb-6 space-y-1">
              <p>{t('bankTransferNoticeName')}</p>
              <p>{t('bankTransferNoticeDeadline', { deadline })}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkButton href="/artworks" variant="primary" size="sm" className="px-6 py-3">
                {t('browseMore')}
              </LinkButton>
              <LinkButton href="/orders" variant="white" size="sm" className="px-6 py-3">
                {tOrder('viewOrders')}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'virtual' && virtualAccount) {
    return (
      <div
        className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
      >
        <div className="max-w-lg w-full mx-auto px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
            <p className="text-4xl mb-4">🏦</p>
            <h1 className="text-2xl font-bold text-charcoal mb-2">{t('waitingDeposit')}</h1>
            <p className="text-sm text-gray-500 mb-8">{t('depositInstructions')}</p>

            <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('depositBankName')}</span>
                <span className="font-semibold text-charcoal">{virtualAccount.bankName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('depositAccountNumber')}</span>
                <span className="font-semibold text-charcoal font-mono">
                  {virtualAccount.accountNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('depositDeadline')}</span>
                <span className="font-semibold text-charcoal">{virtualAccount.dueDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('depositAmount')}</span>
                <span className="font-bold text-primary-a11y">
                  {formatAmount(Number(amount), currency)}
                </span>
              </div>
            </div>

            <p className="text-xs text-charcoal-soft mb-6">{t('depositEmailNotice')}</p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkButton href="/artworks" variant="primary" size="sm" className="px-6 py-3">
                {t('browseMore')}
              </LinkButton>
              <LinkButton href="/orders" variant="white" size="sm" className="px-6 py-3">
                {tOrder('viewOrders')}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div
      className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <p className="text-5xl mb-4">✓</p>
          <h1 className="text-2xl font-bold text-charcoal mb-2">{t('paymentSuccess')}</h1>
          <p className="text-sm text-gray-500 mb-8">{t('successThankYou')}</p>

          <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('orderNo')}</span>
              <span className="font-mono font-semibold text-charcoal">{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('paymentAmount')}</span>
              <span className="font-bold text-primary-a11y">
                {formatAmount(Number(amount), currency)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <LinkButton href="/artworks" variant="primary" size="sm" className="px-6 py-3">
              {t('browseMore')}
            </LinkButton>
            <LinkButton href="/orders" variant="white" size="sm" className="px-6 py-3">
              {tOrder('viewOrders')}
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
