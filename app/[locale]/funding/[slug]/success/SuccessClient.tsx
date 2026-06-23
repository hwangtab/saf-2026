'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * 후원 결제 완료 랜딩 — Toss 리다이렉트 후 confirm 호출 클라이언트.
 *
 * 결제 식별자는 server searchParams가 아니라 window.location.search에서 직접 읽는다
 * (Next.js 16 미들웨어 rewrite query 유실 회귀 방지).
 */
export default function SuccessClient() {
  const t = useTranslations('funding');
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    void (async () => {
      const sp = new URLSearchParams(window.location.search);
      const paymentKey = sp.get('paymentKey');
      const orderId = sp.get('orderId');
      const amount = sp.get('amount');

      if (!paymentKey || !orderId || !amount) {
        setState('fail');
        return;
      }

      try {
        const r = await fetch('/api/payments/funding/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
        });
        const j = (await r.json()) as { success?: boolean };
        setState(r.ok && j.success ? 'ok' : 'fail');
      } catch {
        setState('fail');
      }
    })();
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
        <p className="text-sm text-charcoal-soft">{t('confirming')}</p>
      </div>
    );
  }

  if (state === 'fail') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-danger/20 bg-canvas-soft p-10 text-center shadow-sm">
          <p className="mb-4 text-4xl text-danger">!</p>
          <p className="text-base font-semibold text-charcoal">{t('confirmFail')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-canvas-soft p-10 text-center shadow-sm">
        <p className="mb-4 text-5xl text-primary">✓</p>
        <h1 className="mb-2 text-2xl font-bold text-charcoal-deep">{t('thankYou')}</h1>
        <p className="text-sm text-charcoal-muted">{t('thankYouDesc')}</p>
      </div>
    </div>
  );
}
