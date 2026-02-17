import { memo } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import type { ArtworkCardData } from '@/types';
import { cn, resolveArtworkImageUrlForPreset } from '@/lib/utils';

type ArtworkCardVariant = 'gallery' | 'slider';
type ArtworkCardTheme = 'light' | 'dark';

interface ArtworkCardProps {
  artwork: ArtworkCardData;
  variant?: ArtworkCardVariant;
  theme?: ArtworkCardTheme;
  returnTo?: string;
  className?: string;
}

const VARIANT_CONFIG = {
  slider: {
    imageSizes: '(max-width: 640px) 160px, (max-width: 768px) 180px, 200px',
    soldBadge: 'top-2 right-2 px-2 py-0.5 text-xs rounded',
  },
  gallery: {
    imageSizes:
      '(max-width: 768px) calc(100vw - 2rem), (max-width: 1024px) calc(50vw - 1.5rem), calc(33vw - 1rem)',
    soldBadge: 'top-3 right-3 px-3 py-1 text-sm rounded-md shadow-md',
  },
} as const;

const getHref = (artwork: ArtworkCardData, returnTo?: string) => {
  const base = `/artworks/${artwork.id}`;
  if (!returnTo) return base;
  return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
};
const ARTWORK_PLACEHOLDER_IMAGE = '/images/og-image.png';

const getSafeTitle = (artwork: ArtworkCardData) => artwork.title?.trim() || '무제';
const getSafeArtist = (artwork: ArtworkCardData) => artwork.artist?.trim() || '작가 미상';

const getImageSrc = (artwork: ArtworkCardData, variant: ArtworkCardVariant) =>
  resolveArtworkImageUrlForPreset(
    artwork.images?.[0] || ARTWORK_PLACEHOLDER_IMAGE,
    variant === 'slider' ? 'slider' : 'card'
  );
const getImageAlt = (artwork: ArtworkCardData) =>
  `${getSafeTitle(artwork)} - ${getSafeArtist(artwork)}`;

function SoldBadge({ variant }: { variant: ArtworkCardVariant }) {
  return (
    <div
      className={cn('absolute bg-red-600 text-white font-bold', VARIANT_CONFIG[variant].soldBadge)}
    >
      SOLD
    </div>
  );
}

/**
 * Shared artwork card component with two variants:
 * - gallery: Full card for MasonryGallery with material/size info
 * - slider: Compact card for RelatedArtworksSlider
 */
function ArtworkCard({
  artwork,
  variant = 'gallery',
  theme = 'light',
  returnTo,
  className,
}: ArtworkCardProps) {
  const config = VARIANT_CONFIG[variant];
  const isDisplayable = (value: string | undefined): value is string => Boolean(value);
  const showMaterial = isDisplayable(artwork.material);
  const showSize = isDisplayable(artwork.size);

  if (variant === 'slider') {
    return (
      <Link
        href={getHref(artwork, returnTo)}
        className={cn(
          'flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] group transition-all duration-300 hover:-translate-y-1',
          className
        )}
      >
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-sm group-hover:shadow-xl transition-all duration-300">
          <SafeImage
            src={getImageSrc(artwork, variant)}
            alt={getImageAlt(artwork)}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes={config.imageSizes}
          />
          {artwork.sold && <SoldBadge variant="slider" />}
        </div>
        <div className="mt-3 px-1">
          <p className="text-sm font-medium text-charcoal truncate group-hover:text-primary transition-colors">
            {getSafeTitle(artwork)}
          </p>
          <p className="text-xs text-gray-500 truncate">{getSafeArtist(artwork)}</p>
          <p className="text-sm font-semibold text-charcoal mt-1">{artwork.price}</p>
        </div>
      </Link>
    );
  }

  // Gallery variant (default)
  return (
    <div
      className={cn(
        'bg-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group rounded-lg overflow-hidden',
        className
      )}
    >
      <Link href={getHref(artwork, returnTo)} className="block h-full">
        <div className="relative w-full overflow-hidden aspect-[4/5]">
          <div className="absolute inset-0 shimmer-loading" />
          <SafeImage
            src={getImageSrc(artwork, variant)}
            alt={getImageAlt(artwork)}
            loading="lazy"
            fill
            className="object-cover transform transition-transform duration-300 group-hover:scale-105"
            sizes={config.imageSizes}
          />
          <div
            className={cn(
              'absolute inset-0 transition-colors duration-300 pointer-events-none',
              theme === 'dark'
                ? 'bg-black/0 group-hover:bg-black/0'
                : 'bg-black/0 group-hover:bg-black/20'
            )}
          />
          {artwork.sold && <SoldBadge variant="gallery" />}
        </div>

        <div className={cn('p-4', theme === 'dark' ? 'bg-[#1f2527]' : 'bg-white')}>
          <h2
            className={cn(
              'text-lg font-bold font-sans transition-colors duration-300 break-keep line-clamp-2 min-h-[3.5rem]',
              theme === 'dark'
                ? 'text-white group-hover:text-brand-sun'
                : 'text-charcoal group-hover:text-primary'
            )}
          >
            {getSafeTitle(artwork)}
          </h2>
          <p
            className={cn(
              'text-sm mt-1 min-h-[1.25rem]',
              theme === 'dark' ? 'text-white/75' : 'text-charcoal-muted'
            )}
          >
            {getSafeArtist(artwork)}
          </p>
          <p
            className={cn(
              'text-xs mt-2 line-clamp-1 min-h-[1rem]',
              theme === 'dark' ? 'text-white/55' : 'text-charcoal-soft'
            )}
          >
            {(() => {
              const isPending = (v: string | undefined) => v === '확인 중';
              if (isPending(artwork.material) && isPending(artwork.size)) {
                return '상세 정보 준비 중';
              }
              if (showMaterial || showSize) {
                return (
                  <>
                    {showMaterial && artwork.material}
                    {showMaterial && showSize && ' · '}
                    {showSize && artwork.size}
                  </>
                );
              }
              return '\u00A0';
            })()}
          </p>

          {artwork.price && artwork.price !== '문의' ? (
            <p
              className={cn(
                'text-sm font-semibold mt-1',
                artwork.sold
                  ? theme === 'dark'
                    ? 'text-white/50 line-through'
                    : 'text-gray-600 line-through'
                  : theme === 'dark'
                    ? 'text-brand-sun'
                    : 'text-primary'
              )}
            >
              {artwork.price}
            </p>
          ) : (
            <p className="text-sm font-semibold mt-1 min-h-[1.25rem]">{'\u00A0'}</p>
          )}
        </div>
      </Link>
    </div>
  );
}

export default memo(ArtworkCard);
