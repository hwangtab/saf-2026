import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import {
  SAWTOOTH_TOP_SAFE_PADDING,
  SAWTOOTH_BOTTOM_SAFE_PADDING,
} from '@/components/ui/SawtoothDivider';
import WishlistPageContent from '@/components/features/WishlistPageContent';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'wishlist' });
  return {
    title: t('pageTitle'),
    robots: { index: false },
  };
}

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tCard = await getTranslations({ locale, namespace: 'artworkCard' });
  const tWishlist = await getTranslations({ locale, namespace: 'wishlist' });

  return (
    <div className={`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}`}>
      <PageHero title={tWishlist('pageTitle')} description={tWishlist('pageDescription')} />
      <div className={`${SAWTOOTH_BOTTOM_SAFE_PADDING} pb-10 md:pb-16`}>
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <WishlistPageContent
            locale={locale}
            untitledLabel={tCard('untitled')}
            unknownArtistLabel={tCard('unknownArtist')}
            pendingInfoLabel={tCard('pendingInfo')}
            originalKoreanDataLabel={tCard('originalKoreanData')}
            soldLabel={tCard('soldBadge')}
            reservedLabel={tCard('reservedBadge')}
            pendingValueLabel={tCard('pendingValue')}
            inquiryValueLabel={tCard('inquiryValue')}
          />
        </div>
      </div>
    </div>
  );
}
