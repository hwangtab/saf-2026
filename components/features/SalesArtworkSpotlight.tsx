'use client';

import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { useLocale } from 'next-intl';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import { trackEvent } from '@/lib/analytics/track';
import { buildArtworkAlt } from '@/lib/artwork-alt';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';
import type { ArtworkListItem } from '@/types';

type SpotlightTone = 'light' | 'dark';

interface SalesArtworkSpotlightProps {
  artworks: ArtworkListItem[];
  title: string;
  description: string;
  eyebrow?: string;
  ctaLabel: string;
  allHref?: string;
  source: string;
  storySlug?: string;
  placement?: string;
  tone?: SpotlightTone;
  className?: string;
}

export default function SalesArtworkSpotlight({
  artworks,
  title,
  description,
  eyebrow,
  ctaLabel,
  allHref = '/artworks',
  source,
  storySlug,
  placement = 'sales_spotlight',
  tone = 'light',
  className,
}: SalesArtworkSpotlightProps) {
  const locale = useLocale();
  const isEnglish = locale === 'en';
  const visibleArtworks = artworks
    .filter((artwork) => !artwork.sold && !artwork.reserved)
    .slice(0, 5);

  if (visibleArtworks.length === 0) return null;

  const isDark = tone === 'dark';

  function getPriceBand(price: string | number | null | undefined): string {
    const numeric = Number(String(price ?? '').replace(/[^\d]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) return 'inquiry';
    if (numeric < 500_000) return 'under_500k';
    if (numeric < 1_000_000) return '500k_1m';
    if (numeric < 3_000_000) return '1m_3m';
    if (numeric < 10_000_000) return '3m_10m';
    return 'over_10m';
  }

  function trackClick(artwork: ArtworkListItem, position: number) {
    trackEvent('sales_artwork_spotlight_click', {
      source,
      story_slug: storySlug ?? null,
      artwork_id: artwork.id,
      artwork_title: artwork.title,
      artist: artwork.artist,
      position,
      placement,
      price_band: getPriceBand(artwork.price),
    });
  }

  function trackAllClick() {
    trackEvent('sales_artwork_spotlight_all_click', {
      source,
      story_slug: storySlug ?? null,
      placement,
      artwork_count: visibleArtworks.length,
    });
  }

  return (
    <section
      className={clsx(
        'overflow-hidden rounded-2xl border',
        isDark
          ? 'border-white/15 bg-white/[0.06] text-white'
          : 'border-gallery-hairline bg-white text-charcoal-deep shadow-sm',
        className
      )}
      aria-label={title}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(240px,0.85fr)_1.7fr]">
        <div
          className={clsx(
            'flex flex-col justify-between gap-6 p-6 md:p-8',
            isDark
              ? 'border-b border-white/15 lg:border-b-0 lg:border-r'
              : 'border-b border-gray-100 lg:border-b-0 lg:border-r'
          )}
        >
          <div>
            {eyebrow && (
              <p
                className={clsx(
                  'mb-3 text-[10px] font-semibold uppercase tracking-widest',
                  isDark ? 'text-primary-soft' : 'text-primary-strong'
                )}
              >
                {eyebrow}
              </p>
            )}
            <h2 className="font-display text-2xl font-black leading-tight text-balance md:text-3xl">
              {title}
            </h2>
            <p
              className={clsx(
                'mt-3 text-sm leading-relaxed break-keep',
                isDark ? 'text-white/72' : 'text-charcoal-muted'
              )}
            >
              {description}
            </p>
          </div>
          <Link
            href={allHref}
            onClick={trackAllClick}
            className={clsx(
              'inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors',
              isDark
                ? 'bg-white text-charcoal-deep hover:bg-primary-soft'
                : 'bg-charcoal-deep text-white hover:bg-charcoal'
            )}
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-px bg-gray-100 sm:grid-cols-2 lg:grid-cols-3">
          {visibleArtworks.slice(0, 3).map((artwork, index) => {
            const titleText = isEnglish && artwork.title_en ? artwork.title_en : artwork.title;
            const artistText = isEnglish && artwork.artist_en ? artwork.artist_en : artwork.artist;
            const imageUrl = resolveArtworkImageUrl(artwork.images[0] ?? '');
            const alt = buildArtworkAlt(
              {
                title: titleText,
                artist: artistText,
                material: artwork.material,
                year: artwork.year,
              },
              isEnglish ? 'en' : 'ko'
            );

            return (
              <Link
                key={artwork.id}
                href={`/artworks/${artwork.id}`}
                onClick={() => trackClick(artwork, index)}
                className={clsx(
                  'group flex min-h-[320px] flex-col bg-white transition-colors hover:bg-canvas-soft',
                  isDark && 'bg-charcoal-deep/95 hover:bg-charcoal'
                )}
              >
                <div className="relative aspect-square overflow-hidden bg-canvas-soft">
                  {imageUrl ? (
                    <SafeImage
                      src={imageUrl}
                      alt={alt}
                      fill
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-charcoal/10">
                      SAF
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full border border-gray-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-success-a11y shadow-sm">
                    {isEnglish ? 'Available' : '구매 가능'}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className={clsx('text-xs', isDark ? 'text-white/60' : 'text-charcoal-muted')}>
                    {artistText}
                  </p>
                  <h3
                    className={clsx(
                      'mt-1 line-clamp-2 text-base font-bold transition-colors group-hover:text-primary-strong',
                      isDark ? 'text-white' : 'text-charcoal-deep'
                    )}
                  >
                    {titleText}
                  </h3>
                  <p className="mt-auto pt-3 text-sm font-black text-primary-strong">
                    {artwork.price}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
