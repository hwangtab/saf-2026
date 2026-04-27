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

export default async function SuccessPage({ searchParams }: Props) {
  const { paymentKey, orderId, amount } = await searchParams;

  if (!paymentKey || !orderId || !amount) notFound();

  return <SuccessClient paymentKey={paymentKey} orderId={orderId} amount={amount} />;
}
