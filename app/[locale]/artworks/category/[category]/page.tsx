import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';

import { SITE_URL } from '@/lib/constants';
import { CATEGORY_EN_MAP } from '@/lib/artwork-category';
import { resolveLocale } from '@/lib/server-locale';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { getSupabaseArtworks } from '@/lib/supabase-data';
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
    ? representativeArtwork.images[0].startsWith('http')
      ? representativeArtwork.images[0]
      : `${SITE_URL}${representativeArtwork.images[0]}`
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
        images: [{ url: imageUrl, width: 1200, height: 630, alt: displayCategory }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
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
  const itemListSchema = generateArtworkListSchema(categoryArtworks, locale);
  const aggregateOfferSchema = generateGalleryAggregateOffer(categoryArtworks);

  const availableCount = categoryArtworks.filter((a) => !a.sold).length;
  const heroDescription = t('heroDescription', {
    count: categoryArtworks.length,
    availableCount,
  });

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={itemListSchema} />
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}

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

        <Section>
          <ArtworkGalleryWithSort artworks={listArtworks} />
        </Section>

        <GalleryCampaignBanner />
      </div>
    </>
  );
}
