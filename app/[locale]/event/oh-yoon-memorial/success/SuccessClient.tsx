'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';

type State = 'loading' | 'ok' | 'soldOutRefunded' | 'refunded' | 'manualReview' | 'error';

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
      {state === 'soldOutRefunded' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            정원이 마감되어 결제를 취소했습니다
          </h1>
          <p className="mt-3 text-charcoal">
            결제 승인은 자동 취소·환불 처리했습니다. 카드사 반영까지 시간이 걸릴 수 있습니다.
          </p>
          <Link
            href="/event/oh-yoon-memorial"
            className="mt-6 inline-block font-semibold text-primary-strong underline"
          >
            추도식 안내로 돌아가기
          </Link>
        </div>
      )}
      {state === 'refunded' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            신청 확정 중 문제가 있어 결제를 취소했습니다
          </h1>
          <p className="mt-3 text-charcoal">
            결제 승인은 자동 취소·환불 처리했습니다. 잠시 후 다시 신청해 주세요.
          </p>
          <Link
            href="/event/oh-yoon-memorial"
            className="mt-6 inline-block font-semibold text-primary-strong underline"
          >
            추도식 안내로 돌아가기
          </Link>
        </div>
      )}
      {state === 'manualReview' && (
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal-deep">
            결제 확인을 수동으로 처리 중입니다
          </h1>
          <p className="mt-3 text-charcoal">
            신청 확정에 실패했고 자동환불도 완료되지 않았습니다. 사무국에서 결제 내역을
            확인하겠습니다.
          </p>
        </div>
      )}
    </main>
  );
}
