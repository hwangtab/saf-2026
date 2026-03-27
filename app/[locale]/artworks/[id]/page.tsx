import { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import {
  getSupabaseArtworks,
  getSupabaseArtworkById,
  getRecentlySoldArtworks,
  getTotalSoldCount,
} from '@/lib/supabase-data';
import RecentlySoldSection from '@/components/features/RecentlySoldSection';
import Section from '@/components/ui/Section';
import { getArticlesByArtist } from '@/content/artist-articles';
import ArtworkImage from '@/components/features/ArtworkImage';
import ArtworkDetailNav from '@/components/features/ArtworkDetailNav';
import { parsePrice } from '@/lib/parsePrice';
import { SITE_URL } from '@/lib/constants';
import LinkButton from '@/components/ui/LinkButton';
import TrackClick from '@/components/common/TrackingLink';
import RelatedArticles from '@/components/features/RelatedArticles';
import ExpandableHistory from '@/components/features/ExpandableHistory';
import {
  generateArtworkMetadata,
  generateArtworkJsonLd,
  generateSpeakableSchema,
} from '@/lib/seo-utils';
import { getCategoryLabel } from '@/lib/artwork-category';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import SupportMessage from '@/components/features/SupportMessage';
import TrustBadges from '@/components/features/TrustBadges';
import { Phone, Mail } from 'lucide-react';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { containsHangul } from '@/lib/search-utils';

const PurchaseGuide = dynamic(() => import('@/components/features/PurchaseGuide'), {
  loading: () => <div className="h-20 rounded-xl shimmer-loading" aria-hidden="true" />,
});

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
  const [artwork, allArtworks, recentlySold, totalSoldCount, t] = await Promise.all([
    getSupabaseArtworkById(id),
    getSupabaseArtworks(),
    getRecentlySoldArtworks(3, id),
    getTotalSoldCount(),
    getTranslations('artworkDetail'),
  ]);

  if (!artwork) {
    notFound();
  }

  const otherWorks = allArtworks
    .filter((a) => a.artist === artwork.artist && a.id !== artwork.id)
    .slice(0, 3);

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

  // Generate JSON-LD schemas
  const { productSchema, breadcrumbSchema } = generateArtworkJsonLd(
    artwork,
    numericPrice,
    isInquiry,
    locale
  );

  const speakableSchema = generateSpeakableSchema([
    '#artwork-title',
    '#artist-name',
    '#artist-profile',
    '#artist-note',
  ]);

  return (
    <>
      <JsonLdScript data={[productSchema, breadcrumbSchema, speakableSchema]} />
      <Section
        variant="white"
        prevVariant="canvas-soft"
        padding="none"
        className="pb-24 md:pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))]"
      >
        <Suspense fallback={<div className="h-[57px] border-b bg-white/80" />}>
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
              />

              {/* Mobile Header: Title, Artist, Price (Visible only on mobile) */}
              <div className="block lg:hidden space-y-3 mt-6">
                <h1
                  id="artwork-title-mobile"
                  className="text-2xl font-bold font-sans text-charcoal break-keep text-center"
                >
                  {displayTitle}
                </h1>
                <div className="flex flex-col items-center gap-1">
                  <p id="artist-name-mobile" className="text-lg text-gray-600 font-medium">
                    {displayArtist}
                  </p>
                  {localizedPrice && (
                    <p className="text-xl font-bold text-charcoal">{localizedPrice}</p>
                  )}
                </div>
              </div>

              {/* Mobile CTA Section (visible only on mobile, right after title) */}
              <div className="block lg:hidden space-y-6 mt-6">
                {/* 구매 가이드 인라인 요약 */}
                {hasActionablePrice && !artwork.sold && (
                  <p className="text-center text-sm text-gray-500">{t('trustInline')}</p>
                )}

                {/* 온라인 구매 버튼 */}
                {hasActionablePrice && artwork.shopUrl && !artwork.sold && (
                  <>
                    <TrackClick
                      event="purchase_click"
                      properties={{
                        artwork_id: artwork.id,
                        artwork_title: artwork.title,
                        artist: artwork.artist,
                      }}
                    >
                      <LinkButton
                        href={artwork.shopUrl}
                        variant="primary"
                        size="lg"
                        external
                        className="w-full text-lg gap-3 rounded-xl"
                      >
                        {t('buyOnline')}
                      </LinkButton>
                    </TrackClick>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-gray-400 text-sm">{t('orContactDirectly')}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  </>
                )}

                {/* 구매 링크가 없는 경우 */}
                {hasActionablePrice && !artwork.shopUrl && !artwork.sold && (
                  <div className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-charcoal mb-4">{t('wantToBuy')}</h3>
                    <div className="flex justify-center items-center gap-2 text-xs text-gray-500 mb-6">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-primary shadow-sm">
                          1
                        </span>
                        <span>{t('stepInquiry')}</span>
                      </div>
                      <div className="w-12 h-px bg-gray-300 mb-4"></div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                          2
                        </span>
                        <span>{t('stepPayment')}</span>
                      </div>
                      <div className="w-12 h-px bg-gray-300 mb-4"></div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                          3
                        </span>
                        <span>{t('stepDelivery')}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-0 word-keep leading-relaxed">
                      {t('noShopDescription')}
                      <br />
                      <span className="font-semibold text-charcoal">{t('noShopContact')}</span>
                      {t('noShopSuffix')}
                      <br />
                      {t.rich('noShopGuide', {
                        highlight: (chunks) => (
                          <span className="text-primary font-medium">{chunks}</span>
                        ),
                      })}
                    </p>
                  </div>
                )}

                {/* 연락처 */}
                <div className="grid grid-cols-2 gap-4">
                  <LinkButton
                    href="tel:02-764-3114"
                    variant="accent"
                    leadingIcon={<Phone className="w-4 h-4" />}
                    iconLayout="fixed-left"
                  >
                    <span className="text-sm font-bold text-center">02-764-3114</span>
                  </LinkButton>
                  <LinkButton
                    href="mailto:contact@kosmart.org"
                    variant="accent"
                    leadingIcon={<Mail className="w-4 h-4" />}
                    iconLayout="fixed-left"
                  >
                    <span className="text-sm font-bold text-center">{t('emailInquiry')}</span>
                  </LinkButton>
                </div>

                {/* 신뢰배지 */}
                <TrustBadges />

                {/* 연대 메시지 */}
                <SupportMessage totalSoldCount={totalSoldCount} />
              </div>

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

              {/* Desktop CTA Section (hidden on mobile) */}
              <div className="hidden lg:block space-y-6">
                {/* 온라인 구매 버튼 */}
                {hasActionablePrice && artwork.shopUrl && !artwork.sold && (
                  <>
                    <PurchaseGuide className="mb-4" />

                    <TrackClick
                      event="purchase_click"
                      properties={{
                        artwork_id: artwork.id,
                        artwork_title: artwork.title,
                        artist: artwork.artist,
                      }}
                    >
                      <LinkButton
                        href={artwork.shopUrl}
                        variant="primary"
                        size="lg"
                        external
                        className="w-full text-lg gap-3 rounded-xl"
                      >
                        {t('buyOnline')}
                      </LinkButton>
                    </TrackClick>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-gray-400 text-sm">{t('orContactDirectly')}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  </>
                )}

                {/* 구매 링크가 없는 경우 */}
                {hasActionablePrice && !artwork.shopUrl && !artwork.sold && (
                  <>
                    <PurchaseGuide className="mb-6" />

                    <div className="bg-white rounded-xl p-6 mb-6 text-center border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-charcoal mb-4">{t('wantToBuy')}</h3>
                      <div className="flex justify-center items-center gap-2 text-xs text-gray-500 mb-6">
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-primary shadow-sm">
                            1
                          </span>
                          <span>{t('stepInquiry')}</span>
                        </div>
                        <div className="w-12 h-px bg-gray-300 mb-4"></div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                            2
                          </span>
                          <span>{t('stepPayment')}</span>
                        </div>
                        <div className="w-12 h-px bg-gray-300 mb-4"></div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                            3
                          </span>
                          <span>{t('stepDelivery')}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-0 word-keep leading-relaxed">
                        {t('noShopDescription')}
                        <br />
                        <span className="font-semibold text-charcoal">{t('noShopContact')}</span>
                        {t('noShopSuffix')}
                        <br />
                        {t.rich('noShopGuide', {
                          highlight: (chunks) => (
                            <span className="text-primary font-medium">{chunks}</span>
                          ),
                        })}
                      </p>
                    </div>
                  </>
                )}

                {/* 연락처 옵션 */}
                <div className="grid grid-cols-2 gap-4">
                  <LinkButton
                    href="tel:02-764-3114"
                    variant="accent"
                    leadingIcon={<Phone className="w-4 h-4" />}
                    iconLayout="fixed-left"
                  >
                    <span className="text-sm font-bold text-center">02-764-3114</span>
                  </LinkButton>
                  <LinkButton
                    href="mailto:contact@kosmart.org"
                    variant="accent"
                    leadingIcon={<Mail className="w-4 h-4" />}
                    iconLayout="fixed-left"
                  >
                    <span className="text-sm font-bold text-center">{t('emailInquiry')}</span>
                  </LinkButton>
                </div>

                {/* Campaign Support Message */}
                <SupportMessage className="mt-4" totalSoldCount={totalSoldCount} />
              </div>
            </div>

            {/* Right Column: Info Section */}
            <div className="space-y-8">
              <header className="hidden lg:block mb-6 border-b border-gray-100 pb-6 lg:border-none lg:pb-0 lg:mb-0">
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

              <TrustBadges className="mb-6 hidden lg:flex" />

              <div className="border-t border-b border-gray-100 py-6">
                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 items-baseline">
                  {/* 분류 */}
                  {artwork.category && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">{t('category')}</span>
                      <Link
                        href={`/artworks?category=${encodeURIComponent(artwork.category)}`}
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

              {/* Artist Profile (profile only, no history) */}
              {localizedProfile && (
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    {t('artistProfile')}
                  </h3>
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
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    {t('artistNote')}
                  </h3>
                  <p
                    id="artist-note"
                    className="text-gray-700 leading-relaxed text-sm whitespace-pre-line"
                  >
                    {localizedDescription}
                  </p>
                </div>
              )}

              {/* Artist History - separate card, below artist note */}
              {localizedHistory && <ExpandableHistory history={localizedHistory} />}

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

          {/* Recently Sold Section */}
          <RecentlySoldSection artworks={recentlySold} totalCount={totalSoldCount} />
        </article>
      </Section>
    </>
  );
}
