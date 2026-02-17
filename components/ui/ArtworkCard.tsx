import { memo } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import type { ArtworkCardData } from '@/types';
import { cn, resolveArtworkImageUrlForPreset } from '@/lib/utils';

type ArtworkCardVariant = 'gallery' | 'slider';

interface ArtworkCardProps {
  artwork: ArtworkCardData;
  variant?: ArtworkCardVariant;
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

const getHref = (artwork: ArtworkCardData) => `/artworks/${artwork.id}`;
const getImageSrc = (artwork: ArtworkCardData, variant: ArtworkCardVariant) =>
  resolveArtworkImageUrlForPreset(artwork.images[0], variant === 'slider' ? 'slider' : 'card');
const getImageAlt = (artwork: ArtworkCardData) => `${artwork.title} - ${artwork.artist}`;

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
function ArtworkCard({ artwork, variant = 'gallery', className }: ArtworkCardProps) {
  const config = VARIANT_CONFIG[variant];
  const isDisplayable = (value: string | undefined): value is string => Boolean(value);
  const showMaterial = isDisplayable(artwork.material);
  const showSize = isDisplayable(artwork.size);

  if (variant === 'slider') {
    return (
      <Link
        href={getHref(artwork)}
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
            {artwork.title}
          </p>
          <p className="text-xs text-gray-500 truncate">{artwork.artist}</p>
          <p className="text-sm font-semibold text-charcoal mt-1">{artwork.price}</p>
        </div>
      </Link>
    );
  }

  // Gallery variant (default)
  return (
    <div className="bg-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group rounded-lg overflow-hidden">
      <Link href={getHref(artwork)} className="block h-full">
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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
          {artwork.sold && <SoldBadge variant="gallery" />}
        </div>

        <div className="p-4 bg-white">
          <h2 className="text-lg font-bold text-charcoal font-sans group-hover:text-primary transition-colors duration-300 break-keep line-clamp-2 min-h-[3.5rem]">
            {artwork.title}
          </h2>
          <p className="text-sm text-charcoal-muted mt-1 min-h-[1.25rem]">{artwork.artist}</p>
          <p className="text-xs text-charcoal-soft mt-2 line-clamp-1 min-h-[1rem]">
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
              className={`text-sm font-semibold mt-1 ${artwork.sold ? 'text-gray-600 line-through' : 'text-primary'}`}
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
