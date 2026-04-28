import { Metadata } from 'next';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import {
  getSupabaseArtworks,
  getSupabaseArtworkById,
  getSupabaseArtworksByArtist,
  getArtworksByCategoryLight,
  getRecentlySoldArtworks,
  getTotalSoldCount,
  getSupabaseTestimonials,
  getSupabaseStories,
} from '@/lib/supabase-data';
import SafeImage from '@/components/common/SafeImage';
import RecentlySoldSection from '@/components/features/RecentlySoldSection';
import Section from '@/components/ui/Section';
import { getArticlesByArtist } from '@/content/artist-articles';
import ArtworkImage from '@/components/features/ArtworkImage';
import ArtworkDetailNav from '@/components/features/ArtworkDetailNav';
import { parsePrice } from '@/lib/parsePrice';
import { SITE_URL } from '@/lib/constants';
import RelatedArticles from '@/components/features/RelatedArticles';
import ExpandableHistory from '@/components/features/ExpandableHistory';
import { generateArtworkMetadata, generateArtworkJsonLd } from '@/lib/seo-utils';
import { generateArtworkPurchaseFAQ, generateArtworkSpecificFAQ } from '@/lib/schemas/howto';
import { getCategoryLabel } from '@/lib/artwork-category';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import SupportMessage from '@/components/features/SupportMessage';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { resolveArtworkImageUrlForPreset, shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';
import ArtworkPurchaseCTA from '@/components/features/ArtworkPurchaseCTA';
import { containsHangul } from '@/lib/search-utils';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// 작품 lifecycle (추가/판매/삭제)이 잦아 ISR prerender + revalidate 조합으로는
// 삭제된 작품에 대해 stale 200 응답이 서빙되어 GSC가 NOINDEX로 보고하는 문제가 있었음.
// force-dynamic으로 매 요청 SSR + notFound() 시 정확한 404 응답을 보장 — Google에 명확한
// 색인 제거 시그널 송출. Supabase fetch 비용은 페이지당 6병렬로 분산되어 영향 미미.
export const dynamic = 'force-dynamic';

/** 스토리 body 마크다운에서 첫 번째 이미지 URL 추출 — 썸네일 fallback용 */
function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const { id } = await params;

  // Legacy redirect는 proxy.ts에서 page render 이전에 처리됨 (error.tsx 가로채기 회피).
  // 여기 도달한 숫자 ID는 proxy에서 매핑 못 찾은 케이스 → notFound 경로.

  const artwork = await getSupabaseArtworkById(id);
  const t = await getTranslations('artworkDetail');

  if (!artwork) {
    return {
      title: t('notFound'),
    };
  }

  return generateArtworkMetadata(artwork, locale);
}

// Generate static params for all artworks at build time
export async function generateStaticParams() {
  const artworks = await getSupabaseArtworks();
  return artworks.map((artwork) => ({
    id: artwork.id,
  }));
}

