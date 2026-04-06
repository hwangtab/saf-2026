import { Metadata } from 'next';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import {
  getSupabaseArtworks,
  getSupabaseArtworkById,
  getRecentlySoldArtworks,
  getTotalSoldCount,
  getSupabaseTestimonials,
} from '@/lib/supabase-data';
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
import { generateArtworkPurchaseFAQ } from '@/lib/schemas/howto';
import { getCategoryLabel } from '@/lib/artwork-category';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import SupportMessage from '@/components/features/SupportMessage';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import ArtworkCard from '@/components/ui/ArtworkCard';
import ArtworkPurchaseCTA from '@/components/features/ArtworkPurchaseCTA';
import { containsHangul } from '@/lib/search-utils';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 600;

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const { id } = await params;
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

  // Parallel fetch: artwork detail + all artworks (cached) to avoid waterfall
  const [
    artwork,
    allArtworks,
    recentlySold,
    totalSoldCount,
    testimonialCategories,
    t,
    tBreadcrumbs,
  ] = await Promise.all([
    getSupabaseArtworkById(id),
    getSupabaseArtworks(),
    getRecentlySoldArtworks(3, id),
    getTotalSoldCount(),
    getSupabaseTestimonials(),
    getTranslations('artworkDetail'),
    getTranslations('breadcrumbs'),
  ]);

  if (!artwork) {
    notFound();
  }

  const flatTestimonials = testimonialCategories
    .flatMap((c) => c.items)
    .map((item) => ({
      quote: item.quote.replace(/<\/?strong>/g, ''),
      author: item.author,
    }));

  const otherWorks = allArtworks
    .filter((a) => a.artist === artwork.artist && a.id !== artwork.id)
    .slice(0, 3);

  // 같은 카테고리의 다른 작품 (같은 작가 제외, 최대 3점)
  const sameCategoryWorks = artwork.category
    ? allArtworks
        .filter((a) => a.category === artwork.category && a.id !== artwork.id && !a.sold)
        .slice(0, 3)
    : [];

  // Extract numeric price using utility
  const parsedPrice = parsePrice(artwork.price);
  const isInquiry = parsedPrice === Infinity;
  const numericPrice = isInquiry ? '0' : String(parsedPrice);

  // Get related articles for this artist
  const relatedArticles = getArticlesByArtist(artwork.artist);
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
    undefined,
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

  return (
    <>
      <JsonLdScript data={[productSchema, breadcrumbSchema, webPageSchema]} />
      <JsonLdScript data={faqSchema} />
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
                hasActionablePrice={hasActionablePrice}
                hasOtherWorks={otherWorks.length > 0}
                displayPrice={localizedPrice}
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
                    className="text-gray-700 leading-relaxed text-sm whitespace-pre-line"
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
                    className="text-gray-700 leading-relaxed text-sm whitespace-pre-line"
                  >
                    {localizedDescription}
                  </p>
                </div>
              )}

              {/* Artist History */}
              {localizedHistory && (
                <ExpandableHistory
                  history={localizedHistory}
                  className="bg-white border border-gray-100 shadow-sm"
                />
              )}

              {/* Related Articles */}
              <RelatedArticles articles={relatedArticles} />
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
