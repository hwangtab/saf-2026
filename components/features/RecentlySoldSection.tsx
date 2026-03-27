import { getTranslations } from 'next-intl/server';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkCardData } from '@/types';

interface RecentlySoldSectionProps {
  artworks: ArtworkCardData[];
  totalCount: number;
}

export default async function RecentlySoldSection({
  artworks,
  totalCount,
}: RecentlySoldSectionProps) {
  if (artworks.length === 0) return null;

  const t = await getTranslations('artworkDetail');

  return (
    <div className="mt-24 pt-24 border-t border-gray-100">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-charcoal">{t('recentlySold')}</h2>
        {totalCount > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {t('recentlySoldDesc', { count: totalCount })}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} variant="gallery" />
        ))}
      </div>
    </div>
  );
}
