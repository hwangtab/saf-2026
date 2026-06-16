import { Metadata } from 'next';
import { getTranslations, setRequestLocale, getLocale } from 'next-intl/server';
import { Palette } from 'lucide-react';

import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import LinkButton from '@/components/ui/LinkButton';
import ScrollToTopOnMount from '@/components/common/ScrollToTopOnMount';
import {
  SAWTOOTH_BOTTOM_SAFE_PADDING,
  SAWTOOTH_TOP_SAFE_PADDING,
} from '@/components/ui/SawtoothDivider';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';

import { SITE_URL, CONTACT } from '@/lib/constants';
import { LOAN_COUNT } from '@/lib/site-stats';
import { getLiveStats } from '@/lib/live-stats';
import { CATEGORY_EN_MAP, getCategoryDisplayName } from '@/lib/artwork-category';
import { getHeroOverride, pickListingHeroImage } from '@/lib/hero-curation';
import { resolveLocale } from '@/lib/server-locale';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { generateArtworkPurchaseHowTo, generateArtworkPurchaseFAQ } from '@/lib/schemas/howto';
import { parseArtworkPrice, resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { getSupabaseArtworksByCategory, getSupabaseStoriesLight } from '@/lib/supabase-data';
import { getMediumHubSlug, getMediumCommerceHubSlug } from '@/lib/artwork-medium-hub';
import { Link } from '@/i18n/navigation';
import type { Artwork, ArtworkListItem } from '@/types';
import { getCategorySeoContent } from '@/lib/category-seo-content';

// force-dynamic — 'TypeError: Invalid character' 회귀 회피. Next.js 16.2.6의 compiled
// 런타임 번들(dist/compiled/next-server/app-page*.runtime.prod.js)이 비-ASCII 라우트
// 세그먼트(한글 카테고리명)에 btoa()를 raw 호출해 정적 segment-prefetch 생성 시 throw한다
// (DOMException 'Invalid character'). 소스 패치는 minified 런타임 번들에 닿지 않아 비현실적·
// 취약 — force-dynamic은 정적 prefetch(collectSegmentData) 경로를 아예 타지 않아 throw를
// 원천 차단한다. SEO 영향 없음(Googlebot 첫 hit SSR 200). artist 페이지도 동일 이유.
// 잘못된 카테고리는 renderCategoryPage의 SUPPORTED_CATEGORIES 체크가 CategoryNotFoundView로
// 처리하므로 dynamicParams=false 불필요. (회귀: 2026-06-16 force-static 시 segment-prefetch throw)
// ⏳ 임시 우회 — 업스트림 버그 추적: https://github.com/vercel/next.js/issues/94840
//    Next가 수정·릴리스하면 업그레이드 후 force-static + revalidate 복원할 것.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
  params: Promise<{ locale: string; category: string }>;
}

/** 지원하는 카테고리 목록 (한국어 기준) */
const SUPPORTED_CATEGORIES = Object.keys(CATEGORY_EN_MAP);

function getCategoryEnName(category: string): string {
  return CATEGORY_EN_MAP[category] || category;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const category = decodeURIComponent(rawCategory);

  if (!SUPPORTED_CATEGORIES.includes(category)) {
    return { title: 'Not Found' };
  }

  const categoryArtworks = await getSupabaseArtworksByCategory(category);
  const count = categoryArtworks.length;
  const availableCount = categoryArtworks.filter((a) => !a.sold).length;

  const categoryPath = `/artworks/category/${encodeURIComponent(category)}`;
  const t = await getTranslations({ locale, namespace: 'categoryPage' });

  const isEnglish = locale === 'en';
  // 홈 카테고리 라벨(`사진·미디어`/`입체·공예`)과 카테고리 페이지 h1 일치 — getCategoryDisplayName.
  // 매핑 없는 slug(`회화`/`판화` 등)는 한국어 slug 그대로, 영문은 CATEGORY_EN_MAP fallback.
  const displayCategory = getCategoryDisplayName(category, locale);

  const title = t('title', { category: displayCategory, count });
  const description = t('metaDescription', {
    category: displayCategory,
    count,
    availableCount,
    loanCount: LOAN_COUNT,
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
    alternates: createLocaleAlternates(categoryPath, locale, true),
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
    // product:availability를 metadata.other에 넣지 않는다 — name=으로 렌더되어 RDFa
    // property= 기준인 소셜 파서가 무시하고, 목록 페이지는 product 단위 개체도 아니라
    // 의미가 없음 (2026-06-12 감사에서 제거).
    // 영어 카테고리 페이지는 한국어 콘텐츠만 있어 thin content — 색인 제외
    ...(isEnglish ? { robots: { index: false, follow: true } } : {}),
  };
}

async function CategoryNotFoundView() {
  const locale = await getLocale().catch(() => 'ko');
  const isEn = locale === 'en';
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft pt-20">
      <ScrollToTopOnMount />
      <div className="max-w-md px-6 text-center">
        <Palette aria-hidden="true" className="mx-auto h-16 w-16 text-charcoal-muted mb-6" />
        <h1 className="mb-4 text-2xl font-bold text-charcoal">
          {isEn ? 'Category Not Found' : '카테고리를 찾을 수 없습니다'}
        </h1>
        <p className="mb-8 leading-relaxed text-charcoal-muted">
          {isEn
            ? 'This category may have been removed or does not exist. Browse all artworks instead.'
            : '해당 카테고리는 존재하지 않거나 변경됐을 수 있습니다. 전체 작품을 둘러보세요.'}
        </p>
        <LinkButton href="/artworks" variant="primary">
          {isEn ? 'Browse All Artworks' : '전체 작품 보기'}
        </LinkButton>
      </div>
    </div>
  );
}

