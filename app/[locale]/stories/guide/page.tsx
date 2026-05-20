import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getSupabaseStoriesLight } from '@/lib/supabase-data';
import type { StoryLight } from '@/lib/supabase-data';
import { STORY_CLUSTERS } from '@/lib/story-clusters';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveEnRobots } from '@/lib/en-indexable';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { resolveLocale } from '@/lib/server-locale';
import { SITE_URL, CONTACT, OG_IMAGE } from '@/lib/constants';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-static';
export const revalidate = 1800;

type LocaleCode = 'ko' | 'en';

type GuideCopy = {
  seoTitle: string;
  pageTitle: string;
  pageDescription: string;
  heroTitle: string;
  heroDescription: string;
  introProse: string;
  clusters: Record<string, { heading: string; description: string }>;
  artworksCta: string;
  artworksCtaLabel: string;
  readMore: string;
};

const COPY: Record<LocaleCode, GuideCopy> = {
  ko: {
    seoTitle:
      '에디션 뜻·호수·넘버링·판화·피그먼트 프린트 총정리 — 작품 살 때 꼭 아는 용어 | 씨앗페',
    pageTitle: '컬렉팅 가이드',
    pageDescription:
      '미술 작품 구매 전 꼭 알아야 할 용어. 에디션 뜻, 호수 사이즈 기준, 판화·피그먼트 프린트 차이, 넘버링 방법까지 씨앗페 전문 가이드로 한번에 정리.',
    heroTitle: '작품 읽는 법',
    heroDescription: '에디션·호수·판화·피그먼트 — 구매 전 꼭 아는 용어 총정리',
    introProse:
      '에디션(edition)이란 같은 원판으로 여러 장 제작한 판화·사진 작품을 가리킵니다. 호수는 한국 화단의 캔버스 규격 단위(10호 ≈ 53×41cm, 50호 ≈ 116×91cm), 넘버링은 "3/50"처럼 순서·총 발행 수를 표시하는 방법입니다. 아래 가이드에서 각 용어를 자세히 알아보세요.',
    clusters: {
      'editions-prints': {
        heading: '에디션·판화·넘버링',
        description: '판화 기법, 에디션 개념, 넘버링·피그먼트 인쇄의 모든 것',
      },
      'sizes-and-mediums': {
        heading: '작품 크기·매체 읽는 법',
        description: '호수 환산표, 매체별 특성, 유화·수채·드로잉 비교',
      },
    },
    artworksCta: '배운 내용을 바탕으로 실제 작품을 살펴보세요.',
    artworksCtaLabel: '씨앗페 작품 보기',
    readMore: '자세히 읽기',
  },
  en: {
    seoTitle: 'Art Collecting Guide — Edition, Ho Size, Numbering & Printmaking Glossary | SAF',
    pageTitle: 'Collecting Guide',
    pageDescription:
      'Everything you need to know before buying Korean art. Edition types, Ho sizing chart, printmaking techniques, pigment prints, and numbering explained.',
    heroTitle: 'How to Read an Artwork',
    heroDescription: 'Edition · Ho size · Printmaking · Pigment print — terminology guide',
    introProse:
      "An edition is a series of identical prints or photographs produced from the same plate or file. The Korean 'ho' sizing system defines canvas sizes (10ho ≈ 53×41cm, 50ho ≈ 116×91cm), and numbering like '3/50' indicates position in the edition and total print run. Explore each topic in detail below.",
    clusters: {
      'editions-prints': {
        heading: 'Editions, Prints & Numbering',
        description: 'Printmaking techniques, edition concepts, numbering and pigment printing',
      },
      'sizes-and-mediums': {
        heading: 'Size & Medium Guide',
        description:
          'Ho size conversion chart, medium characteristics, oil vs watercolour vs drawing',
      },
    },
    artworksCta: 'Browse real artworks and apply what you have learned.',
    artworksCtaLabel: 'Browse SAF Artworks',
    readMore: 'Read more',
  },
};

