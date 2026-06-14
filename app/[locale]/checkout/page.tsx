import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getPaymentMode, getTossDomesticClientKey } from '@/lib/integrations/toss/config';
import CartCheckoutClient from './CartCheckoutClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'en' ? 'Checkout' : '결제',
    robots: { index: false, follow: false },
  };
}

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * 다품목(장바구니) 결제 셸.
 *
 * 카트는 클라이언트(localStorage/Supabase) 상태이므로 작품 데이터는 클라이언트에서
 * `getCartArtworks`로 로드한다. 셸은 Toss clientKey만 서버에서 주입한다.
 * 단건 바로구매(`/checkout/[artworkId]`)와 별개의 신규 경로이며, 둘 다 동일한
 * `createOrder` / Toss `requestPayment` 흐름을 재사용한다.
 */
export default async function CartCheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (getPaymentMode() !== 'toss') {
    notFound();
  }

  const clientKey = getTossDomesticClientKey();
  if (!clientKey) {
    notFound();
  }

  return <CartCheckoutClient locale={locale} clientKey={clientKey} />;
}
