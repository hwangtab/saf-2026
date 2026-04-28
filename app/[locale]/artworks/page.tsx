import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import PageHero from '@/components/ui/PageHero';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';
import GalleryStatusBar from '@/components/features/GalleryStatusBar';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SITE_URL, CONTACT } from '@/lib/constants';
import { ARTIST_COUNT, ARTWORK_COUNT, LOAN_COUNT } from '@/lib/site-stats';
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
import { Link } from '@/i18n/navigation';
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
        ? 'Korean art exhibition catalog, contemporary art, paintings for sale, original artworks, prints, sculpture, photography, art gallery, Seoul exhibition'
        : '전시 도록, 전시회 도록, 서울 현대미술 전시, 한국미술, 현대미술, 작품 구매, 회화, 판화, 조각, 사진, 미술 작품 판매',
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
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '#page-hero-description'],
    },
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

  // 메인 카테고리 가이드 — visible H2 + 본문 (SEO 키워드 흡수)
  const mainCategoryGuides = [
    {
      key: '회화',
      title: t('categoryPaintingTitle'),
      description: t('categoryPaintingDescription'),
    },
    {
      key: '판화',
      title: t('categoryPrintTitle'),
      description: t('categoryPrintDescription'),
    },
    {
      key: '사진',
      title: t('categoryPhotoTitle'),
      description: t('categoryPhotoDescription'),
    },
    {
      key: '조각',
      title: t('categorySculptureTitle'),
      description: t('categorySculptureDescription'),
    },
  ];

  // FAQ — visible accordion (FAQ JSON-LD와 별개로 페이지 본문에 노출)
  const faqItems = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5', { loanCount: LOAN_COUNT }) },
    { q: t('faqQ6'), a: t('faqA6') },
  ];

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={collectionPageSchema} />
      <JsonLdScript data={itemListSchema} />
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}
      <JsonLdScript data={generateArtworkPurchaseHowTo(locale)} />
      <JsonLdScript data={generateArtworkPurchaseFAQ(locale)} />
      <div className={`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}`}>
        <PageHero
          title={t('title')}
          description={dynamicHeroDescription}
          descriptionId="page-hero-description"
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={PAGE_URL}
            title={t('shareTitle', {
              artistCount: ARTIST_COUNT,
              artworkCount: ARTWORK_COUNT,
              loanCount: LOAN_COUNT,
            })}
            description={t('shareDescription', {
              artistCount: ARTIST_COUNT,
              artworkCount: ARTWORK_COUNT,
              loanCount: LOAN_COUNT,
            })}
          />
        </PageHero>

        {/* 카테고리 바로가기 — 검색엔진 크롤링용, 시각적으로 숨김 (전체 카테고리) */}
        <nav
          aria-label={locale === 'en' ? 'Browse by category' : '카테고리별 둘러보기'}
          className="sr-only"
        >
          {categoryNav.map((cat) => (
            <Link
              key={cat.category}
              href={`/artworks/category/${encodeURIComponent(cat.category)}`}
            >
              {cat.displayName} ({cat.count})
            </Link>
          ))}
        </nav>

        {/* SEO Intro — 한국 작가 그림·미술품 구매 본문 (long-tail 키워드 흡수) */}
        <Section variant="white" padding="none" className="pt-8 md:pt-12">
          <div className="container-max max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-section font-normal text-charcoal-deep text-balance mb-6">
              {t('introHeading')}
            </h2>
            <div className="space-y-4 text-charcoal text-base md:text-lg leading-relaxed">
              <p>{t('introParagraph1', { artistCount: ARTIST_COUNT })}</p>
              <p>{t('introParagraph2', { loanCount: LOAN_COUNT })}</p>
            </div>
          </div>
        </Section>

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

        {/* Category Guide — 장르별 H2 + 가이드 텍스트 */}
        <Section variant="white" prevVariant="primary-surface" padding="default">
          <div className="container-max">
            <SectionTitle className="mb-4">{t('categoryGuideHeading')}</SectionTitle>
            <p className="text-charcoal-muted text-center max-w-2xl mx-auto mb-10 md:mb-12">
              {t('categoryGuideIntro')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-5xl mx-auto">
              {mainCategoryGuides.map((cat) => (
                <Link
                  key={cat.key}
                  href={`/artworks/category/${encodeURIComponent(cat.key)}`}
                  className="block bg-canvas-soft rounded-2xl p-6 md:p-7 border border-gray-200 hover:border-primary/40 hover:bg-canvas transition-colors"
                >
                  <h3 className="text-lg md:text-xl font-section font-normal text-charcoal-deep mb-3">
                    {cat.title}
                  </h3>
                  <p className="text-charcoal text-base leading-relaxed">{cat.description}</p>
                  <span className="inline-block mt-4 text-sm text-primary font-medium">
                    {t('categoryViewAll', { category: getCategoryLabel(cat.key, locale) })} →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Section>

        {/* Campaign Banner */}
        <Section variant="white" padding="default">
          <GalleryCampaignBanner />
        </Section>

        {/* FAQ — 그림 구매 자주 묻는 질문 */}
        <Section variant="white" padding="default">
          <div className="container-max max-w-3xl">
            <SectionTitle className="mb-8 md:mb-10">{t('faqHeading')}</SectionTitle>
            <div className="space-y-3">
              {faqItems.map((item, idx) => (
                <details
                  key={idx}
                  className="group bg-canvas-soft rounded-xl border border-gray-200 open:border-primary/30"
                >
                  <summary className="cursor-pointer p-5 font-medium text-charcoal-deep flex justify-between items-center list-none gap-4">
                    <span className="flex-1">{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="text-charcoal-muted transition-transform group-open:rotate-180 shrink-0"
                    >
                      ▾
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-charcoal leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