const CATEGORY_LABELS: Record<LocaleCode, Record<string, string>> = {
  ko: {
    'artist-story': '작가를 만나다',
    'buying-guide': '컬렉팅 시작하기',
    'art-knowledge': '미술 산책',
  },
  en: {
    'artist-story': 'Artist Stories',
    'buying-guide': 'Buying Guide',
    'art-knowledge': 'Art Knowledge',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEn = locale === 'en';
  const copy = COPY[locale];
  const path = '/stories/guide';
  const pageUrl = buildLocaleUrl(path, locale);

  return {
    title: copy.seoTitle,
    description: copy.pageDescription,
    alternates: createLocaleAlternates(path, locale, true),
    ...(() => {
      const enRobots = resolveEnRobots(locale, false);
      return enRobots ? { robots: enRobots } : {};
    })(),
    openGraph: {
      title: copy.seoTitle,
      description: copy.pageDescription,
      url: pageUrl,
      type: 'website',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      locale: isEn ? 'en_US' : 'ko_KR',
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.seoTitle,
      description: copy.pageDescription,
      images: [{ url: OG_IMAGE.url, alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt }],
    },
  };
}

export default async function StoriesGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEn = locale === 'en';
  const copy = COPY[locale];

  const allStories = await getSupabaseStoriesLight();
  const storyBySlug = new Map<string, StoryLight>(allStories.map((s) => [s.slug, s]));

  const clusterEntries = Object.entries(STORY_CLUSTERS).map(([clusterId, slugs]) => ({
    clusterId,
    stories: slugs.flatMap((slug) => {
      const s = storyBySlug.get(slug);
      return s ? [s] : [];
    }),
  }));
  const nonEmptyClusters = clusterEntries.filter((c) => c.stories.length > 0);
  const allSpokes = nonEmptyClusters.flatMap((c) => c.stories);

  const path = '/stories/guide';
  const breadcrumbItems = [
    { name: isEn ? 'Home' : '홈', url: buildLocaleUrl('/', locale) },
    { name: isEn ? 'Magazine' : '매거진', url: buildLocaleUrl('/stories', locale) },
    { name: copy.pageTitle, url: buildLocaleUrl(path, locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: copy.seoTitle,
    description: copy.pageDescription,
    url: buildLocaleUrl(path, locale),
    inLanguage: 'ko-KR',
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    ...(allSpokes.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: allSpokes.length,
            itemListElement: allSpokes.map((story, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: buildLocaleUrl(`/stories/${story.slug}`, locale),
              name: isEn && story.title_en ? story.title_en : story.title,
            })),
          },
        }
      : {}),
  };

  return (
    <>
      <JsonLdScript data={[collectionSchema, breadcrumbSchema]} />
      <PageHero
        title={copy.heroTitle}
        description={copy.heroDescription}
        breadcrumbItems={breadcrumbItems}
      />

      {/* Answer-first intro prose — featured snippet 후보 */}
      <Section variant="white">
        <div className="max-w-3xl mx-auto px-4 sm:px-5">
          <p className="text-lg md:text-xl text-charcoal leading-relaxed">{copy.introProse}</p>
        </div>
      </Section>

      {/* Cluster sections — alternating canvas / white */}
      {nonEmptyClusters.map(({ clusterId, stories }, ci) => (
        <Section
          key={clusterId}
          variant={ci % 2 === 0 ? 'canvas' : 'white'}
          prevVariant={ci === 0 ? 'white' : ci % 2 === 0 ? 'white' : 'canvas'}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-5">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-charcoal-deep mb-2">
                {copy.clusters[clusterId]?.heading ?? clusterId}
              </h2>
              <p className="text-charcoal-muted">{copy.clusters[clusterId]?.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story, i) => {
                const title = isEn && story.title_en ? story.title_en : story.title;
                const excerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
                const catLabel = CATEGORY_LABELS[locale][story.category] ?? story.category;
                return (
                  <Link
                    key={story.id}
                    href={`/stories/${story.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 0.07}s`,
                      animationFillMode: 'forwards',
                    }}
                  >
                    {story.thumbnail && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <SafeImage
                          src={story.thumbnail}
                          alt={title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <span className="inline-block text-xs font-semibold tracking-wider uppercase text-primary-strong mb-2">
                        {catLabel}
                      </span>
                      <h3 className="text-card-title text-charcoal line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-300">
                        {title}
                      </h3>
                      {excerpt && (
                        <p className="text-sm text-charcoal-muted line-clamp-2 leading-relaxed">
                          {excerpt}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                        {copy.readMore}
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Section>
      ))}

      {/* Artworks CTA */}
      <Section
        variant={nonEmptyClusters.length % 2 === 0 ? 'canvas' : 'white'}
        prevVariant={nonEmptyClusters.length % 2 === 0 ? 'white' : 'canvas'}
        className="pb-16 md:pb-24"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-5 text-center">
          <p className="text-lg text-charcoal-muted mb-6">{copy.artworksCta}</p>
          <Link
            href="/artworks"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-strong hover:gap-3"
          >
            {copy.artworksCtaLabel}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </Section>
    </>
  );
}
