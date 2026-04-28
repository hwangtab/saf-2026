import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
    /** 'BANK_TRANSFER' for manual NH 농협 무통장 입금 (Toss 거치지 않음) */
    method?: string;
  }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { paymentKey, orderId, amount, method } = await searchParams;

  // 무통장 계좌이체는 Toss 결제 거치지 않으므로 paymentKey 없음. orderId+amount만 검증
  const isBankTransfer = method === 'BANK_TRANSFER';
  if (isBankTransfer) {
    if (!orderId || !amount) notFound();
  } else {
    if (!paymentKey || !orderId || !amount) notFound();
  }

  // en 로케일 = PayPal/USD, ko = 국내/KRW (무통장은 항상 KRW)
  const currency: 'KRW' | 'USD' = locale === 'en' ? 'USD' : 'KRW';

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
