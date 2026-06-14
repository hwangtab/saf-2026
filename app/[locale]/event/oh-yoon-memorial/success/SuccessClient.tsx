'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';

type State = 'loading' | 'ok' | 'error';

export default function SuccessClient() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    async function confirm() {
      const p = new URLSearchParams(window.location.search);
      const paymentKey = p.get('paymentKey');
      const orderId = p.get('orderId');
      const amount = Number(p.get('amount'));
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
        const data = (await res.json()) as { success?: boolean };
        setState(data.success ? 'ok' : 'error');
      } catch {
        setState('error');
      }
    }
    void confirm();
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      {state === 'loading' && <p className="text-charcoal">결제 확인 중입니다...</p>}
      {state === 'ok' && (
        <div>
          <h1 className="font-display text-3xl font-bold text-charcoal-deep">
            신청이 완료되었습니다
          </h1>
          <p className="mt-3 text-charcoal">확인 안내를 알림톡(및 이메일)으로 보내드렸습니다.</p>
          <Link
            href="/event/oh-yoon-memorial"
            className="mt-6 inline-block font-semibold text-primary-strong underline"
          >
            추도식 안내로 돌아가기
          </Link>
        </div>
      )}
      {state === 'error' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            결제 확인에 문제가 있습니다
          </h1>
          <p className="mt-3 text-charcoal">
            잠시 후에도 안내를 받지 못하면 사무국으로 연락 주세요.
          </p>
        </div>
      )}
    </main>
  );
}
