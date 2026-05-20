import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import SectionTitle from '@/components/ui/SectionTitle';
import { containsHangul } from '@/lib/search-utils';
import { getMaterialLabel } from '@/lib/artwork-material';
import { getMediumLabel } from '@/lib/medium-labels';
import { cn } from '@/lib/utils/cn';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import WishlistHeartButton from '@/components/features/WishlistHeartButton';
import type { Artwork } from '@/types';

/**
 * ArtworkCategoryGrid — 홈 카테고리별(회화·판화·사진/미디어·입체/공예) 정적 SSR 그리드.
 *
 * `ArtworkHighlightSlider` (embla-carousel-react + embla-carousel-auto-scroll, 4개 × 12 카드
 * client hydration) 폐기 후속. mobile 4x CPU throttle에서 main thread 1100ms 블록을 만들던
 * 4× embla 인스턴스 + AutoScroll RAF + ArtworkCard memo hydration을 정적 server-rendered
 * 그리드로 치환.
 *
 * 회귀 trauma 4종(server island overlay / idleCallback / DOM enhance / font preload:false)을
 * 모두 회피하는 본질 패턴 — commit 50c363e6 + e0a7f0f0(HeroSpotlight→HomeHero+NowShowing)와
 * 동일 접근의 fold-below 확장. 모리아.
 *
 * 노출 카드:
 * - mobile: 4점 (`grid-cols-2`, viewport 좁아 6점+는 스크롤 비용 증가)
 * - desktop: 8점 (`md:grid-cols-4`, 2 row × 4 col)
 * - 그리드 하단에 "전체 보기 →" CTA 카드(임팩트 강조) — 슬라이드 swipe 어포던스 보완
 *
 * 카드는 client component(ArtworkCard) 대신 그리드 전용 server card(InlineGridCard)를 인라인 정의.
 * hover translate/shadow는 CSS 전환만 사용해 hydration 0 유지.
 */
