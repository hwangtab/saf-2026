'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';

type State = 'loading' | 'ok' | 'soldOutRefunded' | 'refunded' | 'manualReview' | 'error';

export default function SuccessClient() {
  const t = useTranslations('event.ohYoonMemorial');
  const [state, setState] = useState<State>('loading');
  const [orderNo, setOrderNo] = useState<string | null>(null);

  useEffect(() => {
    async function confirm() {
      const p = new URLSearchParams(window.location.search);
      const paymentKey = p.get('paymentKey');
      const orderId = p.get('orderId');
      const amount = Number(p.get('amount'));
      if (orderId) setOrderNo(orderId);
      if (!paymentKey || !orderId || !amount) {
        setState('error');
        return;
      }
      try {
        const res = await fetch('/api/payments/event/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (data.success) {
          setState('ok');
        } else if (data.error === 'sold_out_refunded') {
          setState('soldOutRefunded');
        } else if (data.error === 'confirm_failed_refunded') {
          setState('refunded');
        } else if (data.error === 'auto_refund_failed') {
          setState('manualReview');
        } else {
          setState('error');
        }
      } catch {
        setState('error');
      }
    }
    void confirm();
  }, []);

  return (
    <main
      className={`flex min-h-screen items-center justify-center bg-canvas-soft px-4 text-center ${HEADER_SAFE_TOP_PADDING} ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      {state === 'loading' && <p className="text-charcoal">{t('resultConfirming')}</p>}
      {state === 'ok' && (
        <div>
          <h1 className="font-display text-3xl font-bold text-charcoal-deep">
            {t('resultDoneTitle')}
          </h1>
          <p className="mt-3 text-charcoal">{t('resultDoneBody')}</p>
          {orderNo && (
            <p className="mt-3 text-sm text-charcoal-muted">
              {t('resultOrderNoLabel')}{' '}
              <span className="font-semibold text-charcoal-deep">{orderNo}</span>
              <br />
              <span className="text-xs">{t('resultOrderNoHint')}</span>
            </p>
          )}
          <div className="mt-6 flex flex-col items-center gap-2">
            <Link
              href="/event/oh-yoon-memorial"
              className="font-semibold text-primary-strong underline"
            >
              {t('resultBackToInfo')}
            </Link>
            <Link
              href="/event/oh-yoon-memorial/manage"
              className="text-sm text-charcoal-muted underline"
            >
              {t('resultManageLink')}
            </Link>
          </div>
        </div>
      )}
      {state === 'error' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            {t('resultErrorTitle')}
          </h1>
          <p className="mt-3 text-charcoal">{t('resultErrorBody')}</p>
        </div>
      )}
      {state === 'soldOutRefunded' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            {t('resultSoldOutTitle')}
          </h1>
          <p className="mt-3 text-charcoal">{t('resultSoldOutBody')}</p>
          <Link
            href="/event/oh-yoon-memorial"
            className="mt-6 inline-block font-semibold text-primary-strong underline"
          >
            {t('resultBackToInfo')}
          </Link>
        </div>
      )}
      {state === 'refunded' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            {t('resultRefundedTitle')}
          </h1>
          <p className="mt-3 text-charcoal">{t('resultRefundedBody')}</p>
          <Link
            href="/event/oh-yoon-memorial"
            className="mt-6 inline-block font-semibold text-primary-strong underline"
          >
            {t('resultBackToInfo')}
          </Link>
        </div>
      )}
      {state === 'manualReview' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            {t('resultManualReviewTitle')}
          </h1>
          <p className="mt-3 text-charcoal">{t('resultManualReviewBody')}</p>
        </div>
      )}
    </main>
  );
}
