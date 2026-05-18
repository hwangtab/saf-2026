import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ artworkId: string; locale: string }>;
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    /** 'BANK_TRANSFER' for manual 기업은행 무통장 입금 (Toss 거치지 않음) */
    method?: string;
    /** 'KRW' | 'USD' — 결제 통화. 영문 페이지 PayPal=USD, Card/easyPay/Transfer=KRW */
    currency?: string;
  }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { paymentKey, orderId, amount, method, currency: currencyParam } = await searchParams;

  // 무통장 계좌이체는 Toss 결제 거치지 않으므로 paymentKey 없음. orderId+amount만 검증
  const isBankTransfer = method === 'BANK_TRANSFER';
  if (isBankTransfer) {
    if (!orderId || !amount) notFound();
    // SEC: 임의 orderId로 SAF 브랜드 계좌 안내 화면을 위조하는 피싱 방지.
    // 실제 DB에 awaiting_deposit 상태로 존재하는 주문인지 확인 후 렌더.
    const supabase = createSupabaseAdminClient();
    const { data: bankOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('order_no', orderId)
      .eq('status', 'awaiting_deposit')
      .maybeSingle();
    if (!bankOrder) notFound();
  } else {
    if (!paymentKey || !orderId || !amount) notFound();
  }

  // currency 쿼리 우선 — 영문 페이지에서 결제수단별로 다름 (PayPal=USD, 그 외=KRW).
  // 쿼리 없을 때만 locale 기반 fallback. 무통장은 항상 KRW.
  const currency: 'KRW' | 'USD' = isBankTransfer
    ? 'KRW'
    : currencyParam === 'USD'
      ? 'USD'
      : currencyParam === 'KRW'
        ? 'KRW'
        : locale === 'en'
          ? 'USD'
          : 'KRW';

  return (
    <SuccessClient
      paymentKey={paymentKey ?? ''}
      orderId={orderId!}
      amount={amount!}
      currency={currency}
      method={method ?? ''}
    />
  );
}
