import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';

import { SITE_URL, CONTACT } from '@/lib/constants';
import { CATEGORY_EN_MAP } from '@/lib/artwork-category';
import { resolveLocale } from '@/lib/server-locale';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { generateArtworkPurchaseHowTo, generateArtworkPurchaseFAQ } from '@/lib/schemas/howto';
import { parseArtworkPrice, resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { Link } from '@/i18n/navigation';
import type { Artwork, ArtworkListItem } from '@/types';

export const revalidate = 600;

interface Props {
  params: Promise<{ category: string }>;
}

/** 지원하는 카테고리 목록 (한국어 기준) */
const SUPPORTED_CATEGORIES = Object.keys(CATEGORY_EN_MAP);

function getCategoryEnName(category: string): string {
  return CATEGORY_EN_MAP[category] || category;
}

export async function generateStaticParams() {
  return SUPPORTED_CATEGORIES.map((category) => ({
    category: encodeURIComponent(category),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const { category: rawCategory } = await params;
  const category = decodeURIComponent(rawCategory);

  if (!SUPPORTED_CATEGORIES.includes(category)) {
    return { title: 'Not Found' };
  }

  const allArtworks = await getSupabaseArtworks();
  const categoryArtworks = allArtworks.filter((a) => a.category === category);
  const count = categoryArtworks.length;
  const availableCount = categoryArtworks.filter((a) => !a.sold).length;

  const categoryPath = `/artworks/category/${encodeURIComponent(category)}`;
  const t = await getTranslations('categoryPage');

  const isEnglish = locale === 'en';
  const displayCategory = isEnglish ? getCategoryEnName(category) : category;

  const title = t('title', { category: displayCategory });
  const description = t('metaDescription', {
    category: displayCategory,
    count,
    availableCount,
  });

  // 대표 이미지: 판매중인 첫 번째 작품 이미지
  const representativeArtwork =
    categoryArtworks.find((a) => !a.sold && a.images[0]) || categoryArtworks[0];
  const imageUrl = representativeArtwork?.images[0]
    ? resolveSeoArtworkImageUrl(representativeArtwork.images[0])
    : undefined;

  return {
    title,
    description,
    keywords: isEnglish
      ? [
          displayCategory,
          `${displayCategory} for sale`,
          `buy ${displayCategory.toLowerCase()}`,
          'Korean art',
          'SAF Online',
          'original artwork',
        ]
      : [
          category,
          `${category} 작품 구매`,
          `한국 ${category}`,
          '씨앗페 온라인',
          '미술 작품 판매',
          '현대미술',
        ],
    alternates: createLocaleAlternates(categoryPath, locale),
    openGraph: {
      title,
      description,
      url: buildLocaleUrl(categoryPath, locale),
      type: 'website',
      locale: isEnglish ? 'en_US' : 'ko_KR',
      siteName: isEnglish ? 'SAF Online' : '씨앗페 온라인',
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: isEnglish
              ? `${displayCategory} artworks — SAF Online`
              : `씨앗페 온라인 ${displayCategory} 작품 갤러리`,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            alt: isEnglish
              ? `${displayCategory} artworks — SAF Online`
              : `씨앗페 온라인 ${displayCategory} 작품 갤러리`,
          },
        ],
      }),
    },
    other: {
      'product:availability': availableCount > 0 ? 'in stock' : 'out of stock',
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const locale = resolveLocale(await getLocale());
  const { category: rawCategory } = await params;
  const category = decodeURIComponent(rawCategory);

  if (!SUPPORTED_CATEGORIES.includes(category)) {
    notFound();
  }

  const allArtworks = await getSupabaseArtworks();
  const categoryArtworks = allArtworks.filter((a) => a.category === category);

  if (categoryArtworks.length === 0) {
    notFound();
  }

  const listArtworks: ArtworkListItem[] = categoryArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );

  const isEnglish = locale === 'en';
  const displayCategory = isEnglish ? getCategoryEnName(category) : category;
  const t = await getTranslations('categoryPage');
  const tBreadcrumbs = await getTranslations('breadcrumbs');

  const categoryPath = `/artworks/category/${encodeURIComponent(category)}`;
  const pageUrl = buildLocaleUrl(categoryPath, locale);

  // Breadcrumb: 홈 > 출품작 > 카테고리
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: displayCategory, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  // ItemList + AggregateOffer
  const itemListSchema = generateArtworkListSchema(categoryArtworks, locale, 30, pageUrl);
  const aggregateOfferSchema = generateGalleryAggregateOffer(categoryArtworks, locale, pageUrl);

  const availableCount = categoryArtworks.filter((a) => !a.sold).length;
  const prices = categoryArtworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices).toLocaleString('ko-KR') : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices).toLocaleString('ko-KR') : null;
  const priceRange =
    minPrice && maxPrice
      ? isEnglish
        ? ` · ₩${minPrice}–₩${maxPrice}`
        : ` · ₩${minPrice}~₩${maxPrice}`
      : '';
  const heroDescription =
    t('heroDescription', { count: categoryArtworks.length, availableCount }) + priceRange;

  // CollectionPage: 카테고리 페이지의 WebPage 타입 명시 (Google에 컬렉션 페이지임을 알림)
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: t('title', { category: displayCategory }),
    description: heroDescription,
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: {
      '@type': 'Thing',
      name: isEnglish ? getCategoryEnName(category) : category,
    },
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
    mainEntity: { '@id': `${pageUrl}#item-list` },
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.category-hero-description'],
    },
  };

  // 관련 카테고리 (현재 카테고리 제외, 작품 수 기준 정렬)
  const categoryCounts = SUPPORTED_CATEGORIES.map((cat) => ({
    category: cat,
    displayName: isEnglish ? getCategoryEnName(cat) : cat,
    count: allArtworks.filter((a) => a.category === cat).length,
    path: `/artworks/category/${encodeURIComponent(cat)}`,
  }))
    .filter((c) => c.category !== category && c.count > 0)
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
          title={t('title', { category: displayCategory })}
          description={heroDescription}
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={`${SITE_URL}${categoryPath}`}
            title={t('shareTitle', { category: displayCategory })}
            description={t('shareDescription', { category: displayCategory })}
          />
        </PageHero>

        <Section
          variant="primary-surface"
          prevVariant="white"
          padding="none"
          className="pt-6 md:pt-10 pb-12 md:pb-20"
        >
          <div className="container-max">
            <ArtworkGalleryWithSort artworks={listArtworks} />
          </div>
        </Section>

        {/* 관련 카테고리 내부 링크 — 검색엔진 크롤링 및 구매자 탐색 지원 */}
        {categoryCounts.length > 0 && (
          <Section variant="white" prevVariant="primary-surface" className="pb-12">
            <div className="container-max">
              <p className="text-sm font-medium text-gray-500 mb-3">
                {isEnglish ? 'Browse other categories' : '다른 카테고리 작품'}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryCounts.map((cat) => (
                  <Link
                    key={cat.category}
                    href={cat.path}
                    className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    {cat.displayName}
                    <span className="ml-1 opacity-60">{cat.count}</span>
                  </Link>
                ))}
                <Link
                  href="/stories"
                  className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                >
                  {isEnglish ? 'Magazine' : '매거진'}
                </Link>
              </div>
            </div>
          </Section>
        )}

        <GalleryCampaignBanner />
      </div>
    </>
  );
}
