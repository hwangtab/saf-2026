import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import { getEmergingArtworks } from '@/lib/emerging-artists';
import { containsHangul } from '@/lib/search-utils';
import { getMaterialLabel } from '@/lib/artwork-material';
import { cn } from '@/lib/utils/cn';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import type { Artwork } from '@/types';

const ARTWORK_PLACEHOLDER_IMAGE = '/images/og-image.jpg';

/**
 * 신진 작가 발견 영역 [G] — 매뉴얼 6.4 + 9.2 컬렉션 3.
 *
 * 페르소나 B의 "내가 먼저 발견했다" 자긍심 자극. 거장(5명) 제외 작품 풀에서 작가별 1점씩
 * 다양성 dedupe 후 6점 노출. 모바일 2열·태블릿 3열 그리드.
 *
 * **server-rendered card 패턴 (hydration 0)** — 메모리 feedback_hero_server_island_regression.md
 * 원칙(mobile 4× CPU throttle 정적 server card 본질 해결) 부합. ArtworkCategoryGrid InlineGridCard와
 * 동일 패턴으로 inline 정의.
 */
export default async function EmergingArtists({ locale }: { locale: string }) {
  const artworks = await getEmergingArtworks(6);
  if (artworks.length === 0) return null;

  const t = await getTranslations({ locale, namespace: 'home.emergingArtists' });
  const tCard = await getTranslations({ locale, namespace: 'artworkCard' });

  return (
    <Section variant="white" className="py-16 md:py-20">
      <div className="container-max">
        <div className="text-center mb-10 md:mb-12">
          <SectionTitle className="mb-3">{t('title')}</SectionTitle>
          <p className="text-body-large text-charcoal-muted text-balance">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
          {artworks.map((artwork) => (
            <EmergingCard
              key={artwork.id}
              artwork={artwork}
              locale={locale}
              untitledLabel={tCard('untitled')}
              unknownArtistLabel={tCard('unknownArtist')}
              pendingInfoLabel={tCard('pendingInfo')}
              originalKoreanDataLabel={tCard('originalKoreanData')}
              soldLabel={tCard('soldBadge')}
              reservedLabel={tCard('reservedBadge')}
            />
          ))}
        </div>
        {/* viewAll CTA — ArtworkCategoryGrid 카테고리 섹션과 동일 rounded-full 버튼 톤으로 정합. */}
        <div className="mt-10 md:mt-12 flex justify-center">
          <Link
            href="/artworks"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm md:text-base font-semibold border border-charcoal/20 text-charcoal bg-white hover:bg-canvas hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow,background-color] duration-300"
          >
            {t('viewAll')}
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ─── server card (hydration 0) — ArtworkCategoryGrid InlineGridCard 패턴 ──────

function getSafeTitle(artwork: Artwork, untitledLabel: string, locale: string): string {
  return (locale === 'en' && artwork.title_en?.trim()) || artwork.title?.trim() || untitledLabel;
}

function getSafeArtist(artwork: Artwork, unknownArtistLabel: string, locale: string): string {
  return (
    (locale === 'en' && artwork.artist_en?.trim()) || artwork.artist?.trim() || unknownArtistLabel
  );
}

function localizeDataValue(
  value: string | undefined,
  locale: string,
  originalKoreanDataLabel: string
): string | undefined {
  if (!value) return value;
  if (locale !== 'en') return value;
  if (value === '문의') return 'Inquiry';
  if (value === '확인 중') return 'Pending';
  if (/^\s*에디션\s*/.test(value)) return value.replace(/^\s*에디션\s*/, 'Edition ');
  if (containsHangul(value)) return originalKoreanDataLabel;
  return value;
}

function EmergingCard({
  artwork,
  locale,
  untitledLabel,
  unknownArtistLabel,
  pendingInfoLabel,
  originalKoreanDataLabel,
  soldLabel,
  reservedLabel,
}: {
  artwork: Artwork;
  locale: string;
  untitledLabel: string;
  unknownArtistLabel: string;
  pendingInfoLabel: string;
  originalKoreanDataLabel: string;
  soldLabel: string;
  reservedLabel: string;
}) {
  const safeTitle = getSafeTitle(artwork, untitledLabel, locale);
  const safeArtist = getSafeArtist(artwork, unknownArtistLabel, locale);
  const rawMaterial = artwork.material;
  const hasMaterialForAlt =
    rawMaterial &&
    rawMaterial !== '확인 중' &&
    rawMaterial !== 'Pending' &&
    !(locale === 'en' && containsHangul(rawMaterial));
  const altText = hasMaterialForAlt
    ? `${safeTitle}, ${rawMaterial} - ${safeArtist}`
    : `${safeTitle} - ${safeArtist}`;
  const imageSrc = resolveArtworkImageUrlForPreset(
    artwork.images?.[0] || ARTWORK_PLACEHOLDER_IMAGE,
    'card'
  );
  const localizedPrice = localizeDataValue(artwork.price, locale, originalKoreanDataLabel);
  const localizedMaterial = getMaterialLabel(artwork.material, locale);
  const localizedSize = localizeDataValue(artwork.size, locale, originalKoreanDataLabel);
  const isPending = (value: string | undefined) => value === '확인 중' || value === 'Pending';
  const isInquiryPrice = (value: string | undefined) => value === '문의' || value === 'Inquiry';
  const showMaterial = Boolean(artwork.material);
  const showSize = Boolean(artwork.size);
  const viewDetailsAria =
    locale === 'en'
      ? `View ${safeTitle} by ${safeArtist}`
      : `${safeTitle} — ${safeArtist} 자세히 보기`;

  return (
    <Link
      href={`/artworks/${artwork.id}?returnTo=%2F`}
      aria-label={viewDetailsAria}
      className="group block h-full rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative w-full overflow-hidden aspect-[4/5] bg-canvas-soft">
        <div className="absolute inset-3 md:inset-4">
          <SafeImage
            src={imageSrc}
            alt={altText}
            fill
            loading="lazy"
            quality={70}
            sizes="(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) calc(33vw - 1.5rem), 360px"
            className="object-contain"
          />
        </div>
        {artwork.sold && (
          <div className="absolute top-3 right-3 px-3 py-1 text-sm rounded-md shadow-md bg-danger-a11y text-white font-bold">
            {soldLabel}
          </div>
        )}
        {artwork.reserved && !artwork.sold && (
          <div className="absolute top-3 right-3 px-3 py-1 text-sm rounded-md shadow-md bg-charcoal-deep text-white font-bold">
            {reservedLabel}
          </div>
        )}
      </div>
      <div className="relative p-4 bg-white">
        <h3 className="text-base md:text-lg font-bold font-sans transition-colors duration-300 break-keep line-clamp-2 min-h-[3rem] md:min-h-[3.5rem] text-charcoal group-hover:text-primary">
          {safeTitle}
        </h3>
        <p className="text-sm mt-1 truncate text-charcoal-muted">{safeArtist}</p>
        <p className="text-caption-meta mt-2 line-clamp-1 min-h-[1rem]">
          {(() => {
            if (isPending(artwork.material) && isPending(artwork.size)) return pendingInfoLabel;
            if (showMaterial || showSize) {
              return (
                <>
                  {showMaterial && localizedMaterial}
                  {showMaterial && showSize && ' · '}
                  {showSize && localizedSize}
                </>
              );
            }
            return ' ';
          })()}
        </p>
        {localizedPrice && !isInquiryPrice(localizedPrice) ? (
          <p
            className={cn(
              'text-sm font-semibold mt-1',
              artwork.sold
                ? 'text-gray-600 line-through'
                : artwork.reserved
                  ? 'text-gray-500'
                  : 'text-primary-strong'
            )}
          >
            {localizedPrice}
          </p>
        ) : (
          <p className="text-sm font-semibold mt-1 min-h-[1.25rem]"> </p>
        )}
      </div>
    </Link>
  );
}