export default async function ArtworkCategoryGrid({
  locale,
  artworks,
  title,
  viewAllHref,
  theme = 'light',
}: {
  locale: string;
  artworks: Artwork[];
  title: string;
  viewAllHref: string;
  theme?: 'dark' | 'light';
}) {
  if (artworks.length === 0) return null;

  const tCard = await getTranslations({ locale, namespace: 'artworkCard' });
  const tGrid = await getTranslations({ locale, namespace: 'home.categoryGrid' });

  const isDark = theme === 'dark';
  // mobile 4 / desktop 8 — 5~8번째 카드는 `hidden md:block`로 CSS만으로 분기.
  // 결정적 SSR HTML 유지(no isMobile JS branch) + 한 번에 모든 카드 prerender.
  const cards = artworks.slice(0, 8);

  return (
    <section
      className={cn('py-16 md:py-24 overflow-hidden', isDark ? 'bg-charcoal' : 'bg-canvas-soft')}
    >
      <div className="container-max">
        <div className="mb-10 md:mb-12 text-center">
          <SectionTitle className={cn('mb-3', isDark ? 'text-white' : 'text-charcoal')}>
            {title}
          </SectionTitle>
          <p
            className={cn('text-sm md:text-base', isDark ? 'text-white/70' : 'text-charcoal-muted')}
          >
            {tGrid('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {cards.map((artwork, index) => (
            <div
              key={`${artwork.id}-category-grid`}
              // 5~8번째 카드(index 4-7)는 desktop에서만 노출. mobile에서 4점 유지로
              // viewport 적정 노출 + 본질 LCP 비용 통제.
              className={cn(index >= 4 && 'hidden md:block')}
            >
              <InlineGridCard
                artwork={artwork}
                theme={theme}
                untitledLabel={tCard('untitled')}
                unknownArtistLabel={tCard('unknownArtist')}
                pendingInfoLabel={tCard('pendingInfo')}
                originalKoreanDataLabel={tCard('originalKoreanData')}
                soldLabel={tCard('soldBadge')}
                reservedLabel={tCard('reservedBadge')}
                pendingValueLabel={tCard('pendingValue')}
                inquiryValueLabel={tCard('inquiryValue')}
                viewDetailsAria={tCard('viewDetailsAria', {
                  title: getSafeTitle(artwork, tCard('untitled'), locale),
                  artist: getSafeArtist(artwork, tCard('unknownArtist'), locale),
                })}
                locale={locale}
              />
            </div>
          ))}
        </div>

        {/* 그리드 하단 CTA — 슬라이드 swipe·auto-scroll 어포던스 보완. mobile 4점·desktop 8점
            노출 이후 "더 많은 작품"으로의 자연스러운 동선. text-eyebrow 톤(curator label). */}
        <div className="mt-10 md:mt-12 flex justify-center">
          <Link
            href={viewAllHref}
            className={cn(
              'group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm md:text-base font-semibold border transition-[transform,box-shadow,background-color] duration-300',
              isDark
                ? 'border-white/30 text-white bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 hover:shadow-lg'
                : 'border-charcoal/20 text-charcoal bg-white hover:bg-canvas hover:-translate-y-0.5 hover:shadow-md'
            )}
          >
            {tGrid('viewAll', { category: title })}
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Inline server card (hydration 0) ──────────────────────────────────────────

const ARTWORK_PLACEHOLDER_IMAGE = '/images/og-image.jpg';

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

function InlineGridCard({
  artwork,
  theme,
  untitledLabel,
  unknownArtistLabel,
  pendingInfoLabel,
  originalKoreanDataLabel,
  soldLabel,
  reservedLabel,
  pendingValueLabel,
  inquiryValueLabel,
  viewDetailsAria,
  locale,
}: {
  artwork: Artwork;
  theme: 'dark' | 'light';
  untitledLabel: string;
  unknownArtistLabel: string;
  pendingInfoLabel: string;
  originalKoreanDataLabel: string;
  soldLabel: string;
  reservedLabel: string;
  pendingValueLabel: string;
  inquiryValueLabel: string;
  viewDetailsAria: string;
  locale: string;
}) {
  const safeTitle = getSafeTitle(artwork, untitledLabel, locale);
  const safeArtist = getSafeArtist(artwork, unknownArtistLabel, locale);

  // 재료 정보가 있고 미확인이 아닌 경우 alt에 포함 (영어 locale에서 한글 재료는 제외)
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
  // 매뉴얼 5.8 매체별 진품 라벨 — ArtworkCard·ArtworkGridCard와 동일 좌상단 위치.
  const mediumLabel = getMediumLabel({
    category: artwork.category,
    edition: artwork.edition,
    edition_type: artwork.edition_type,
  });
  const showMediumLabel = mediumLabel && !artwork.sold;
  const mediumLabelText = locale === 'en' ? mediumLabel?.en : mediumLabel?.ko;

  const isDark = theme === 'dark';

  return (
    <Link
      href={`/artworks/${artwork.id}`}
      aria-label={viewDetailsAria}
      className={cn(
        'group block h-full rounded-2xl overflow-hidden border shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl',
        isDark ? 'bg-charcoal border-white/10' : 'bg-white border-gray-200'
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden aspect-[4/5]',
          isDark ? 'bg-charcoal' : 'bg-canvas-soft'
        )}
      >
        <div className="absolute inset-3 md:inset-4">
          <SafeImage
            src={imageSrc}
            alt={altText}
            fill
            loading="lazy"
            quality={70}
            // 그리드 카드는 mobile 2 col, desktop 4 col. md(768) 기준 (100vw - 2rem - 16px) / 2 ≈ 376px,
            // lg(1024) 기준 (100vw - 2rem - 72px) / 4 ≈ 232px. 모바일 카드 폭 400px 미만.
            sizes="(max-width: 640px) calc(50vw - 1.5rem), (max-width: 1024px) calc(50vw - 2rem), 240px"
            className="object-contain"
          />
        </div>
        {/* 배지 — ArtworkCard gallery variant 위치/스타일과 일관성 유지 */}
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

      <div className={cn('relative p-4', isDark ? 'bg-charcoal' : 'bg-white')}>
        <h3
          className={cn(
            'text-base md:text-lg font-bold font-sans transition-colors duration-300 break-keep line-clamp-2 min-h-[3rem] md:min-h-[3.5rem]',
            isDark
              ? 'text-white group-hover:text-primary-soft'
              : 'text-charcoal group-hover:text-primary-strong'
          )}
        >
          {safeTitle}
        </h3>
        <p
          className={cn('text-sm mt-1 truncate', isDark ? 'text-white/75' : 'text-charcoal-muted')}
        >
          {safeArtist}
        </p>
        <p
          className={cn(
            // 큐레이터 톤 메타 라벨 — text-caption-meta utility (font-display 미적용,
            // tracking-[0.12em] + uppercase + xs). 영어 재료는 uppercase 변환, 한글은 영향 X.
            // line-clamp-1 + min-h-[1rem] CLS 보호 유지.
            'text-caption-meta mt-2 line-clamp-1 min-h-[1rem]',
            isDark ? 'text-white/55' : null
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
            return ' ';
          })()}
        </p>
        {localizedPrice && !isInquiryPrice(localizedPrice) ? (
          <p
            className={cn(
              'text-sm font-semibold mt-1',
              artwork.sold
                ? isDark
                  ? 'text-white/50 line-through'
                  : 'text-gray-600 line-through'
                : artwork.reserved
                  ? isDark
                    ? 'text-white/70'
                    : 'text-charcoal-soft'
                  : isDark
                    ? 'text-primary-soft'
                    : 'text-primary-strong'
            )}
          >
            {localizedPrice}
          </p>
        ) : (
          <p className="text-sm font-semibold mt-1 min-h-[1.25rem]">{' '}</p>
        )}
      </div>
    </Link>
  );
}