export default async function ArtworkDetailPage({ params }: Props) {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const { id } = await params;

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
    getSupabaseStories(),
    getTranslations('artworkDetail'),
    getTranslations('breadcrumbs'),
  ]);

  if (!artwork) {
    notFound();
  }

  // artwork 확정 후 관련 작품만 병렬 fetch (이전 전체 330개 fetch → ~20개로 축소)
  const [artistWorks, categoryWorks] = await Promise.all([
    getSupabaseArtworksByArtist(artwork.artist),
    artwork.category
      ? getArtworksByCategoryLight(artwork.category, 20)
      : Promise.resolve([] as Artwork[]),
  ]);

  const flatTestimonials = testimonialCategories
    .flatMap((c) => c.items)
    .map((item) => ({
      quote: item.quote.replace(/<\/?strong>/g, ''),
      author: item.author,
    }));

  const otherWorks = artistWorks.filter((a) => a.id !== artwork.id).slice(0, 3);

  // 같은 카테고리의 다른 작품 (같은 작가·현재 작품 제외, 판매중만, 최대 3점)
  // 20개 후보 풀에서 셔플 후 3점 추출 — revalidate=600 주기마다 다른 조합 노출
  const sameCategoryWorks = shuffleArray(
    categoryWorks.filter((a) => a.id !== artwork.id && a.artist !== artwork.artist)
  ).slice(0, 3);

  // Extract numeric price using utility
  const parsedPrice = parsePrice(artwork.price);
  const isInquiry = parsedPrice === Infinity;
  // '0' 대신 '' 전달 — 스키마 함수 내부에서 isInquiry 분기로 처리, price:0 노출 방지
  const numericPrice = isInquiry ? '' : String(parsedPrice);

  // Get related articles for this artist (static content)
  const relatedArticles = getArticlesByArtist(artwork.artist);

  // Get related magazine stories from Supabase (tags include artist name)
  const relatedMagazineStories = allStories
    .filter((s) => s.tags?.some((tag) => tag === artwork.artist))
    .slice(0, 3);
  const localizeDataValue = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (locale !== 'en') return value;
    if (value === '문의') return 'Inquiry';
    if (value === '확인 중') return 'Pending';
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
  const localizedHistory = localizeLongText(
    artwork.history,
    artwork.history_en,
    t('originalKoreanHistory')
  );
  const localizedPrice = localizeDataValue(artwork.price);
  const localizedMaterial = localizeDataValue(artwork.material);
  const localizedSize = localizeDataValue(artwork.size);
  const localizedEdition = localizeDataValue(artwork.edition);
  const displayTitle = locale === 'en' && artwork.title_en ? artwork.title_en : artwork.title;
  const displayArtist = locale === 'en' && artwork.artist_en ? artwork.artist_en : artwork.artist;
  const hasActionablePrice = parsedPrice !== Infinity;

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
    }
  );

  const faqSchema = generateArtworkPurchaseFAQ(locale);
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

  // LCP preload — 모바일은 slider 프리셋(400w) / 데스크톱은 detail(1600w)
  // imageSrcSet + imageSizes로 <picture> + media query 분기에 맞춰 브라우저가 올바른 URL 선택
  const lcpImageSrc = artwork.images?.[0]
    ? resolveArtworkImageUrlForPreset(artwork.images[0], 'slider')
    : null;
  const lcpImageSrcSetDesktop = artwork.images?.[0]
    ? resolveArtworkImageUrlForPreset(artwork.images[0], 'detail')
    : null;

  return (
    <>
      {lcpImageSrc && lcpImageSrcSetDesktop && (
        <link
          rel="preload"
          as="image"
          href={lcpImageSrc}
          imageSrcSet={`${lcpImageSrc} 767w, ${lcpImageSrcSetDesktop} 1920w`}
          imageSizes="(max-width: 767px) 100vw, 50vw"
          fetchPriority="high"
        />
      )}
      <JsonLdScript data={[productSchema, breadcrumbSchema, webPageSchema]} />
      <JsonLdScript data={faqSchema} />
      {artworkSpecificFaqSchema !== null && <JsonLdScript data={artworkSpecificFaqSchema} />}
      <Section
        variant="white"
        prevVariant="canvas-soft"
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

              <SupportMessage testimonials={flatTestimonials} totalSoldCount={totalSoldCount} />

              {/* Fund context cross-link */}
              <p className="text-xs text-charcoal-muted text-center leading-relaxed">
                {locale === 'en' ? (
                  <>
                    Sales proceeds go to the{' '}
                    <Link href="/our-proof" className="text-primary hover:underline">
                      artist mutual-aid fund
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    판매 수익 전액은{' '}
                    <Link href="/our-proof" className="text-primary hover:underline">
                      예술인 상호부조 기금
                    </Link>
                    으로 귀속됩니다.
                  </>
                )}
              </p>

              {/* Share Section */}
              <div className="flex items-center justify-center gap-2 py-4 border-y border-gray-100">
                <span className="text-sm text-gray-500 mr-2">{t('share')}</span>
                <ShareButtonsWrapper
                  url={`${SITE_URL}/artworks/${artwork.id}`}
                  title={t('shareTitle', { title: displayTitle, artist: displayArtist })}
                  description={t('shareDescription', {
                    title: displayTitle,
                    artist: displayArtist,
                  })}
                />
              </div>
            </div>

            {/* Right Column: Info Section */}
            <div className="space-y-8">
              <header className="sr-only lg:not-sr-only lg:block mb-6 border-b border-gray-100 pb-6 lg:border-none lg:pb-0 lg:mb-0">
                <h1
                  id="artwork-title"
                  className="text-3xl md:text-4xl font-bold font-sans text-charcoal mb-2 break-keep"
                >
                  {displayTitle}
                </h1>
                <p id="artist-name" className="text-xl text-gray-600 font-medium">
                  {displayArtist}
                </p>
              </header>

              <div className="border-t border-b border-gray-100 py-6">
                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 items-baseline">
                  {/* 분류 */}
                  {artwork.category && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('category')}</span>
                      <Link
                        href={`/artworks/category/${encodeURIComponent(artwork.category)}`}
                        className="text-primary hover:underline"
                      >
                        {getCategoryLabel(artwork.category, locale)}
                      </Link>
                    </>
                  )}

                  {/* 재료 */}
                  {localizedMaterial && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('material')}</span>
                      <span className="text-charcoal">{localizedMaterial}</span>
                    </>
                  )}

                  {/* 크기 */}
                  {localizedSize && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('size')}</span>
                      <span className="text-charcoal">{localizedSize}</span>
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
                      <span className="text-charcoal">{localizedEdition}</span>
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
              </div>

              {/* Artist Profile */}
              {localizedProfile && (
                <div className="bg-white border-l-4 border-primary/20 pl-6 pr-6 py-5 rounded-r-xl">
                  <h2 className="text-sm font-bold text-primary/60 uppercase tracking-wider mb-4">
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

              {/* Artist Note */}
              {localizedDescription && (
                <div className="bg-primary/5 p-6 rounded-xl">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
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

              {/* Artist History */}
              {localizedHistory && (
                <ExpandableHistory
                  history={localizedHistory}
                  className="bg-white border border-gray-200 shadow-sm"
                />
              )}

              {/* Related Articles */}
              <RelatedArticles articles={relatedArticles} />

              {/* Related Magazine Stories (Supabase) — 카드형 */}
              {relatedMagazineStories.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    {locale === 'en' ? 'Magazine' : '관련 매거진'}
                  </h2>
                  <div className="space-y-4">
                    {relatedMagazineStories.map((story) => {
                      const storyTitle =
                        locale === 'en' && story.title_en ? story.title_en : story.title;
                      const storyExcerpt =
                        locale === 'en' && story.excerpt_en ? story.excerpt_en : story.excerpt;
                      const thumbUrl = story.thumbnail || extractFirstImage(story.body);
                      return (
                        <Link
                          key={story.id}
                          href={`/stories/${story.slug}`}
                          className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg"
                        >
                          {thumbUrl && (
                            <div className="relative aspect-[16/10] overflow-hidden">
                              <SafeImage
                                src={thumbUrl}
                                alt={storyTitle}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                          )}
                          <div className="p-4">
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-primary">
                              {locale === 'en' ? 'Magazine' : '매거진'}
                            </span>
                            <h3 className="text-sm font-bold mt-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-300">
                              {storyTitle}
                            </h3>
                            {storyExcerpt && (
                              <p className="text-xs text-charcoal-muted mt-1.5 line-clamp-2 leading-relaxed">
                                {storyExcerpt}
                              </p>
                            )}
                            <span className="text-[10px] text-charcoal-muted/60 mt-2 block">
                              {story.published_at}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
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
                  className="text-primary font-medium hover:underline text-sm"
                >
                  {t('viewAll')} →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherWorks.map((other) => (
                  <ArtworkCard key={other.id} artwork={other} variant="gallery" />
                ))}
              </div>
            </div>
          ) : null}

          {/* Same Category Works Section */}
          {sameCategoryWorks.length > 0 && artwork.category && (
            <div className="mt-24 pt-24 border-t border-gray-100">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-charcoal">
                  {t('sameCategoryWorks', {
                    category: getCategoryLabel(artwork.category, locale),
                  })}
                </h2>
                <Link
                  href={`/artworks/category/${encodeURIComponent(artwork.category)}`}
                  className="text-primary font-medium hover:underline text-sm"
                >
                  {t('viewAllCategory', {
                    category: getCategoryLabel(artwork.category, locale),
                  })}{' '}
                  →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {sameCategoryWorks.map((other) => (
                  <ArtworkCard key={other.id} artwork={other} variant="gallery" />
                ))}
              </div>
            </div>
          )}

          {/* Recently Sold Section */}
          <RecentlySoldSection artworks={recentlySold} totalCount={totalSoldCount} />
        </article>
      </Section>
    </>
  );
}
