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
  }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) notFound();

  // en 로케일 = PayPal/USD, ko = 국내/KRW
  const currency: 'KRW' | 'USD' = locale === 'en' ? 'USD' : 'KRW';

  return (
    <SuccessClient paymentKey={paymentKey} orderId={orderId} amount={amount} currency={currency} />
  );
}
