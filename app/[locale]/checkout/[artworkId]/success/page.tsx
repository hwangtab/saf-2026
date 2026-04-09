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
    paymentType?: string;
    method?: string;
  }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { artworkId } = await params;
  const { paymentKey, orderId, amount, paymentType, method } = await searchParams;

  const isBankTransfer = method === 'BANK_TRANSFER';

  if (isBankTransfer) {
    if (!orderId || !amount) notFound();
  } else {
    if (!paymentKey || !orderId || !amount) notFound();
  }

  return (
    <SuccessClient
      paymentKey={paymentKey ?? ''}
      orderId={orderId!}
      amount={amount!}
      paymentType={paymentType ?? ''}
      artworkId={artworkId}
      method={method ?? ''}
    />
  );
}
