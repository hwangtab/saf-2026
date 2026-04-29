import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getLocale } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import { getSupabaseStories } from '@/lib/supabase-data';
import { CONTACT, OG_IMAGE, SITE_URL } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { Link } from '@/i18n/navigation';
import StoriesCategoryFilter from '@/components/stories/StoriesCategoryFilter';
import { STORY_CATEGORIES, type StoryCategory } from '@/types';

export const revalidate = 300;

/** body 마크다운에서 첫 번째 이미지 URL 추출 */
function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

type LocaleCode = 'ko' | 'en';

type StoriesPageCopy = {
  pageTitle: string;
  seoTitle: string;
  pageDescription: string;
  heroTitle: string;
  heroDescription: string;
  noStories: string;
  noStoriesHint: string;
  readMore: string;
  collectionName: string;
  collectionDescription: string;
};

const STORIES_COPY: Record<LocaleCode, StoriesPageCopy> = {
  ko: {
    pageTitle: '매거진',
    // SEO `<title>`은 길게 — H1과 분리. SERP 차별화·키워드 매칭 향상.
    seoTitle: '씨앗페 매거진 — 작가 인터뷰·미술 상식·컬렉팅 가이드 | 한국 현대미술',
    pageDescription:
      '전시회 추천, 작가 인터뷰, 컬렉팅 가이드, 미술 상식까지. 씨앗페 온라인 매거진에서 전시회를 즐기는 방법을 찾아보세요.',
    heroTitle: '매거진',
    heroDescription: '작가의 이야기, 컬렉팅 가이드, 미술 상식까지',
    noStories: '아직 등록된 글이 없습니다.',
    noStoriesHint: '곧 새로운 글이 찾아옵니다.',
    readMore: '자세히 읽기',
    collectionName: '씨앗페 온라인 매거진',
    collectionDescription: '작가 이야기, 작품 구매 가이드, 미술 상식을 만나보세요.',
  },
  en: {
    pageTitle: 'Magazine',
    seoTitle:
      'SAF Magazine — Artist Interviews, Art Guides & Collecting Tips | Korean Contemporary Art',
    pageDescription:
      'Artist stories, collecting guides, and art knowledge. Get closer to art with the SAF Online Magazine.',
    heroTitle: 'Magazine',
    heroDescription: 'Artist stories, collecting guides, and art knowledge',
    noStories: 'No stories available yet.',
    noStoriesHint: 'New stories are coming soon.',
    readMore: 'Read more',
    collectionName: 'SAF Online Magazine',
    collectionDescription: 'Discover artist stories, buying guides, and art knowledge.',
  },
};

