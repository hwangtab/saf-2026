'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { formatPriceForDisplay } from '@/lib/utils';

interface Props {
  paymentKey: string;
  orderId: string;
  amount: string;
  paymentType: string;
  artworkId: string;
  locale: 'ko' | 'en';
}

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  dueDate: string;
}

type PageState = 'loading' | 'success' | 'virtual' | 'error';

export default function SuccessClient({ paymentKey, orderId, amount, locale }: Props) {
  const isKo = locale === 'ko';

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
          setErrorMessage(
            data.error ?? (isKo ? '결제 확인에 실패했습니다.' : 'Payment confirmation failed.')
          );
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
        setErrorMessage(isKo ? '네트워크 오류가 발생했습니다.' : 'A network error occurred.');
        setPageState('error');
      }
    }

    void confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">
          {isKo ? '결제를 확인하는 중...' : 'Confirming your payment...'}
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="rounded-2xl border border-red-100 bg-white p-10 shadow-sm">
            <p className="text-4xl mb-4">!</p>
            <h1 className="text-xl font-bold text-charcoal mb-2">
              {isKo ? '결제 확인 실패' : 'Payment Confirmation Failed'}
            </h1>
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <Link
              href="/artworks"
              className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              {isKo ? '작품 목록으로' : 'Browse Artworks'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'virtual' && virtualAccount) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
            <p className="text-4xl mb-4">🏦</p>
            <h1 className="text-2xl font-bold text-charcoal mb-2">
              {isKo ? '입금 대기 중입니다' : 'Awaiting Deposit'}
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              {isKo
                ? '아래 가상 계좌로 입금해주세요. 입금이 확인되면 주문이 완료됩니다.'
                : 'Please deposit to the virtual account below. Your order will be confirmed upon receipt.'}
            </p>

            <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isKo ? '은행' : 'Bank'}</span>
                <span className="font-semibold text-charcoal">{virtualAccount.bankName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isKo ? '계좌번호' : 'Account'}</span>
                <span className="font-semibold text-charcoal font-mono">
                  {virtualAccount.accountNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isKo ? '입금 기한' : 'Due by'}</span>
                <span className="font-semibold text-charcoal">{virtualAccount.dueDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{isKo ? '입금액' : 'Amount'}</span>
                <span className="font-bold text-primary-a11y">
                  {formatPriceForDisplay(Number(amount))}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              {isKo
                ? '입금 확인 후 별도 이메일로 안내 드립니다.'
                : 'You will be notified by email once the deposit is confirmed.'}
            </p>

            <Link
              href="/artworks"
              className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              {isKo ? '작품 더 둘러보기' : 'Browse More Artworks'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-lg mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <p className="text-5xl mb-4">✓</p>
          <h1 className="text-2xl font-bold text-charcoal mb-2">
            {isKo ? '결제가 완료되었습니다' : 'Payment Complete'}
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {isKo
              ? '작품 구매에 참여해주셔서 감사합니다. 구매 확인 이메일이 발송됩니다.'
              : 'Thank you for your purchase. A confirmation email will be sent shortly.'}
          </p>

          <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{isKo ? '주문 번호' : 'Order No.'}</span>
              <span className="font-mono font-semibold text-charcoal">{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{isKo ? '결제 금액' : 'Amount Paid'}</span>
              <span className="font-bold text-primary-a11y">
                {formatPriceForDisplay(Number(amount))}
              </span>
            </div>
          </div>

          <Link
            href="/artworks"
            className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            {isKo ? '작품 더 둘러보기' : 'Browse More Artworks'}
          </Link>
        </div>
      </div>
    </div>
  );
}
