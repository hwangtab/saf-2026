import { getTranslations } from 'next-intl/server';
import ArtworkGridCard from '@/components/features/ArtworkGridCard';
import WishlistHeartButton from '@/components/features/WishlistHeartButton';
import type { Artwork } from '@/types';

/**
 * 공간·용도 컬렉션 작품 그리드 (Phase 3).
 * EntryLevelArtworks와 동일한 ArtworkGridCard 그리드 패턴 — hydration 0.
 */
export default async function CollectionArtworkGrid({
  artworks,
  locale,
  returnTo,
}: {
  artworks: Artwork[];
  locale: string;
  returnTo: string;
}) {
  const tCard = await getTranslations({ locale, namespace: 'artworkCard' });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
      {artworks.map((artwork) => (
        <ArtworkGridCard
          key={artwork.id}
          artwork={artwork}
          locale={locale}
          returnTo={returnTo}
          untitledLabel={tCard('untitled')}
          unknownArtistLabel={tCard('unknownArtist')}
          pendingInfoLabel={tCard('pendingInfo')}
          originalKoreanDataLabel={tCard('originalKoreanData')}
          soldLabel={tCard('soldBadge')}
          reservedLabel={tCard('reservedBadge')}
          pendingValueLabel={tCard('pendingValue')}
          inquiryValueLabel={tCard('inquiryValue')}
          sizesOverride="(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) calc(33vw - 1.5rem), 280px"
          wishlistSlot={(title) => (
            <WishlistHeartButton artworkId={artwork.id} artworkTitle={title} variant="overlay" />
          )}
        />
      ))}
    </div>
  );
}
