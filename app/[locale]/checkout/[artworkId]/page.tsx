import { notFound, redirect } from 'next/navigation';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { getPaymentMode } from '@/lib/integrations/toss/config';
import { parsePrice } from '@/lib/parsePrice';
import { formatPriceForDisplay } from '@/lib/utils';
import CheckoutClient from './CheckoutClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ artworkId: string; locale: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { artworkId, locale } = await params;

  if (getPaymentMode() !== 'toss') {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();

  const { data: artwork } = await adminClient
    .from('artworks')
    .select('id, title, artist, price, status, images')
    .eq('id', artworkId)
    .single();

  if (!artwork) {
    notFound();
  }

  if (artwork.status === 'sold') {
    redirect(`/artworks/${artworkId}`);
  }

  const price = parsePrice(artwork.price);
  if (!Number.isFinite(price) || price <= 0) {
    notFound();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const firstImage: string | undefined = Array.isArray(artwork.images)
    ? artwork.images[0]
    : undefined;
  const imageUrl = firstImage
    ? `${supabaseUrl}/storage/v1/object/public/artworks/${firstImage}`
    : '';

  const displayPrice = formatPriceForDisplay(artwork.price);

  return (
    <CheckoutClient
      artworkId={artworkId}
      artworkTitle={artwork.title}
      artist={artwork.artist}
      price={price}
      displayPrice={displayPrice}
      imageUrl={imageUrl}
      locale={locale === 'en' ? 'en' : 'ko'}
    />
  );
}
