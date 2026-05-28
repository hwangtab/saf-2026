import { Metadata } from 'next';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  getSupabaseArtworkById,
  getSupabaseArtworksByArtist,
  getArtworksByCategoryLight,
  getRecentlySoldArtworks,
  getTotalSoldCount,
  getSupabaseTestimonials,
  getSupabaseStoriesLight,
  getStoriesMentioningArtwork,
  getSupabaseArtistNoticeByName,
} from '@/lib/supabase-data';
import { resolveActiveNotice } from '@/lib/artist-notice';
import { getMaterialLabel } from '@/lib/artwork-material';
import { getMediumLabel } from '@/lib/medium-labels';
import PrideBox from '@/components/features/PrideBox';
import ArtistNoticeBanner from '@/components/features/ArtistNoticeBanner';
import RecentlySoldSection from '@/components/features/RecentlySoldSection';
import Section from '@/components/ui/Section';
import { getArticlesByArtist } from '@/content/artist-articles';
import { pinPrimaryStory } from '@/lib/artist-story-map';
import { getMediumHubSlug, getMediumCommerceHubSlug } from '@/lib/artwork-medium-hub';
import ArtworkImage from '@/components/features/ArtworkImage';
import ArtworkDetailNav from '@/components/features/ArtworkDetailNav';
import { parsePrice } from '@/lib/parsePrice';
import { SITE_URL } from '@/lib/constants';
import RelatedArticles from '@/components/features/RelatedArticles';
import RelatedMagazineCard from '@/components/features/RelatedMagazineCard';
import ExpandableHistory from '@/components/features/ExpandableHistory';
import { generateArtworkMetadata, generateArtworkJsonLd } from '@/lib/seo-utils';
import { generateArtworkPurchaseFAQ, generateArtworkSpecificFAQ } from '@/lib/schemas/howto';
import { getCategoryLabel } from '@/lib/artwork-category';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import SupportMessage from '@/components/features/SupportMessage';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import ArtworkGridCard from '@/components/features/ArtworkGridCard';
import { shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';
import ArtworkPurchaseCTA from '@/components/features/ArtworkPurchaseCTA';
import ArtworkPurchaseStickyMobile from '@/components/features/ArtworkPurchaseStickyMobile';
import TrustBadges from '@/components/features/TrustBadges';
import PosthumousPrintDetails from '@/components/features/PosthumousPrintDetails';
import WishlistHeartButton from '@/components/features/WishlistHeartButton';
import { containsHangul } from '@/lib/search-utils';
import { generateArtworkOverview } from '@/lib/artwork-description-fallback';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';
import {
  guideStoryHref,
  SIZE_GUIDE_SLUG,
  EDITION_GUIDE_SLUG,
  materialGuideSlug,
  PIGMENT_PRINT_GUIDE_SLUG,
} from '@/lib/artwork-glossary-links';
import { ArrowRight } from 'lucide-react';

interface Props {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

// TOP N 인기 작품만 빌드 시 prerender하고 나머지는 dynamicParams=true로 첫 요청 시 SSG.
// 빌드 부하 분산 (Supabase Cloudflare 522 회피) + 70%+ 트래픽이 인기 작품에 집중되므로 ROI 큼.
// 첫 hit 작품도 SSG 후 캐시되어 두 번째부터 CDN HIT.
// stale 보호: admin 수정/삭제 시 revalidatePath('/artworks/${id}'), 결제 confirm 시도 동일 호출.
// 1시간 background revalidate가 fallback safety net.
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 3600;

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);

  // Legacy redirect는 proxy.ts에서 page render 이전에 처리됨 (error.tsx 가로채기 회피).
  // 여기 도달한 숫자 ID는 proxy에서 매핑 못 찾은 케이스 → notFound 경로.

  const artwork = await getSupabaseArtworkById(id);
  const t = await getTranslations({ locale, namespace: 'artworkDetail' });

  if (!artwork) {
    return {
      title: t('notFound'),
    };
  }

  return generateArtworkMetadata(artwork, locale);
}

