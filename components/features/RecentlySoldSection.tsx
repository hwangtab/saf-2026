import { getTranslations } from 'next-intl/server';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkCardData } from '@/types';

interface RecentlySoldSectionProps {
  artworks: ArtworkCardData[];
  locale: 'ko' | 'en';
}

function formatSoldDate(soldAt: string, locale: 'ko' | 'en'): string {
  const date = new Date(soldAt);
  if (locale === 'ko') {
    return `${date.getMonth() + 1}월 ${date.getDate()}일 판매`;
  }
  return `Sold on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default async function RecentlySoldSection({ artworks, locale }: RecentlySoldSectionProps) {
  if (artworks.length === 0) return null;

  const t = await getTranslations('artworkDetail');

  return (
    <div className="mt-24 pt-24 border-t border-gray-100">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-charcoal">{t('recentlySold')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('recentlySoldDesc')}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {artworks.map((artwork) => (
          <div key={artwork.id}>
            <ArtworkCard artwork={artwork} variant="gallery" />
            {artwork.sold_at && (
              <div className="mt-2 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {formatSoldDate(artwork.sold_at, locale)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
