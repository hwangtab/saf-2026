'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatPriceForDisplay } from '@/lib/utils';

interface Props {
  paymentKey: string;
  orderId: string;
  amount: string;
  paymentType: string;
  artworkId: string;
}

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  dueDate: string;
}

type PageState = 'loading' | 'success' | 'virtual' | 'error';

export default function SuccessClient({ paymentKey, orderId, amount }: Props) {
  const t = useTranslations('checkout');
  const tOrder = useTranslations('orderLookup');

  const [state, setPageState] = useState<PageState>('loading');
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
      <div className="flex min-h-screen items-center justify-center pt-24">
        <p className="text-gray-500">{t('confirmingPayment')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16 pb-16">
        <div className="max-w-lg w-full mx-auto px-4 text-center">
          <div className="rounded-2xl border border-red-100 bg-white p-10 shadow-sm">
            <p className="text-4xl mb-4">!</p>
            <h1 className="text-xl font-bold text-charcoal mb-2">{t('confirmationFailed')}</h1>
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <Link
              href="/artworks"
              className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              {t('backToArtworks')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'virtual' && virtualAccount) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16 pb-16">
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
                  {formatPriceForDisplay(Number(amount))}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6">{t('depositEmailNotice')}</p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/artworks"
                className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
              >
                {t('browseMore')}
              </Link>
              <Link
                href="/orders"
                className="inline-block rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-charcoal hover:bg-gray-50"
              >
                {tOrder('viewOrders')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16 pb-16">
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
                {formatPriceForDisplay(Number(amount))}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/artworks"
              className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              {t('browseMore')}
            </Link>
            <Link
              href="/orders"
              className="inline-block rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-charcoal hover:bg-gray-50"
            >
              {tOrder('viewOrders')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
