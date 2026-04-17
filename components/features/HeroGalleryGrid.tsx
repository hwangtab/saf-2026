'use client';

import { useLocale, useTranslations } from 'next-intl';
import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import type { Artwork } from '@/types';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';

interface HeroGalleryGridProps {
  artworks: Artwork[];
}

export default function HeroGalleryGrid({ artworks }: HeroGalleryGridProps) {
  const locale = useLocale();
  const t = useTranslations('artworkCard');

  if (artworks.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-1.5">
      {artworks.map((artwork, index) => {
        const title = (locale === 'en' && artwork.title_en?.trim()) || artwork.title;
        const artist = (locale === 'en' && artwork.artist_en?.trim()) || artwork.artist;
        const imageSrc = resolveArtworkImageUrlForPreset(
          artwork.images?.[0] || '/images/og-image.png',
          'card'
        );
        const isInquiry = artwork.price === '문의' || artwork.price === 'Inquiry';

        return (
          <Link
            key={artwork.id}
            href={`/artworks/${artwork.id}`}
            className="group relative block overflow-hidden bg-canvas-soft"
          >
            <div className="relative aspect-[3/4]">
              <div className="absolute inset-3 md:inset-4">
                <SafeImage
                  src={imageSrc}
                  alt={`${title} - ${artist}`}
                  fill
                  priority={index < 4}
                  className="object-contain"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            </div>

            {/* Always-visible bottom info overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-10 pb-3">
              <p className="text-white font-semibold text-sm line-clamp-2 leading-snug">{title}</p>
              <p className="text-white/70 text-xs mt-0.5 truncate">{artist}</p>
              {artwork.material && (
                <p className="text-white/60 text-xs mt-0.5 truncate">{artwork.material}</p>
              )}
              {!isInquiry && artwork.price && (
                <p className="text-sun text-xs font-semibold mt-1">{artwork.price}</p>
              )}
            </div>

            {artwork.sold && (
              <div className="absolute top-2 right-2 bg-danger-a11y text-white text-xs font-bold px-2 py-0.5 rounded">
                {t('soldBadge')}
              </div>
            )}
            {artwork.reserved && !artwork.sold && (
              <div className="absolute top-2 right-2 bg-sun text-white text-xs font-bold px-2 py-0.5 rounded">
                {t('reservedBadge')}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
