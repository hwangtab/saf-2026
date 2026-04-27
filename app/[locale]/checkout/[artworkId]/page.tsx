import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { getPaymentMode, getTossWidgetClientKey } from '@/lib/integrations/toss/config';
import { parsePrice } from '@/lib/parsePrice';
import { formatPriceForDisplay, resolveArtworkImageUrl } from '@/lib/utils';
import CheckoutClient from './CheckoutClient';

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
  params: Promise<{ artworkId: string; locale: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { artworkId, locale } = await params;

  if (locale === 'en') {
    notFound();
  }

  if (getPaymentMode() !== 'toss') {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();

  const { data: artwork, error } = await adminClient
    .from('artworks')
    .select('id, title, price, status, images, artists(name_ko)')
    .eq('id', artworkId)
    .eq('is_hidden', false)
    .single();

  if (error) {
    console.error('Checkout artwork fetch error:', error);
  }

  if (!artwork) {
    notFound();
  }

  if (artwork.status === 'sold' || artwork.status === 'reserved') {
    redirect(`/artworks/${artworkId}`);
  }

  const price = parsePrice(artwork.price);
  if (!Number.isFinite(price) || price <= 0) {
    notFound();
  }

  const firstImage: string | undefined = Array.isArray(artwork.images)
    ? artwork.images[0]
    : undefined;
  const imageUrl = firstImage ? resolveArtworkImageUrl(firstImage) : '';

  const displayPrice = formatPriceForDisplay(artwork.price);
  const artistRow = artwork.artists as { name_ko: string } | { name_ko: string }[] | null;
  const artistName = Array.isArray(artistRow)
    ? (artistRow[0]?.name_ko ?? 'Unknown Artist')
    : (artistRow?.name_ko ?? 'Unknown Artist');

  const widgetClientKey = getTossWidgetClientKey();
  if (!widgetClientKey) {
    notFound();
  }

  return (
    <CheckoutClient
      artworkId={artworkId}
      artworkTitle={artwork.title}
      artist={artistName}
      price={price}
      displayPrice={displayPrice}
      imageUrl={imageUrl}
      locale="ko"
      widgetClientKey={widgetClientKey}
    />
  );
}