// 빌드 시 prerender 0건 — TOP 30 × 2 locale = 60 페이지 × 9 Supabase 쿼리 = 동시 ~216
// 쿼리가 Cloudflare 522 / statement timeout 회귀를 유발. dynamicParams=true + revalidate=3600
// 조합으로 모든 작품이 첫 요청 시 on-demand SSG → CDN 캐시 HIT. 인기 작품 첫 user만
// cold start(~2~4s) 경험, SEO 영향 0 (sitemap은 별도 출처). 빌드 시간 대폭 단축.
export async function generateStaticParams() {
  return [];
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);

  // Legacy redirect는 proxy.ts에서 처리됨.

  // Parallel fetch — artwork detail이 필요 없는 것들만 먼저 병렬 실행
  const [
    artwork,
    recentlySold,
    totalSoldCount,
    testimonialCategories,
    allStories,
    t,
    tBreadcrumbs,
  ] = await Promise.all([
    getSupabaseArtworkById(id),
    getRecentlySoldArtworks(3, id),
    getTotalSoldCount(),
    getSupabaseTestimonials(),
    getSupabaseStoriesLight(),
    getTranslations({ locale, namespace: 'artworkDetail' }),
    getTranslations({ locale, namespace: 'breadcrumbs' }),
  ]);
  const tCard = await getTranslations({ locale, namespace: 'artworkCard' });

  if (!artwork) {
    // 삭제·숨김 작품은 not-found.tsx 렌더(robots: noindex).
    // Next.js + Vercel 스트리밍 아키텍처에서 notFound()는 HTTP 200을 반환 — 레이아웃 레벨
    // 스트리밍이 상태 코드를 먼저 커밋하기 때문. standalone await 분리(news/[id] 패턴)로도
    // 200 → 404 전환 불가(2026-05 production curl 재확인). Next.js 공식 문서 streaming.mdx:
    // "this does not lead to indexation because the page is explicitly marked noindex" — SEO 안전.
    // GSC에서 'noindex 태그에 의해 제외됨' 카테고리로 분류됨(Soft 404 아님).
    notFound();
  }

  // artwork 확정 후 관련 작품만 병렬 fetch (이전 전체 330개 fetch → ~20개로 축소)
  const [artistWorks, categoryWorks, noticeRecord, mentionedStories] = await Promise.all([
    getSupabaseArtworksByArtist(artwork.artist),
    artwork.category
      ? getArtworksByCategoryLight(artwork.category, 20)
      : Promise.resolve([] as Artwork[]),
    getSupabaseArtistNoticeByName(artwork.artist),
    getStoriesMentioningArtwork(artwork.id),
  ]);
  const notice = resolveActiveNotice(noticeRecord, locale === 'en' ? 'en' : 'ko');

  const isEnglish = locale === 'en';
  const flatTestimonials = testimonialCategories
    .flatMap((c) => c.items)
    .map((item) => ({
      quote: (isEnglish && item.quote_en?.trim() ? item.quote_en : item.quote).replace(
        /<\/?strong>/g,
        ''
      ),
      author: isEnglish && item.author_en?.trim() ? item.author_en : item.author,
    }));

  const otherWorks = artistWorks.filter((a) => a.id !== artwork.id).slice(0, 3);

  // Extract numeric price — moved up to reuse in sameCategoryWorks ranking below
  const parsedPrice = parsePrice(artwork.price);
  const isInquiry = parsedPrice === Infinity;
  // '0' 대신 '' 전달 — 스키마 함수 내부에서 isInquiry 분기로 처리, price:0 노출 방지
  const numericPrice = isInquiry ? '' : String(parsedPrice);

  // 같은 카테고리의 다른 작품 (같은 작가·현재 작품 제외, 최대 6점).
  // 매뉴얼 7.4: 톤 겹침 우선 → 가격 근접 보조. 톤 미입력 시 가격-only 폴백(Phase 23).
  // 사전 shuffleArray로 동일 순위 후보의 tie-break 무작위화 → revalidate 주기마다 약간의 로테이션 유지.
  const categoryCandidates = categoryWorks.filter(
    (a) => a.id !== artwork.id && a.artist !== artwork.artist
  );
  const currentTones = new Set(artwork.tone ?? []);
  const toneOverlap = (a: (typeof categoryCandidates)[number]) =>
    (a.tone ?? []).filter((t) => currentTones.has(t)).length;
  const sameCategoryWorks = shuffleArray(categoryCandidates)
    .sort((a, b) => {
      const ta = toneOverlap(a);
      const tb = toneOverlap(b);
      if (ta !== tb) return tb - ta; // 톤 겹침 많은 후보 우선
      // 톤 동률 → 가격 근접 보조 (문의가면 shuffle 순서 유지)
      if (parsedPrice === Infinity) return 0;
      const da = Math.abs(parsePrice(a.price) - parsedPrice);
      const db = Math.abs(parsePrice(b.price) - parsedPrice);
      if (da === Infinity && db === Infinity) return 0;
      return da - db;
    })
    .slice(0, 6);

  // Get related articles for this artist (static content)
  const relatedArticles = getArticlesByArtist(artwork.artist);

  // 관련 매거진: (1) 작가 태그 매칭 + (2) 본문에 이 작품 uuid를 직접 인용한 글.
  // 매거진→작품 인용은 schema.org mentions로 이미 송출 중이고, 그 역방향을 작품 페이지에서
  // 노출해 양방향 entity graph를 닫는다. 작가 매칭을 우선하고 본문 인용을 보충해 슬롯 채움.
  const tagMatchedStories = allStories.filter((s) => s.tags?.some((tag) => tag === artwork.artist));
  // 정전 스토리(ARTIST_PRIMARY_STORY 등재 작가)는 결정론적으로 1번 슬롯. recency 정렬에 밀리는 회귀 차단.
  const pinnedTagMatched = pinPrimaryStory(artwork.artist, tagMatchedStories);
  const tagMatchedIds = new Set(pinnedTagMatched.map((s) => s.id));
  // 매체 hub(art-knowledge) 1편 보장 — 매체별 link equity inflow 강화.
  const mediumHubSlug = getMediumHubSlug(artwork.category);
  const mediumHubStory = mediumHubSlug
    ? allStories.find((s) => s.slug === mediumHubSlug && !tagMatchedIds.has(s.id))
    : undefined;
  // 매체 commerce hub(buying-guide) 1편 보장 — 매체별 가격/구매 의도 funnel 명시화.
  const commerceHubSlug = getMediumCommerceHubSlug(artwork.category);
  const commerceHubStory = commerceHubSlug
    ? allStories.find(
        (s) => s.slug === commerceHubSlug && !tagMatchedIds.has(s.id) && s.id !== mediumHubStory?.id
      )
    : undefined;
  const reservedIds = new Set<string>();
  if (mediumHubStory) reservedIds.add(mediumHubStory.id);
  if (commerceHubStory) reservedIds.add(commerceHubStory.id);
  const bodyMentionedStories = mentionedStories.filter(
    (s) => !tagMatchedIds.has(s.id) && !reservedIds.has(s.id)
  );
  const relatedMagazineStories = [
    ...pinnedTagMatched,
    ...(mediumHubStory ? [mediumHubStory] : []),
    ...(commerceHubStory ? [commerceHubStory] : []),
    ...bodyMentionedStories,
  ].slice(0, 3);
  const liveStorySlugs = new Set(allStories.map((s) => s.slug));
  const localizeDataValue = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (locale !== 'en') return value;
    if (value === '문의') return tCard('inquiryValue');
    if (value === '확인 중') return tCard('pendingValue');
    // edition 표기: "에디션 1/5" → "Edition 1/5"
    if (/^\s*에디션\s*/.test(value)) return value.replace(/^\s*에디션\s*/, 'Edition ');
    if (containsHangul(value)) return t('originalKoreanDetail');
    return value;
  };
  const localizeLongText = (
    value: string | null | undefined,
    enValue: string | null | undefined,
    fallback: string
  ): string | null => {
    if (!value && !enValue) return null;
    if (locale === 'en') {
      if (enValue?.trim()) return enValue;
      if (value && !containsHangul(value)) return value;
      if (value) return fallback;
      return null;
    }
    return value || null;
  };
  const localizedProfile = localizeLongText(
    artwork.profile,
    artwork.profile_en,
    t('originalKoreanProfile')
  );
  const localizedDescription = localizeLongText(
    artwork.description,
    artwork.description_en,
    t('originalKoreanNote')
  );
  // description이 비어있으면 메타데이터로 1~2 문장 작품 개요를 합성한다 (thin content 시그널 완화).
  const artworkOverview = localizedDescription ? null : generateArtworkOverview(artwork, locale);
  const localizedHistory = localizeLongText(
    artwork.history,
    artwork.history_en,
    t('originalKoreanHistory')
  );
  const localizedQuote =
    locale === 'en'
      ? artwork.quote_en?.trim() ||
        (artwork.quote && !containsHangul(artwork.quote) ? artwork.quote : null)
      : artwork.quote || null;
  const localizedPrice = localizeDataValue(artwork.price);
  const localizedMaterial = getMaterialLabel(artwork.material, locale);
  const localizedSize = localizeDataValue(artwork.size);
  const localizedEdition = localizeDataValue(artwork.edition);
  const materialGuide = materialGuideSlug(artwork.material);
  const displayTitle = locale === 'en' && artwork.title_en ? artwork.title_en : artwork.title;
  const displayArtist = locale === 'en' && artwork.artist_en ? artwork.artist_en : artwork.artist;
  const hasActionablePrice = parsedPrice !== Infinity;

  // 매뉴얼 5.8 매체별 진품 라벨 — 11개 매체 전체 처리.
  const mediumLabel = getMediumLabel({
    category: artwork.category,
    edition: artwork.edition,
    edition_type: artwork.edition_type,
  });
  const mediumLabelText = mediumLabel ? (locale === 'en' ? mediumLabel.en : mediumLabel.ko) : null;

  // Generate JSON-LD schemas — breadcrumb에 카테고리 계층 포함
  const categoryBreadcrumb = artwork.category
    ? {
        name: getCategoryLabel(artwork.category, locale),
        path: `/artworks/category/${encodeURIComponent(artwork.category)}`,
      }
    : undefined;
  const { productSchema, breadcrumbSchema, webPageSchema } = generateArtworkJsonLd(
    artwork,
    numericPrice,
    isInquiry,
    locale,
    {
      home: tBreadcrumbs('home'),
      artworks: tBreadcrumbs('artworks'),
      category: categoryBreadcrumb,
    },
    {
      mentionedInStories: relatedMagazineStories.map((s) => ({
        slug: s.slug,
        title: s.title,
        titleEn: s.title_en,
      })),
    }
  );

  const purchaseFaqSchema = generateArtworkPurchaseFAQ(locale);
  // 작품-특화 FAQ — 제목·작가·매체·크기·가격을 답변에 포함시켜 작품마다 unique한 Q&A.
  // "{작가명} 작품 가격", "{작품명} 어떤 작품" 같은 롱테일 검색·LLM 인용 흡수.
  const artworkSpecificFaqSchema = generateArtworkSpecificFAQ(
    {
      id: artwork.id,
      title: artwork.title,
      title_en: artwork.title_en,
      artist: artwork.artist,
      artist_en: artwork.artist_en,
      material: artwork.material,
      size: artwork.size,
      year: artwork.year,
      price: artwork.price,
      description: artwork.description,
      description_en: artwork.description_en,
      category: artwork.category,
      sold: artwork.sold,
    },
    locale
  );

  // GSC가 "FAQPage 입력란이 중복되었습니다" 보고(2026-04-26~). Google FAQ Rich Results
  // 가이드라인: 페이지당 FAQPage 1개만 허용. 두 함수의 mainEntity(Q&A 배열)를 합쳐
  // 단일 FAQPage로 발행. 두 함수 모두 generateFAQSchema()를 거치는 동일 형식이라
  // mainEntity concat 안전.
  const faqSchema =
    artworkSpecificFaqSchema && Array.isArray(artworkSpecificFaqSchema.mainEntity)
      ? {
          ...purchaseFaqSchema,
          mainEntity: [
            ...(Array.isArray(purchaseFaqSchema.mainEntity) ? purchaseFaqSchema.mainEntity : []),
            ...artworkSpecificFaqSchema.mainEntity,
          ],
        }
      : purchaseFaqSchema;

  // LCP preload는 ArtworkImage의 <picture>가 자체 fetchPriority="high" + Vercel Edge/Next.js의
  // 자동 preload 인젝션으로 처리. 페이지 레벨에서 별도 <link rel="preload">를 추가하면 같은
  // URL을 두 번 hint하는 형태(production HTML pos 440/707 + pos 7624/7891)가 되어 우선순위
  // 경쟁만 발생 — 측정 결과 dedupe로 1회 fetch지만 hint 자체가 잉여. 페이지 레벨 추가 제거.

  const rawShareImage = artwork.images?.[0] ? resolveArtworkImageUrl(artwork.images[0]) : null;
  const shareImageUrl = rawShareImage
    ? rawShareImage.startsWith('http')
      ? rawShareImage
      : `${SITE_URL}${rawShareImage}`
    : undefined;

  return (
    <>
      <JsonLdScript data={[productSchema, breadcrumbSchema, webPageSchema]} />
      <JsonLdScript data={faqSchema} />
      <Section
        variant="white"
        prevVariant="canvas"
        padding="none"
        className="pb-24 md:pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))]"
      >
        <Suspense
          fallback={
            <nav className="border-b sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-white/80 backdrop-blur-md">
              <div className="container-max py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="h-[44px] w-32 bg-gray-100 rounded animate-pulse" />
                <div className="flex items-center gap-2 pb-1 md:pb-0">
                  <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                  <span className="text-gray-200">/</span>
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                  <span className="text-gray-200">/</span>
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </nav>
          }
        >
          <ArtworkDetailNav artist={displayArtist} title={displayTitle} />
        </Suspense>

        {notice && (
          <div className="container-max pt-6 md:pt-8">
            <ArtistNoticeBanner type={notice.type} message={notice.message} locale={locale} />
          </div>
        )}

        <article className="container-max pt-12 md:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left Column: Image & CTA */}
            <div className="space-y-8">
              <ArtworkImage
                images={artwork.images}
                title={displayTitle}
                artist={displayArtist}
                sold={artwork.sold}
                reserved={artwork.reserved}
                size={artwork.size}
                category={artwork.category}
              />

              {/* Mobile Header: Title, Artist, Price (Visible only on mobile, hidden from screen readers to avoid duplication with sr-only header) */}
              <div className="block lg:hidden space-y-3 mt-6" aria-hidden="true">
                <p className="text-2xl font-bold font-sans text-charcoal break-keep text-center">
                  {displayTitle}
                </p>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-lg text-gray-600 font-medium">{displayArtist}</p>
                </div>
              </div>

              {/* Unified CTA */}
              <ArtworkPurchaseCTA
                artworkId={artwork.id}
                artworkTitle={artwork.title}
                artist={artwork.artist}
                shopUrl={artwork.shopUrl}
                sold={artwork.sold}
                reserved={artwork.reserved}
                hasActionablePrice={hasActionablePrice}
                hasOtherWorks={otherWorks.length > 0}
                displayPrice={localizedPrice}
                category={artwork.category ?? undefined}
                hasSameCategoryWorks={sameCategoryWorks.length > 0}
              />

              {/* 위시리스트 — 매뉴얼 7.2 [4] · 10.4 1단계. 모든 작품 상태에서 저장 가능. */}
              <WishlistHeartButton
                artworkId={artwork.id}
                artworkTitle={artwork.title}
                variant="inline"
                className="w-full justify-center"
              />

              <SupportMessage testimonials={flatTestimonials} totalSoldCount={totalSoldCount} />

              {/* Fund context cross-link */}
              <p className="text-xs text-charcoal-muted text-center leading-relaxed">
                {t.rich('fundContextProse', {
                  link: (chunks) => (
                    <Link href="/our-proof" className="text-primary-strong hover:underline">
                      {chunks}
                    </Link>
                  ),
                })}
              </p>

              {/* Share Section */}
              <div className="flex items-center justify-center gap-2 py-4 border-y border-gray-100">
                <span className="text-sm text-charcoal-soft mr-2">{t('share')}</span>
                <ShareButtonsWrapper
                  url={`${SITE_URL}/artworks/${artwork.id}`}
                  title={t('shareTitle', { title: displayTitle, artist: displayArtist })}
                  description={t('shareDescription', {
                    title: displayTitle,
                    artist: displayArtist,
                  })}
                  imageUrl={shareImageUrl}
                />
              </div>
            </div>

            {/* Right Column: Info Section */}
            <div className="space-y-8">
              <header className="sr-only lg:not-sr-only lg:block mb-6 border-b border-gray-100 pb-6 lg:border-none lg:pb-0 lg:mb-0">
                <h1
                  id="artwork-title"
                  className="text-3xl md:text-4xl font-black font-display text-charcoal mb-2 break-keep"
                >
                  {displayTitle}
                </h1>
                <p id="artist-name" className="text-xl text-gray-600 font-medium">
                  {displayArtist}
                </p>
              </header>

              {/* 매뉴얼 5.8 매체별 진품 라벨 박스 — Sprint 2 5 매체만 노출.
                  작품 detail [2] 진품성 정체성 영역. 우측 column header 직후, 스펙 테이블 위. */}
              {mediumLabelText && (
                <div className="rounded-2xl border border-gray-200 bg-canvas-soft px-6 py-5 shadow-sm">
                  <p className="text-xs uppercase tracking-widest text-charcoal-muted mb-1">
                    {t('authenticityLabel')}
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-charcoal-deep break-keep">
                    {mediumLabelText}
                  </p>
                  {liveStorySlugs.has(EDITION_GUIDE_SLUG) && (
                    <Link
                      href={guideStoryHref(EDITION_GUIDE_SLUG, locale === 'en')}
                      className="mt-2 inline-block text-xs text-primary-strong hover:underline"
                    >
                      {t('editionMeaningLink')}
                    </Link>
                  )}
                </div>
              )}

              {/* 매뉴얼 5.6 사후판화 디테일 박스 — 5요소 풀이 (작가 생몰년·발행주체·인증서·에디션·설명) */}
              {artwork.category === '사후판화' && (
                <PosthumousPrintDetails
                  artistName={artwork.artist}
                  edition={artwork.edition}
                  editionLimit={artwork.edition_limit}
                  locale={locale}
                />
              )}

              <div className="border-t border-b border-gray-100 py-6">
                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 items-baseline">
                  {/* 분류 */}
                  {artwork.category && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('category')}</span>
                      <Link
                        href={`/artworks/category/${encodeURIComponent(artwork.category)}`}
                        className="text-primary-strong hover:underline"
                      >
                        {getCategoryLabel(artwork.category, locale)}
                      </Link>
                    </>
                  )}

                  {/* 재료 */}
                  {localizedMaterial && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('material')}</span>
                      <span className="text-charcoal">
                        {localizedMaterial}{' '}
                        {materialGuide && liveStorySlugs.has(materialGuide) && (
                          <Link
                            href={guideStoryHref(materialGuide, locale === 'en')}
                            className="text-xs text-primary-strong hover:underline"
                          >
                            {t(
                              materialGuide === PIGMENT_PRINT_GUIDE_SLUG
                                ? 'pigmentGuideLink'
                                : 'printGuideLink'
                            )}
                          </Link>
                        )}
                      </span>
                    </>
                  )}

                  {/* 크기 */}
                  {localizedSize && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('size')}</span>
                      <span className="text-charcoal">
                        {localizedSize}{' '}
                        {artwork.size !== '확인 중' && liveStorySlugs.has(SIZE_GUIDE_SLUG) && (
                          <Link
                            href={guideStoryHref(SIZE_GUIDE_SLUG, locale === 'en')}
                            className="text-xs text-primary-strong hover:underline"
                          >
                            {t('sizeGuideLink')}
                          </Link>
                        )}
                      </span>
                    </>
                  )}

                  {/* 년도 */}
                  {artwork.year && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('year')}</span>
                      <span className="text-charcoal">{artwork.year}</span>
                    </>
                  )}

                  {/* 에디션 */}
                  {localizedEdition && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('edition')}</span>
                      <span className="text-charcoal">
                        {localizedEdition}{' '}
                        {artwork.edition !== '확인 중' &&
                          liveStorySlugs.has(EDITION_GUIDE_SLUG) && (
                            <Link
                              href={guideStoryHref(EDITION_GUIDE_SLUG, locale === 'en')}
                              className="text-xs text-primary-strong hover:underline"
                            >
                              {t('editionGuideLink')}
                            </Link>
                          )}
                      </span>
                    </>
                  )}

                  {/* 가격 */}
                  {localizedPrice && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('price')}</span>
                      <span className="text-charcoal font-semibold">{localizedPrice}</span>
                    </>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Link
                    href="/stories/guide"
                    className="text-xs text-primary-strong hover:underline"
                  >
                    {t('fullGuideLink')}
                  </Link>
                </div>
              </div>

              {/* Artist Profile */}
              {localizedProfile && (
                <div className="bg-white border-l-4 border-primary/20 pl-6 pr-6 py-5 rounded-r-xl">
                  <h2 className="text-sm font-bold text-primary-strong uppercase tracking-wider mb-4">
                    {t('artistProfile')}
                  </h2>
                  <p
                    id="artist-profile"
                    className="text-charcoal leading-relaxed text-sm whitespace-pre-line"
                  >
                    {localizedProfile}
                  </p>
                </div>
              )}

              {/* Artist Quote [7] */}
              {localizedQuote && (
                <figure className="bg-white border-l-4 border-primary/30 pl-6 pr-6 py-5 rounded-r-xl">
                  <blockquote className="text-charcoal italic leading-relaxed text-base whitespace-pre-line before:content-['\201C'] after:content-['\201D']">
                    {localizedQuote}
                  </blockquote>
                  <figcaption className="mt-3 text-xs text-charcoal-soft uppercase tracking-wider not-italic">
                    {t('artistQuote')} — {displayArtist}
                  </figcaption>
                </figure>
              )}

              {/* Artist Note */}
              {localizedDescription && (
                <div className="bg-primary-surface p-6 rounded-xl">
                  <h2 className="text-sm font-bold text-charcoal-muted uppercase tracking-wider mb-4">
                    {t('artistNote')}
                  </h2>
                  <p
                    id="artist-note"
                    className="text-charcoal leading-relaxed text-sm whitespace-pre-line"
                  >
                    {localizedDescription}
                  </p>
                </div>
              )}

              {/* Artwork Overview — description이 비어있을 때 메타데이터로 합성한 작품 개요 */}
              {!localizedDescription && artworkOverview && (
                <div className="bg-primary-surface p-6 rounded-xl">
                  <h2 className="text-sm font-bold text-charcoal-muted uppercase tracking-wider mb-4">
                    {t('artworkOverview')}
                  </h2>
                  <p id="artwork-overview" className="text-charcoal leading-relaxed text-sm">
                    {artworkOverview}
                  </p>
                </div>
              )}

              {/* Artist History */}
              {localizedHistory && (
                <ExpandableHistory
                  history={localizedHistory}
                  className="bg-white border border-gray-200 shadow-sm"
                />
              )}

              {/* Related Articles */}
              <RelatedArticles articles={relatedArticles} locale={locale} />

              {/* Related Magazine Stories (Supabase) — 카드형 */}
              {relatedMagazineStories.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-charcoal-soft uppercase tracking-wider">
                    {t('magazineLabel')}
                  </h2>
                  <div className="space-y-4">
                    {relatedMagazineStories.map((story, i) => (
                      <RelatedMagazineCard
                        key={story.id}
                        story={story}
                        isEn={locale === 'en'}
                        artworkId={artwork.id}
                        artworkArtist={artwork.artist}
                        position={i}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Other Works by this Artist Section */}
          {otherWorks.length > 0 ? (
            <div className="mt-24 pt-24 border-t border-gray-100">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-charcoal">
                  {t('otherWorks', { artist: displayArtist })}
                </h2>
                <Link
                  href={`/artworks/artist/${encodeURIComponent(artwork.artist)}`}
                  className="text-primary-strong font-medium hover:underline text-sm"
                >
                  <span className="inline-flex items-center gap-1">
                    {t('viewAll')}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherWorks.map((other) => (
                  <ArtworkGridCard
                    key={other.id}
                    artwork={other}
                    locale={locale}
                    untitledLabel={tCard('untitled')}
                    unknownArtistLabel={tCard('unknownArtist')}
                    pendingInfoLabel={tCard('pendingInfo')}
                    originalKoreanDataLabel={tCard('originalKoreanData')}
                    soldLabel={tCard('soldBadge')}
                    reservedLabel={tCard('reservedBadge')}
                    pendingValueLabel={tCard('pendingValue')}
                    inquiryValueLabel={tCard('inquiryValue')}
                    sizesOverride="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(50vw - 1.5rem), calc(33vw - 1rem)"
                    wishlistSlot={(title) => (
                      <WishlistHeartButton
                        artworkId={other.id}
                        artworkTitle={title}
                        variant="overlay"
                      />
                    )}
                  />
                ))}
              </div>
              <div className="mt-10 text-center">
                <Link
                  href={`/artworks/artist/${encodeURIComponent(artwork.artist)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-charcoal-deep bg-white px-6 py-3 text-sm font-medium text-charcoal-deep hover:bg-charcoal-deep hover:text-white transition-colors"
                >
                  {t('viewAllByArtist', { artist: displayArtist, count: artistWorks.length })}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : null}

          {/* 매뉴얼 7.2 [10] 신뢰 시그널 독립 영역 — sold/reserved/inquiry 분기 무관 항상 노출.
              전체 폭 카드 박스 (우측 column 종료 후, sameCategoryWorks 직전). */}
          <div className="mt-16 rounded-2xl bg-canvas-soft border border-gray-100 py-8 px-6">
            <p className="text-xs uppercase tracking-widest text-charcoal-muted mb-5">
              {t('trustSection.eyebrow')}
            </p>
            <TrustBadges variant="detail" />
          </div>

          {/* Same Category Works Section */}
          {sameCategoryWorks.length > 0 && artwork.category && (
            <div className="mt-16 pt-16 border-t border-gray-100">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-charcoal">
                  {t('sameCategoryWorks', {
                    category: getCategoryLabel(artwork.category, locale),
                  })}
                </h2>
                <Link
                  href={`/artworks/category/${encodeURIComponent(artwork.category)}`}
                  className="text-primary-strong font-medium hover:underline text-sm"
                >
                  <span className="inline-flex items-center gap-1">
                    {t('viewAllCategory', {
                      category: getCategoryLabel(artwork.category, locale),
                    })}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {sameCategoryWorks.map((other) => (
                  <ArtworkGridCard
                    key={other.id}
                    artwork={other}
                    locale={locale}
                    untitledLabel={tCard('untitled')}
                    unknownArtistLabel={tCard('unknownArtist')}
                    pendingInfoLabel={tCard('pendingInfo')}
                    originalKoreanDataLabel={tCard('originalKoreanData')}
                    soldLabel={tCard('soldBadge')}
                    reservedLabel={tCard('reservedBadge')}
                    pendingValueLabel={tCard('pendingValue')}
                    inquiryValueLabel={tCard('inquiryValue')}
                    sizesOverride="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(50vw - 1.5rem), calc(33vw - 1rem)"
                    wishlistSlot={(title) => (
                      <WishlistHeartButton
                        artworkId={other.id}
                        artworkTitle={title}
                        variant="overlay"
                      />
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 모바일 하단 sticky CTA — 매뉴얼 7.2 [4] · 11. md 이상에서는 사이드바 CTA 노출. */}
          <ArtworkPurchaseStickyMobile
            artworkId={artwork.id}
            artworkTitle={artwork.title}
            artist={artwork.artist}
            shopUrl={artwork.shopUrl}
            sold={artwork.sold}
            reserved={artwork.reserved}
            hasActionablePrice={hasActionablePrice}
            displayPrice={localizedPrice}
          />

          {/* Recently Sold Section */}
          <RecentlySoldSection
            artworks={recentlySold}
            totalCount={totalSoldCount}
            locale={locale}
          />

          {/* 매뉴얼 8.3 자긍심 박스 — 작품 detail 마지막 [13] 영역.
              회복 서사 4원칙(결말=회복 / 주체=컬렉터 / 시간=현재진행형 / 위치=정체성 마무리). */}
          <PrideBox
            artwork={{
              category: artwork.category,
              edition: artwork.edition,
              edition_type: artwork.edition_type,
            }}
            locale={locale === 'en' ? 'en' : 'ko'}
          />

          {/* ArtworkPurchaseStickyMobile (md:hidden fixed bottom-0) 높이 보상 — 모바일에서
              PrideBox 하단이 sticky CTA(~72px)에 가려지는 회귀 방지. */}
          <div className="h-24 md:hidden" aria-hidden="true" />
        </article>
      </Section>
    </>
  );
}
