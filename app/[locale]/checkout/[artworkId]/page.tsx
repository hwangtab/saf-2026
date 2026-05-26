import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { getPaymentMode, getTossDomesticClientKey } from '@/lib/integrations/toss/config';
import { parsePrice } from '@/lib/parsePrice';
import { formatPriceForDisplay, resolveArtworkImageUrl } from '@/lib/utils';
import CheckoutClient from './CheckoutClient';
import OverseasCheckoutClient from './OverseasCheckoutClient';

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

  if (getPaymentMode() !== 'toss') {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const prefillName = user?.user_metadata?.name ?? '';
  const prefillEmail = user?.email ?? '';

  const { data: artwork, error } = await adminClient
    .from('artworks')
    .select('id, title, title_en, price, status, images, artists(name_ko, name_en)')
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
  const artistRow = artwork.artists as
    | { name_ko: string; name_en: string | null }
    | { name_ko: string; name_en: string | null }[]
    | null;
  const isEnglish = locale === 'en';
  // 영문 페이지에서 영문 표기 우선, 없으면 한국어 fallback
  const pickArtistName = (row: { name_ko: string; name_en: string | null } | undefined) =>
    isEnglish
      ? row?.name_en?.trim() || row?.name_ko || 'Unknown Artist'
      : (row?.name_ko ?? 'Unknown Artist');
  const artistName = Array.isArray(artistRow)
    ? pickArtistName(artistRow[0])
    : pickArtistName(artistRow ?? undefined);
  const artworkTitle = isEnglish ? artwork.title_en?.trim() || artwork.title : artwork.title;

  const clientKey = getTossDomesticClientKey();
  if (!clientKey) {
    notFound();
  }

  if (locale !== 'ko') {
    return (
      <OverseasCheckoutClient
        artworkId={artworkId}
        artworkTitle={artworkTitle}
        artist={artistName}
        price={price}
        displayPrice={displayPrice}
        imageUrl={imageUrl}
        clientKey={clientKey}
        prefillName={prefillName}
        prefillEmail={prefillEmail}
      />
    );
  }

  return (
    <CheckoutClient
      artworkId={artworkId}
      artworkTitle={artworkTitle}
      artist={artistName}
      price={price}
      displayPrice={displayPrice}
      imageUrl={imageUrl}
      clientKey={clientKey}
      prefillName={prefillName}
      prefillEmail={prefillEmail}
    />
  );
}
