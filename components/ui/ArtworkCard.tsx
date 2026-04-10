'use client';

import { memo, useRef, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import SafeImage from '@/components/common/SafeImage';
import type { ArtworkCardData } from '@/types';
import { cn, resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { containsHangul } from '@/lib/search-utils';

type ArtworkCardVariant = 'gallery' | 'slider';
type ArtworkCardTheme = 'light' | 'dark';

interface ArtworkCardProps {
  artwork: ArtworkCardData;
  variant?: ArtworkCardVariant;
  theme?: ArtworkCardTheme;
  returnTo?: string;
  className?: string;
  priorityIndex?: number;
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

const getSafeTitle = (artwork: ArtworkCardData, untitledLabel: string, locale?: string) =>
  (locale === 'en' && artwork.title_en?.trim()) || artwork.title?.trim() || untitledLabel;
const getSafeArtist = (artwork: ArtworkCardData, unknownArtistLabel: string, locale?: string) =>
  (locale === 'en' && artwork.artist_en?.trim()) || artwork.artist?.trim() || unknownArtistLabel;

const getImageSrc = (artwork: ArtworkCardData, variant: ArtworkCardVariant) =>
  resolveArtworkImageUrlForPreset(
    artwork.images?.[0] || ARTWORK_PLACEHOLDER_IMAGE,
    variant === 'slider' ? 'slider' : 'card'
  );
const getImageAlt = (
  artwork: ArtworkCardData,
  untitledLabel: string,
  unknownArtistLabel: string,
  locale?: string
) => {
  const title = getSafeTitle(artwork, untitledLabel, locale);
  const artist = getSafeArtist(artwork, unknownArtistLabel, locale);
  // 재료 정보가 있고 미확인이 아닌 경우 alt에 포함 (영어 locale에서 한글 재료는 제외)
  const rawMaterial = artwork.material;
  const hasMaterial =
    rawMaterial &&
    rawMaterial !== '확인 중' &&
    rawMaterial !== 'Pending' &&
    !(locale === 'en' && containsHangul(rawMaterial));
  return hasMaterial ? `${title}, ${rawMaterial} - ${artist}` : `${title} - ${artist}`;
};

function SoldBadge({ variant }: { variant: ArtworkCardVariant }) {
  return (
    <div
      className={cn('absolute bg-red-600 text-white font-bold', VARIANT_CONFIG[variant].soldBadge)}
    >
      SOLD
    </div>
  );
}

function ReservedBadge({ variant }: { variant: ArtworkCardVariant }) {
  return (
    <div
      className={cn(
        'absolute bg-amber-500 text-white font-bold',
        VARIANT_CONFIG[variant].soldBadge
      )}
    >
      예약중
    </div>
  );
}

function formatSoldDate(soldAt: string, locale: string): string {
  const d = new Date(soldAt);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (locale === 'en') {
    return `Sold ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return `${y}.${m}.${day} 판매`;
}

function SoldDateBadge({
  soldAt,
  variant,
  locale,
}: {
  soldAt: string;
  variant: ArtworkCardVariant;
  locale: string;
}) {
  const posClass =
    variant === 'gallery'
      ? 'top-3 left-3 px-2.5 py-1 text-xs'
      : 'top-2 left-2 px-2 py-0.5 text-[10px]';
  return (
    <div
      className={cn(
        'absolute bg-black/60 backdrop-blur-sm text-white font-medium rounded',
        posClass
      )}
    >
      {formatSoldDate(soldAt, locale)}
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
  priorityIndex,
}: ArtworkCardProps) {
  const locale = useLocale();
  const t = useTranslations('artworkCard');
  const config = VARIANT_CONFIG[variant];
  const isAboveFold =
    variant === 'gallery' && typeof priorityIndex === 'number' && priorityIndex < 3;

  const imageContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;

    const img = container.querySelector('img');
    if (!img) return;

    const hideShimmer = () => {
      const shimmer = container.querySelector('.shimmer-loading') as HTMLElement | null;
      if (shimmer) shimmer.style.display = 'none';
    };

    if (img.complete && img.naturalWidth > 0) {
      hideShimmer();
      return;
    }

    img.addEventListener('load', hideShimmer, { once: true });
    return () => img.removeEventListener('load', hideShimmer);
  }, []);
  const isDisplayable = (value: string | undefined): value is string => Boolean(value);

  const untitledLabel = t('untitled');
  const unknownArtistLabel = t('unknownArtist');
  const pendingInfoLabel = t('pendingInfo');
  const originalKoreanDataLabel = t('originalKoreanData');
  const isPending = (value: string | undefined) => value === '확인 중' || value === 'Pending';
  const isInquiryPrice = (value: string | undefined) => value === '문의' || value === 'Inquiry';
  const localizeDataValue = (value: string | undefined) => {
    if (!value) return value;
    if (locale !== 'en') return value;
    if (value === '문의') return 'Inquiry';
    if (value === '확인 중') return 'Pending';
    if (containsHangul(value)) return originalKoreanDataLabel;
    return value;
  };

  const localizedPrice = localizeDataValue(artwork.price);
  const localizedMaterial = localizeDataValue(artwork.material);
  const localizedSize = localizeDataValue(artwork.size);

  const showMaterial = isDisplayable(artwork.material);
  const showSize = isDisplayable(artwork.size);

  if (variant === 'slider') {
    return (
      <Link
        href={getHref(artwork, returnTo)}
        className={cn(
          'flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] group transition-transform duration-300 hover:-translate-y-1',
          className
        )}
      >
        <div
          className={cn(
            'relative aspect-square overflow-hidden rounded-lg shadow-sm group-hover:shadow-xl transition-shadow duration-300',
            theme === 'dark' ? 'bg-charcoal' : 'bg-primary-surface'
          )}
        >
          <div className="absolute inset-2">
            <SafeImage
              src={getImageSrc(artwork, variant)}
              alt={getImageAlt(artwork, untitledLabel, unknownArtistLabel, locale)}
              fill
              className="object-contain"
              sizes={config.imageSizes}
            />
          </div>
          {artwork.sold && <SoldBadge variant="slider" />}
          {artwork.reserved && !artwork.sold && <ReservedBadge variant="slider" />}
          {artwork.sold && artwork.sold_at && (
            <SoldDateBadge soldAt={artwork.sold_at} variant="slider" locale={locale} />
          )}
        </div>
        <div className="mt-3 px-1">
          <p className="text-sm font-medium text-charcoal truncate group-hover:text-primary transition-colors">
            {getSafeTitle(artwork, untitledLabel, locale)}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {getSafeArtist(artwork, unknownArtistLabel, locale)}
          </p>
          <p className="text-sm font-semibold text-charcoal mt-1">{localizedPrice}</p>
        </div>
      </Link>
    );
  }

  // Gallery variant (default)
  const artistHref = `/artworks/artist/${encodeURIComponent(artwork.artist)}`;
  return (
    <div
      className={cn(
        'bg-gray-100 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl group rounded-lg overflow-hidden',
        className
      )}
    >
      {/* 이미지 영역만 작품 상세 링크로 감쌈 — 작가명 링크와 중첩 방지 */}
      <Link href={getHref(artwork, returnTo)} className="block">
        <div
          ref={imageContainerRef}
          className={cn(
            'relative w-full overflow-hidden aspect-[4/5]',
            theme === 'dark' ? 'bg-charcoal' : 'bg-canvas-soft'
          )}
        >
          <div className="absolute inset-0 shimmer-loading" />
          <div className="absolute inset-3 md:inset-4">
            <SafeImage
              src={getImageSrc(artwork, variant)}
              alt={getImageAlt(artwork, untitledLabel, unknownArtistLabel, locale)}
              loading={isAboveFold ? 'eager' : 'lazy'}
              priority={isAboveFold}
              fill
              className="object-contain"
              sizes={config.imageSizes}
            />
          </div>
          <div
            className={cn(
              'absolute inset-0 transition-colors duration-300 pointer-events-none',
              theme === 'dark'
                ? 'bg-black/0 group-hover:bg-black/0'
                : 'bg-black/0 group-hover:bg-black/20'
            )}
          />
          {artwork.sold && <SoldBadge variant="gallery" />}
          {artwork.reserved && !artwork.sold && <ReservedBadge variant="gallery" />}
          {artwork.sold && artwork.sold_at && (
            <SoldDateBadge soldAt={artwork.sold_at} variant="gallery" locale={locale} />
          )}
        </div>
      </Link>

      <div className={cn('p-4', theme === 'dark' ? 'bg-charcoal' : 'bg-white')}>
        <h2
          className={cn(
            'text-lg font-bold font-sans transition-colors duration-300 break-keep line-clamp-2 min-h-[3.5rem]',
            theme === 'dark'
              ? 'text-white group-hover:text-sun'
              : 'text-charcoal group-hover:text-primary'
          )}
        >
          <Link href={getHref(artwork, returnTo)} className="hover:underline">
            {getSafeTitle(artwork, untitledLabel, locale)}
          </Link>
        </h2>
        <p
          className={cn(
            'text-sm mt-1 min-h-[1.25rem]',
            theme === 'dark' ? 'text-white/75' : 'text-charcoal-muted'
          )}
        >
          {/* 작가명 → 작가 페이지 링크: 카테고리/아티스트 페이지 간 내부 링크 강화 */}
          <Link
            href={artistHref}
            className={cn(
              'hover:underline transition-colors',
              theme === 'dark' ? 'hover:text-white' : 'hover:text-primary'
            )}
          >
            {getSafeArtist(artwork, unknownArtistLabel, locale)}
          </Link>
        </p>
        <p
          className={cn(
            'text-xs mt-2 line-clamp-1 min-h-[1rem]',
            theme === 'dark' ? 'text-white/55' : 'text-charcoal-soft'
          )}
        >
          {(() => {
            if (isPending(artwork.material) && isPending(artwork.size)) {
              return pendingInfoLabel;
            }
            if (showMaterial || showSize) {
              return (
                <>
                  {showMaterial && localizedMaterial}
                  {showMaterial && showSize && ' · '}
                  {showSize && localizedSize}
                </>
              );
            }
            return '\u00A0';
          })()}
        </p>

        {localizedPrice && !isInquiryPrice(localizedPrice) ? (
          <p
            className={cn(
              'text-sm font-semibold mt-1',
              artwork.sold
                ? theme === 'dark'
                  ? 'text-white/50 line-through'
                  : 'text-gray-600 line-through'
                : artwork.reserved
                  ? theme === 'dark'
                    ? 'text-white/70'
                    : 'text-gray-500'
                  : theme === 'dark'
                    ? 'text-sun'
                    : 'text-primary'
            )}
          >
            {localizedPrice}
          </p>
        ) : (
          <p className="text-sm font-semibold mt-1 min-h-[1.25rem]">{'\u00A0'}</p>
        )}
      </div>
    </div>
  );
}

export default memo(ArtworkCard);
