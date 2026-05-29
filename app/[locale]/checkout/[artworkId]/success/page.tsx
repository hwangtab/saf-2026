import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
  const { artworkId, locale } = await params;
  const { paymentKey, orderId, amount, method, currency: currencyParam } = await searchParams;

  // query 누락 시 404 대신 작품 상세로 redirect — 일부 환경에서 RSC re-fetch가
  // query를 잃은 채 success 페이지를 두 번째 호출하는 사고를 사용자에게 가시화하지 않음.
  // 피싱 방지는 아래 DB 조회로 별도 보장.
  const localePrefix = locale === 'en' ? '/en' : '';
  if (!orderId || !amount) {
    redirect(`${localePrefix}/artworks/${artworkId}`);
  }

  // 무통장 계좌이체는 Toss 결제 거치지 않으므로 paymentKey 없음. orderId+amount만 검증
  const isBankTransfer = method === 'BANK_TRANSFER';
  if (isBankTransfer) {
    // SEC: 임의 orderId로 SAF 브랜드 계좌 안내 화면을 위조하는 피싱 방지.
    // awaiting_deposit/paid 상태 둘 다 허용 — paid 상태도 입금 완료 안내 화면 노출 정당.
    const supabase = createSupabaseAdminClient();
    const { data: bankOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('order_no', orderId)
      .in('status', ['awaiting_deposit', 'paid', 'preparing'])
      .maybeSingle();
    if (!bankOrder) {
      // 주문 자체가 없거나 cancelled — 위조 시도 또는 만료. 404 노출 대신 작품 상세로.
      redirect(`${localePrefix}/artworks/${artworkId}`);
    }
  } else {
    if (!paymentKey) {
      redirect(`${localePrefix}/artworks/${artworkId}`);
    }
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
