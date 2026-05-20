import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { containsHangul } from '@/lib/search-utils';
import { getMaterialLabel } from '@/lib/artwork-material';
import { getMediumLabel } from '@/lib/medium-labels';
import { cn } from '@/lib/utils/cn';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import WishlistHeartButton from '@/components/features/WishlistHeartButton';
import type { Artwork } from '@/types';

const ARTWORK_PLACEHOLDER_IMAGE = '/images/og-image.jpg';

interface ArtworkGridCardProps {
  artwork: Artwork;
  locale: string;
  /** 카드 클릭 시 detail에서 돌아갈 경로. URL-encoded value, 예: '%2F' (홈) */
  returnTo?: string;
  /** artworkCard namespace 라벨 — 호출처에서 useTranslations/getTranslations로 한 번만 풀어 prop 전달. */
  untitledLabel: string;
  unknownArtistLabel: string;
  pendingInfoLabel: string;
  originalKoreanDataLabel: string;
  soldLabel: string;
  reservedLabel: string;
  pendingValueLabel: string;
  inquiryValueLabel: string;
  /** 그리드 너비 컨텍스트별 sizes 오버라이드. 미지정 시 일반 3열 gallery 기본값 적용. */
  sizesOverride?: string;
}

/**
 * 작품 카드 server component — hydration 0.
 *
 * `'use client'` ArtworkCard(useState/useEffect로 image decode·shimmer)가
 * `feedback_hero_server_island_regression.md` 원칙(mobile 4× CPU throttle 정적 server card 본질 해결)을
 * 위배하던 회귀를 해소. EntryLevelArtworks·EmergingArtists·작품 detail Other Works/Same Category 등
 * 메인·detail 그리드 공통으로 사용하는 server-rendered 카드.
 *
 * Sprint 4b/4c에서 각 컴포넌트 안에 inline 복제됐던 패턴을 Sprint 6에서 단일 컴포넌트로 추출.
 * 호출처는 i18n 라벨을 prop으로 주입(useTranslations 한 번만) — `'use client'` 회피.
 */
export default function ArtworkGridCard({
  artwork,
  locale,
  returnTo,
  untitledLabel,
  unknownArtistLabel,
  pendingInfoLabel,
  originalKoreanDataLabel,
  soldLabel,
  reservedLabel,
  pendingValueLabel,
  inquiryValueLabel,
  sizesOverride,
}: ArtworkGridCardProps) {
  const safeTitle = getSafeTitle(artwork, untitledLabel, locale);
  const safeArtist = getSafeArtist(artwork, unknownArtistLabel, locale);
  // 매뉴얼 5.8 매체별 진품 라벨 — ArtworkCard와 동일 위치(좌상단). sold/reserved 시 우상단 배지와
  // 겹치지 않게 좌상단. sold일 때는 라벨 자동 숨김 (배지는 그대로).
  const mediumLabel = getMediumLabel({
    category: artwork.category,
    edition: artwork.edition,
    edition_type: artwork.edition_type,
  });
  const showMediumLabel = mediumLabel && !artwork.sold;
  const mediumLabelText = locale === 'en' ? mediumLabel?.en : mediumLabel?.ko;
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
  const localizedPrice = localizeDataValue(
    artwork.price,
    locale,
    originalKoreanDataLabel,
    pendingValueLabel,
    inquiryValueLabel
  );
  const localizedMaterial = getMaterialLabel(artwork.material, locale);
  const localizedSize = localizeDataValue(
    artwork.size,
    locale,
    originalKoreanDataLabel,
    pendingValueLabel,
    inquiryValueLabel
  );
  const isPending = (value: string | undefined) => value === '확인 중' || value === 'Pending';
  const isInquiryPrice = (value: string | undefined) => value === '문의' || value === 'Inquiry';
  const showMaterial = Boolean(artwork.material);
  const showSize = Boolean(artwork.size);
  const viewDetailsAria =
    locale === 'en'
      ? `View ${safeTitle} by ${safeArtist}`
      : `${safeTitle} — ${safeArtist} 자세히 보기`;
  const href = returnTo
    ? `/artworks/${artwork.id}?returnTo=${returnTo}`
    : `/artworks/${artwork.id}`;

  return (
    <Link
      href={href}
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
            sizes={
              sizesOverride ??
              '(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) calc(33vw - 1.5rem), 320px'
            }
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
        {showMediumLabel && (
          <div className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase rounded bg-canvas-soft/95 backdrop-blur-sm text-charcoal-deep shadow-sm">
            {mediumLabelText}
          </div>
        )}
        <WishlistHeartButton artworkId={artwork.id} artworkTitle={safeTitle} variant="overlay" />
      </div>
      <div className="relative p-4 bg-white">
        <h3 className="text-base md:text-lg font-bold font-sans transition-colors duration-300 break-keep line-clamp-2 min-h-[3rem] md:min-h-[3.5rem] text-charcoal group-hover:text-primary-strong">
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
                  ? 'text-charcoal-soft'
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
  originalKoreanDataLabel: string,
  pendingValueLabel: string,
  inquiryValueLabel: string
): string | undefined {
  if (!value) return value;
  if (locale !== 'en') return value;
  if (value === '문의') return inquiryValueLabel;
  if (value === '확인 중') return pendingValueLabel;
  if (/^\s*에디션\s*/.test(value)) return value.replace(/^\s*에디션\s*/, 'Edition ');
  if (containsHangul(value)) return originalKoreanDataLabel;
  return value;
}