const CATEGORY_LABELS: Record<LocaleCode, Record<StoryCategory, string>> = {
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

const toValidStoryCategory = (value?: string): StoryCategory | null => {
  if (!value) return null;
  if (STORY_CATEGORIES.includes(value as StoryCategory)) {
    return value as StoryCategory;
  }
  return null;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = STORIES_COPY[locale];
  const params = await searchParams;
  const hasQueryParams = Object.values(params).some((value) => Boolean(value));
  const path = '/stories';
  const pageUrl = buildLocaleUrl(path, locale);

  const allStories = await getSupabaseStories();
  const recentTitles = allStories
    .slice(0, 3)
    .map((s) => (locale === 'en' && s.title_en ? s.title_en : s.title))
    .filter((t): t is string => Boolean(t && t.trim()));
  const dynamicDescription =
    recentTitles.length > 0
      ? locale === 'en'
        ? `${copy.pageDescription} Recent: ${recentTitles.join(' · ')}.`
        : `${copy.pageDescription} 최근 글: ${recentTitles.join(' · ')}.`
      : copy.pageDescription;

  return {
    title: copy.seoTitle,
    description: dynamicDescription,
    alternates: createLocaleAlternates(path, locale),
    openGraph: {
      title: copy.seoTitle,
      description: dynamicDescription,
      url: pageUrl,
      type: 'website',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.seoTitle,
      description: dynamicDescription,
      images: [{ url: OG_IMAGE.url, alt: locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt }],
    },
    ...(hasQueryParams && {
      robots: {
        index: false,
        follow: true,
      },
    }),
  };
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const locale = resolveLocale(await getLocale());
  const copy = STORIES_COPY[locale];
  const params = await searchParams;
  const category = toValidStoryCategory(params.category);

  const allStories = await getSupabaseStories();
  const stories = category ? allStories.filter((s) => s.category === category) : allStories;

  const breadcrumbItems = [
    { name: locale === 'en' ? 'Home' : '홈', url: buildLocaleUrl('/', locale) },
    { name: copy.pageTitle, url: buildLocaleUrl('/stories', locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: copy.collectionName,
    description: copy.collectionDescription,
    url: buildLocaleUrl('/stories', locale),
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    ...(stories.length > 0
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: stories.length,
            itemListElement: stories.map((story, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: buildLocaleUrl(`/stories/${story.slug}`, locale),
              name: locale === 'en' && story.title_en ? story.title_en : story.title,
            })),
          },
        }
      : {}),
  };

  const [featured, ...rest] = stories;

  return (
    <>
      <JsonLdScript data={[collectionSchema, breadcrumbSchema]} />
      <PageHero
        title={copy.heroTitle}
        description={copy.heroDescription}
        breadcrumbItems={breadcrumbItems}
      />

      {/* Category Filter */}
      <Section variant="white">
        <div className="max-w-6xl mx-auto">
          <Suspense fallback={null}>
            <StoriesCategoryFilter locale={locale} />
          </Suspense>
        </div>
      </Section>

      {stories.length === 0 ? (
        <Section variant="canvas" prevVariant="white" className="pb-16 md:pb-24">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-charcoal-muted/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-charcoal mb-1">{copy.noStories}</p>
            <p className="text-sm text-charcoal-muted">{copy.noStoriesHint}</p>
          </div>
        </Section>
      ) : (
        <>
          {/* Featured Story */}
          {featured && (
            <Section variant="canvas" prevVariant="white">
              <div className="max-w-6xl mx-auto">
                <Link
                  href={`/stories/${featured.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-gray-200 shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover"
                >
                  <div className="relative aspect-[16/10] md:aspect-[21/9]">
                    {(() => {
                      const featuredImg = featured.thumbnail || extractFirstImage(featured.body);
                      const featuredTitle =
                        locale === 'en' && featured.title_en ? featured.title_en : featured.title;
                      return featuredImg ? (
                        <SafeImage
                          src={featuredImg}
                          alt={featuredTitle}
                          fill
                          className="object-cover motion-safe:animate-hero-breathing transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-charcoal/80 flex items-center justify-center">
                          <span className="text-white/20 text-8xl font-display font-black">M</span>
                        </div>
                      );
                    })()}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    {/* Text overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
                      <span className="inline-block self-start text-xs font-semibold tracking-wider uppercase bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-4 text-white">
                        {CATEGORY_LABELS[locale][featured.category]}
                      </span>
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white drop-shadow-lg mb-3 max-w-3xl">
                        {locale === 'en' && featured.title_en ? featured.title_en : featured.title}
                      </h2>
                      {(locale === 'en' ? featured.excerpt_en : featured.excerpt) && (
                        <p className="text-sm md:text-base text-white/80 line-clamp-2 mb-4 max-w-2xl leading-relaxed">
                          {locale === 'en' && featured.excerpt_en
                            ? featured.excerpt_en
                            : featured.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <span>{featured.published_at}</span>
                        {featured.author && (
                          <>
                            <span>·</span>
                            <span>{featured.author}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </Section>
          )}

          {/* Story Grid */}
          {rest.length > 0 && (
            <Section variant="white" prevVariant="canvas" className="pb-16 md:pb-24">
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {rest.map((story, i) => {
                    const title = locale === 'en' && story.title_en ? story.title_en : story.title;
                    const excerpt =
                      locale === 'en' && story.excerpt_en ? story.excerpt_en : story.excerpt;
                    const categoryLabel = CATEGORY_LABELS[locale][story.category];

                    return (
                      <Link
                        key={story.id}
                        href={`/stories/${story.slug}`}
                        className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                        style={{
                          animationDelay: `${i * 0.08}s`,
                          animationFillMode: 'forwards',
                        }}
                      >
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {(() => {
                            const cardImg = story.thumbnail || extractFirstImage(story.body);
                            return cardImg ? (
                              <>
                                <SafeImage
                                  src={cardImg}
                                  alt={title}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                              </>
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-canvas to-canvas-soft flex items-center justify-center">
                                <span className="text-charcoal-muted/20 text-5xl font-display font-bold">
                                  M
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="p-5">
                          <span className="inline-block text-xs font-semibold tracking-wider uppercase text-primary mb-3">
                            {categoryLabel}
                          </span>
                          <h3 className="text-card-title text-charcoal line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-300">
                            {title}
                          </h3>
                          {excerpt && (
                            <p className="text-sm text-charcoal-muted line-clamp-2 mb-4 leading-relaxed">
                              {excerpt}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-charcoal-muted/60">
                            <span>{story.published_at}</span>
                            {story.author && (
                              <>
                                <span>·</span>
                                <span>{story.author}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Section>
          )}
        </>
      )}
    </>
  );
}
