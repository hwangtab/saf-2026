import { notFound } from 'next/navigation';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ artworkId: string; locale: string }>;
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    paymentType?: string;
  }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { artworkId } = await params;
  const { paymentKey, orderId, amount, paymentType } = await searchParams;

  if (!paymentKey || !orderId || !amount) {
    notFound();
  }

  return (
    <SuccessClient
      paymentKey={paymentKey}
      orderId={orderId}
      amount={amount}
      paymentType={paymentType ?? ''}
      artworkId={artworkId}
    />
  );
}
