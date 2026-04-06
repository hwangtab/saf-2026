import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import Section from '@/components/ui/Section';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import PageHero from '@/components/ui/PageHero';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';
import GalleryStatusBar from '@/components/features/GalleryStatusBar';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SITE_URL } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { generateArtworkPurchaseHowTo, generateArtworkPurchaseFAQ } from '@/lib/schemas/howto';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { parseArtworkPrice, resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { CATEGORY_EN_MAP, getCategoryLabel } from '@/lib/artwork-category';
import type { Artwork, ArtworkListItem } from '@/types';

export const revalidate = 600;

const PAGE_URL = `${SITE_URL}/artworks`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('artworksPage');

  // 실시간 작품 수와 가격 범위를 메타 description에 반영
  const artworks = await getSupabaseArtworks();
  const availableCount = artworks.filter((a) => !a.sold).length;
  const prices = artworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices).toLocaleString('ko-KR') : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices).toLocaleString('ko-KR') : null;

  const dynamicDescription =
    locale === 'en'
      ? `Browse ${artworks.length} original Korean artworks (${availableCount} available) — paintings, prints, photography, sculpture. Price range ₩${minPrice}–₩${maxPrice}. Free shipping, 7-day returns.`
      : `씨앗페 온라인에서 총 ${artworks.length}점의 작품 중 현재 ${availableCount}점 구매 가능. 가격대 ₩${minPrice}–₩${maxPrice}. 무료 배송, 7일 반품. 회화·판화·사진·조각 등 다양한 장르.`;

  const representativeArtwork = artworks.find((a) => !a.sold && a.images[0]) || artworks[0];
  const ogImageUrl = representativeArtwork?.images[0]
    ? resolveSeoArtworkImageUrl(representativeArtwork.images[0])
    : undefined;
  const ogImageAlt = representativeArtwork
    ? locale === 'en'
      ? `${representativeArtwork.title_en || representativeArtwork.title} by ${representativeArtwork.artist_en || representativeArtwork.artist} — SAF Online`
      : `${representativeArtwork.artist} 작가의 작품 "${representativeArtwork.title}" — 씨앗페 온라인`
    : undefined;

  return {
    ...createPageMetadata(
      t('title'),
      dynamicDescription,
      '/artworks',
      ogImageUrl,
      locale,
      ogImageAlt
    ),
    keywords:
      locale === 'en'
        ? 'Korean art, contemporary art, paintings for sale, original artworks, prints, sculpture, photography, art gallery'
        : '한국미술, 현대미술, 작품 구매, 회화, 판화, 조각, 사진, 미술 작품 판매',
  };
}

export default async function ArtworksPage() {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('artworksPage');
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const artworks = await getSupabaseArtworks();
  const listArtworks: ArtworkListItem[] = artworks.map(
    ({
      profile: _profile,
      history: _history,
      profile_en: _pe,
      history_en: _he,
      ...rest
    }: Artwork) => rest
  );
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  // 실시간 작품 수 (heroDescription 동적화용)
  const availableCount = artworks.filter((a) => !a.sold).length;
  const dynamicHeroDescription =
    locale === 'en'
      ? `${artworks.length} original artworks from ${new Set(artworks.map((a) => a.artist)).size} Korean artists. ${availableCount} available now. Free shipping, 7-day returns.`
      : `${new Set(artworks.map((a) => a.artist)).size}명 작가의 작품 ${artworks.length}점. 현재 ${availableCount}점 구매 가능. 무료 배송, 7일 반품.`;

  const artworksUrl = buildLocaleUrl('/artworks', locale);
  const itemListSchema = generateArtworkListSchema(artworks, locale, 30, artworksUrl);
  const aggregateOfferSchema = generateGalleryAggregateOffer(artworks, locale, artworksUrl);
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${artworksUrl}#webpage`,
    name: locale === 'en' ? 'Artworks — SAF Online' : '전시 작품 — 씨앗페 온라인',
    description: dynamicHeroDescription,
    url: artworksUrl,
    isPartOf: { '@id': `${SITE_URL}#website` },
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    mainEntity: { '@id': `${artworksUrl}#item-list` },
  };

  // 카테고리별 작품 수 계산 (네비게이션용)
  const categoryNav = Object.keys(CATEGORY_EN_MAP)
    .map((cat) => ({
      category: cat,
      displayName: getCategoryLabel(cat, locale),
      count: artworks.filter((a) => a.category === cat).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={collectionPageSchema} />
      <JsonLdScript data={itemListSchema} />
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}
      <JsonLdScript data={generateArtworkPurchaseHowTo(locale)} />
      <JsonLdScript data={generateArtworkPurchaseFAQ(locale)} />
      <div className="min-h-screen">
        <PageHero
          title={t('title')}
          description={dynamicHeroDescription}
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={PAGE_URL}
            title={t('shareTitle')}
            description={t('shareDescription')}
          />
        </PageHero>

        {/* 카테고리 바로가기 — 검색엔진이 크롤링할 수 있는 앵커 링크 */}
        <nav aria-label={locale === 'en' ? 'Browse by category' : '카테고리별 둘러보기'}>
          <div className="container-max py-4 flex flex-wrap gap-2">
            {categoryNav.map((cat) => (
              <a
                key={cat.category}
                href={buildLocaleUrl(
                  `/artworks/category/${encodeURIComponent(cat.category)}`,
                  locale
                )}
                className="px-4 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                {cat.displayName}
                <span className="ml-1 text-gray-400">{cat.count}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* Gallery Section */}
        <Section
          variant="primary-surface"
          prevVariant="white"
          padding="none"
          className="pt-6 md:pt-10 pb-12 md:pb-20"
        >
          <div className="container-max">
            <GalleryStatusBar className="mb-6" />
            <ArtworkGalleryWithSort artworks={listArtworks} />
          </div>
        </Section>

        {/* Campaign Banner */}
        <Section variant="white" prevVariant="primary-surface" className="pb-24 md:pb-32">
          <GalleryCampaignBanner />
        </Section>
      </div>
    </>
  );
}
