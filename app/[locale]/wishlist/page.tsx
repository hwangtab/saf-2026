import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
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
    <Section variant="canvas" className="py-16 md:py-24">
      <div className="mb-10">
        <SectionTitle className="text-charcoal">{tWishlist('pageTitle')}</SectionTitle>
      </div>
      <WishlistPageContent
        locale={locale}
        untitledLabel={tCard('untitled')}
        unknownArtistLabel={tCard('unknownArtist')}
        pendingInfoLabel={tCard('pendingInfo')}
        originalKoreanDataLabel={tCard('originalKoreanData')}
        soldLabel={tCard('soldBadge')}
        reservedLabel={tCard('reservedBadge')}
      />
    </Section>
  );
}