export default async function CategoryPage(props: Props) {
  // force-static + notFound() 회귀 + body 렌더 단계 throw 양쪽 흡수.
  try {
    return await renderCategoryPage(props);
  } catch (err) {
    const { category } = await props.params;
    console.error(
      `[category-page] render failed for "${decodeURIComponent(category)}":`,
      err instanceof Error ? err.stack : err
    );
    return <CategoryNotFoundView />;
  }
}

async function renderCategoryPage({ params }: Props) {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const category = decodeURIComponent(rawCategory);

  if (!SUPPORTED_CATEGORIES.includes(category)) {
    return <CategoryNotFoundView />;
  }

  const [categoryArtworks, { artistCount }, allStories] = await Promise.all([
    getSupabaseArtworksByCategory(category),
    getLiveStats(),
    getSupabaseStoriesLight(),
  ]);

  if (categoryArtworks.length === 0) {
    return <CategoryNotFoundView />;
  }

  // 매체 hub 인링크 — knowledge + commerce 각각 결정론적으로 1편.
  const mediumHubSlug = getMediumHubSlug(category);
  const mediumHubStory = mediumHubSlug ? allStories.find((s) => s.slug === mediumHubSlug) : null;
  const commerceHubSlug = getMediumCommerceHubSlug(category);
  const commerceHubStory =
    commerceHubSlug && commerceHubSlug !== mediumHubSlug
      ? allStories.find((s) => s.slug === commerceHubSlug)
      : null;

  const listArtworks: ArtworkListItem[] = categoryArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );

  const isEnglish = locale === 'en';
  // 카테고리 페이지 hero/breadcrumb/share title 등 모두 동일 group 라벨 사용.
  const displayCategory = getCategoryDisplayName(category, locale);
  const t = await getTranslations({ locale, namespace: 'categoryPage' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

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
    name: t('title', { category: displayCategory, count: categoryArtworks.length }),
    description: heroDescription,
    isPartOf: { '@id': `${SITE_URL}#website` },
    // 카테고리 명 Thing + 매체 hub + commerce hub CreativeWork — schema entity cluster.
    about: [
      { '@type': 'Thing' as const, name: isEnglish ? getCategoryEnName(category) : category },
      ...(mediumHubStory
        ? [
            {
              '@type': 'CreativeWork' as const,
              '@id': `${SITE_URL}/stories/${mediumHubStory.slug}#about`,
              url: `${SITE_URL}/stories/${mediumHubStory.slug}`,
              name:
                isEnglish && mediumHubStory.title_en
                  ? mediumHubStory.title_en
                  : mediumHubStory.title,
            },
          ]
        : []),
      ...(commerceHubStory
        ? [
            {
              '@type': 'CreativeWork' as const,
              '@id': `${SITE_URL}/stories/${commerceHubStory.slug}#about`,
              url: `${SITE_URL}/stories/${commerceHubStory.slug}`,
              name:
                isEnglish && commerceHubStory.title_en
                  ? commerceHubStory.title_en
                  : commerceHubStory.title,
            },
          ]
        : []),
    ],
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
      cssSelector: ['h1', '#category-hero-description'],
    },
    audience: {
      '@type': 'PeopleAudience',
      audienceType: isEnglish
        ? `Collectors and buyers looking for Korean ${displayCategory.toLowerCase()}`
        : `한국 ${displayCategory}을 찾는 컬렉터와 첫 구매자`,
    },
    // 캠페인 기간 — 카테고리 페이지가 SAF 2026 전시 기간 내내 active 상태임을 명시.
    datePublished: '2026-01-26',
    dateModified: new Date().toISOString().slice(0, 10),
  };

  // 관련 카테고리 (현재 카테고리 제외, 정적 순서로 표시)
  const categoryCounts = SUPPORTED_CATEGORIES.filter((cat) => cat !== category).map((cat) => ({
    category: cat,
    displayName: getCategoryDisplayName(cat, locale),
    count: 0,
    path: `/artworks/category/${encodeURIComponent(cat)}`,
  }));

  // SEO 랜딩 콘텐츠 — 카테고리별 introductory 본문 + FAQ (long-tail 검색어 흡수)
  const seoContent = getCategorySeoContent(category);
  const introText = isEnglish ? seoContent?.introEn : seoContent?.intro;
  const faqs = isEnglish ? seoContent?.faqsEn : seoContent?.faqs;

  // Featured artists — 해당 카테고리에서 작품 많은 작가 top 6
  const artistWorkCounts = categoryArtworks.reduce<Record<string, number>>((acc, a) => {
    if (a.artist) acc[a.artist] = (acc[a.artist] || 0) + 1;
    return acc;
  }, {});
  const featuredArtists = Object.entries(artistWorkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([artist, count]) => ({ artist, count }));

  // Price range buckets — 카테고리 내 가격 분포 (저가/중가/고가)
  const priceBuckets = (() => {
    const lowCount = prices.filter((p) => p < 1_000_000).length;
    const midCount = prices.filter((p) => p >= 1_000_000 && p < 5_000_000).length;
    const highCount = prices.filter((p) => p >= 5_000_000).length;
    return { lowCount, midCount, highCount };
  })();

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={collectionPageSchema} />
      <JsonLdScript data={itemListSchema} />
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}
      <JsonLdScript data={generateArtworkPurchaseHowTo(locale, { artistCount })} />
      <JsonLdScript data={generateArtworkPurchaseFAQ(locale)} />

      <div className={`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}`}>
        <PageHero
          title={t('title', { category: displayCategory, count: categoryArtworks.length })}
          description={heroDescription}
          descriptionId="category-hero-description"
          breadcrumbItems={breadcrumbItems}
          customBackgroundImage={
            getHeroOverride(`artworks/category/${category}`) ??
            pickListingHeroImage(categoryArtworks, (a) => (!a.sold && a.images?.[0]) || undefined)
          }
        >
          <ShareButtonsWrapper
            url={`${SITE_URL}${categoryPath}`}
            title={t('shareTitle', { category: displayCategory, count: categoryArtworks.length })}
            description={t('shareDescription', { category: displayCategory })}
          />
        </PageHero>

        {/* SEO 랜딩 콘텐츠 — introductory text + featured artists + price range.
            카테고리 페이지를 long-tail 검색어("회화 작품 구매", "한국 판화 작가" 등)
            흡수 페이지로 격상. visible 본문이라 사용자에게도 가치 전달. */}
        {introText && (
          <Section
            variant="white"
            prevVariant="white"
            className={`${SAWTOOTH_BOTTOM_SAFE_PADDING} pb-8 md:pb-12`}
          >
            <div className="container-max max-w-3xl">
              <div className="space-y-4 text-charcoal text-base md:text-lg leading-relaxed">
                {introText.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-balance">
                    {paragraph}
                  </p>
                ))}
              </div>

              {featuredArtists.length > 0 && (
                <div className="mt-10 md:mt-12">
                  <h2 className="text-xl md:text-2xl font-section font-bold text-charcoal-deep mb-4">
                    {isEnglish
                      ? `Featured ${displayCategory} Artists`
                      : `${displayCategory} 추천 작가`}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {featuredArtists.map(({ artist, count }) => (
                      <Link
                        key={artist}
                        href={`/artworks/artist/${encodeURIComponent(artist)}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-canvas-soft border border-gray-200 rounded-full text-sm font-medium text-charcoal hover:bg-primary-surface hover:border-primary/30 transition-colors"
                      >
                        <span>{artist}</span>
                        <span className="text-xs text-charcoal-muted">{count}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(priceBuckets.lowCount > 0 ||
                priceBuckets.midCount > 0 ||
                priceBuckets.highCount > 0) && (
                <div className="mt-10 md:mt-12">
                  <h2 className="text-xl md:text-2xl font-section font-bold text-charcoal-deep mb-4">
                    {isEnglish ? 'Price Range Distribution' : '가격대별 작품 수'}
                  </h2>
                  <dl className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-canvas-soft border border-gray-200 px-4 py-5">
                      <dt className="text-xs text-charcoal-muted mb-1">
                        {isEnglish ? 'Under ₩1M' : '100만 원 미만'}
                      </dt>
                      <dd className="text-2xl font-display font-bold text-charcoal-deep">
                        {priceBuckets.lowCount}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-canvas-soft border border-gray-200 px-4 py-5">
                      <dt className="text-xs text-charcoal-muted mb-1">
                        {isEnglish ? '₩1M – ₩5M' : '100만 ~ 500만 원'}
                      </dt>
                      <dd className="text-2xl font-display font-bold text-charcoal-deep">
                        {priceBuckets.midCount}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-canvas-soft border border-gray-200 px-4 py-5">
                      <dt className="text-xs text-charcoal-muted mb-1">
                        {isEnglish ? 'Over ₩5M' : '500만 원 이상'}
                      </dt>
                      <dd className="text-2xl font-display font-bold text-charcoal-deep">
                        {priceBuckets.highCount}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </Section>
        )}

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

        {/* 매체 hub 인링크 — knowledge(작품 이해) + commerce(가격/구매) 결정론 link */}
        {(mediumHubStory || commerceHubStory) && (
          <Section variant="white" prevVariant="primary-surface" className="pt-12 pb-12">
            <div className="container-max max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-section font-bold text-charcoal-deep mb-6">
                {isEnglish ? `Deeper into ${displayCategory}` : `${displayCategory} 더 깊이 보기`}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {mediumHubStory && (
                  <Link
                    href={`/stories/${mediumHubStory.slug}`}
                    className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 hover:bg-canvas-strong transition-colors"
                  >
                    <div className="text-eyebrow mb-2 text-primary-strong">
                      {isEnglish ? 'Magazine guide' : '매거진 가이드'}
                    </div>
                    <div className="text-base font-medium text-charcoal-deep leading-snug">
                      {isEnglish && mediumHubStory.title_en
                        ? mediumHubStory.title_en
                        : mediumHubStory.title}
                    </div>
                  </Link>
                )}
                {commerceHubStory && (
                  <Link
                    href={`/stories/${commerceHubStory.slug}`}
                    className="block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 hover:bg-canvas-strong transition-colors"
                  >
                    <div className="text-eyebrow mb-2 text-primary-strong">
                      {isEnglish ? 'Pricing & buying' : '가격·구매 가이드'}
                    </div>
                    <div className="text-base font-medium text-charcoal-deep leading-snug">
                      {isEnglish && commerceHubStory.title_en
                        ? commerceHubStory.title_en
                        : commerceHubStory.title}
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* 카테고리별 자주 묻는 질문 — visible accordion (long-tail "X 뜻", "X 가격" 검색 흡수) */}
        {faqs && faqs.length > 0 && (
          <Section
            variant="white"
            prevVariant={mediumHubStory || commerceHubStory ? 'white' : 'primary-surface'}
            className="pt-12 pb-12"
          >
            <div className="container-max max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-section font-bold text-charcoal-deep mb-6">
                {isEnglish
                  ? `${displayCategory}: Frequently Asked Questions`
                  : `${displayCategory} 자주 묻는 질문`}
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl bg-canvas-soft border border-gray-200 overflow-hidden"
                  >
                    <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 text-base font-medium text-charcoal hover:bg-primary-surface transition-colors">
                      <span className="flex-1">{faq.q}</span>
                      <span
                        aria-hidden="true"
                        className="text-charcoal-muted transition-transform group-open:rotate-180 shrink-0"
                      >
                        ▼
                      </span>
                    </summary>
                    <div className="px-5 pb-5 text-sm md:text-base text-charcoal leading-relaxed">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* 관련 카테고리 내부 링크 — 검색엔진 크롤링 및 구매자 탐색 지원 */}
        {categoryCounts.length > 0 && (
          <Section
            variant="white"
            prevVariant={faqs && faqs.length > 0 ? 'white' : 'primary-surface'}
            className="pb-12"
          >
            <div className="container-max">
              <p className="text-sm font-medium text-charcoal-muted mb-3">
                {isEnglish ? 'Browse other categories' : '다른 카테고리 작품'}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryCounts.map((cat) => (
                  <Link
                    key={cat.category}
                    href={cat.path}
                    className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-gallery-hairline bg-white text-charcoal hover:bg-canvas-strong transition-colors"
                  >
                    {cat.displayName}
                    {cat.count > 0 && <span className="ml-1 opacity-60">{cat.count}</span>}
                  </Link>
                ))}
                <Link
                  href="/stories"
                  className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-primary/20 bg-primary-surface text-primary-strong hover:bg-primary-surface transition-colors"
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
