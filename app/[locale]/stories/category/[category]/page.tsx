import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import SafeImage from '@/components/common/SafeImage';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';

import { CONTACT, OG_IMAGE, SITE_URL } from '@/lib/constants';
import { resolveLocale } from '@/lib/server-locale';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { getSupabaseStories } from '@/lib/supabase-data';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { STORY_CATEGORIES, type StoryCategory } from '@/types';

export const revalidate = 600;

interface Props {
  params: Promise<{ category: string }>;
}

type LocaleCode = 'ko' | 'en';

const CATEGORY_META: Record<
  LocaleCode,
  Record<
    StoryCategory,
    {
      title: string;
      description: string;
      heroTitle: string;
      heroDescription: string;
      keywords: string[];
    }
  >
> = {
  ko: {
    'artist-story': {
      title: '작가를 만나다 — 작가 인터뷰 & 스토리',
      description:
        '씨앗페 출품 작가들의 이야기를 만나보세요. 작품 세계관, 창작 과정, 작가 인터뷰를 통해 한국 현대미술의 깊이를 경험하세요.',
      heroTitle: '작가를 만나다',
      heroDescription: '작품 너머의 작가 이야기',
      keywords: [
        '작가 인터뷰',
        '한국 작가',
        '현대미술 작가',
        '작가 이야기',
        '씨앗페 작가',
        '미술 인터뷰',
      ],
    },
    'buying-guide': {
      title: '컬렉팅 시작하기 — 미술 작품 구매 가이드',
      description:
        '미술 작품 구매가 처음이신가요? 작품 선택부터 배송, 보관까지 컬렉팅에 필요한 모든 정보를 안내합니다.',
      heroTitle: '컬렉팅 시작하기',
      heroDescription: '작품 구매가 처음인 분을 위한 안내',
      keywords: [
        '미술 작품 구매',
        '그림 사는 법',
        '컬렉팅 가이드',
        '작품 구매 방법',
        '미술품 투자',
        '처음 미술 작품',
      ],
    },
    'art-knowledge': {
      title: '미술 산책 — 가볍게 즐기는 미술 이야기',
      description:
        '미술 감상법, 미술사 이야기, 전시회 관람 팁까지. 일상에서 가볍게 즐기는 미술 이야기를 만나보세요.',
      heroTitle: '미술 산책',
      heroDescription: '가볍게 즐기는 미술 이야기',
      keywords: [
        '미술 감상',
        '미술 상식',
        '전시회 관람',
        '현대미술 이해',
        '미술 이야기',
        '미술 산책',
      ],
    },
  },
  en: {
    'artist-story': {
      title: 'Meet the Artist — Interviews & Stories',
      description:
        'Discover the stories behind SAF artists. Explore their creative process, artistic philosophy, and journey through interviews and features.',
      heroTitle: 'Meet the Artist',
      heroDescription: 'Stories behind the artists and their works',
      keywords: [
        'artist interview',
        'Korean artist',
        'contemporary art',
        'artist story',
        'SAF artist',
      ],
    },
    'buying-guide': {
      title: 'Start Collecting — Art Buying Guide',
      description:
        'New to art collecting? From choosing artwork to shipping and care, everything you need to start your art collection.',
      heroTitle: 'Start Collecting',
      heroDescription: 'A guide for first-time art buyers',
      keywords: [
        'buy art',
        'art collecting guide',
        'how to buy art',
        'first art purchase',
        'art investment',
      ],
    },
    'art-knowledge': {
      title: 'Art Walk — Bite-sized Art Stories',
      description:
        'Art appreciation tips, art history stories, and exhibition guides. Enjoy art through bite-sized, accessible stories.',
      heroTitle: 'Art Walk',
      heroDescription: 'Enjoy art through bite-sized stories',
      keywords: [
        'art appreciation',
        'art knowledge',
        'exhibition guide',
        'contemporary art',
        'art stories',
      ],
    },
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

function isValidCategory(category: string): category is StoryCategory {
  return (STORY_CATEGORIES as readonly string[]).includes(category);
}

/** body 마크다운에서 첫 번째 이미지 URL 추출 */
function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

export async function generateStaticParams() {
  return STORY_CATEGORIES.flatMap((category) =>
    routing.locales.map((locale) => ({ locale, category }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const { category } = await params;

  if (!isValidCategory(category)) {
    return { title: 'Not Found' };
  }

  const meta = CATEGORY_META[locale][category];
  const categoryPath = `/stories/category/${category}`;

  const allStories = await getSupabaseStories();
  const stories = allStories.filter((s) => s.category === category);

  // 대표 이미지: 첫 번째 스토리 썸네일
  const representativeImage =
    stories[0]?.thumbnail || extractFirstImage(stories[0]?.body) || undefined;

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: createLocaleAlternates(categoryPath, locale),
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: buildLocaleUrl(categoryPath, locale),
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      images: [
        {
          url: representativeImage || OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt:
            locale === 'en'
              ? `${meta.heroTitle} — SAF Magazine`
              : `씨앗페 매거진 — ${meta.heroTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [
        {
          url: representativeImage || OG_IMAGE.url,
          alt:
            locale === 'en'
              ? `${meta.heroTitle} — SAF Magazine`
              : `씨앗페 매거진 — ${meta.heroTitle}`,
        },
      ],
    },
  };
}

export default async function StoryCategoryPage({ params }: Props) {
  const locale = resolveLocale(await getLocale());
  const { category } = await params;

  if (!isValidCategory(category)) {
    notFound();
  }

  const meta = CATEGORY_META[locale][category];
  const categoryPath = `/stories/category/${category}`;
  const pageUrl = buildLocaleUrl(categoryPath, locale);

  const allStories = await getSupabaseStories();
  const stories = allStories.filter((s) => s.category === category);

  // Breadcrumbs
  const breadcrumbItems = [
    { name: locale === 'en' ? 'Home' : '홈', url: buildLocaleUrl('/', locale) },
    { name: locale === 'en' ? 'Magazine' : '매거진', url: buildLocaleUrl('/stories', locale) },
    { name: meta.heroTitle, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  // CollectionPage JSON-LD
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: {
      '@type': 'Thing',
      name: meta.heroTitle,
    },
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
            '@id': `${pageUrl}#item-list`,
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

  // 다른 카테고리
  const otherCategories = STORY_CATEGORIES.filter((c) => c !== category).map((c) => ({
    category: c,
    label: CATEGORY_LABELS[locale][c],
    count: allStories.filter((s) => s.category === c).length,
    path: `/stories/category/${c}`,
  }));

  return (
    <>
      <JsonLdScript data={[collectionSchema, breadcrumbSchema]} />

      <PageHero
        title={meta.heroTitle}
        description={meta.heroDescription}
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={`${SITE_URL}${categoryPath}`}
          title={meta.title}
          description={meta.description}
        />
      </PageHero>

      {stories.length === 0 ? (
        <Section variant="canvas-soft">
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-charcoal mb-1">
              {locale === 'en' ? 'No stories available yet.' : '아직 등록된 글이 없습니다.'}
            </p>
            <p className="text-sm text-charcoal-muted">
              {locale === 'en' ? 'New stories are coming soon.' : '곧 새로운 글이 찾아옵니다.'}
            </p>
          </div>
        </Section>
      ) : (
        <Section variant="white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {stories.map((story, i) => {
                const title = locale === 'en' && story.title_en ? story.title_en : story.title;
                const excerpt =
                  locale === 'en' && story.excerpt_en ? story.excerpt_en : story.excerpt;
                const cardImg = story.thumbnail || extractFirstImage(story.body);

                return (
                  <Link
                    key={story.id}
                    href={`/stories/${story.slug}`}
                    className="group block overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 0.08}s`,
                      animationFillMode: 'forwards',
                    }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {cardImg ? (
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
                          <span className="text-charcoal-muted/20 text-5xl font-display">M</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
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

      {/* 다른 카테고리 내부 링크 — 토픽 클러스터 강화 */}
      <Section
        variant="white"
        prevVariant={stories.length === 0 ? 'canvas-soft' : 'white'}
        className="pb-8"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-gray-500">
              {locale === 'en' ? 'More in Magazine' : '매거진 더 보기'}
            </p>
            <Link
              href="/stories"
              className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {locale === 'en' ? 'All Stories' : '전체 보기'}
            </Link>
            {otherCategories
              .filter((c) => c.count > 0)
              .map((cat) => (
                <Link
                  key={cat.category}
                  href={cat.path}
                  className="px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {cat.label}
                  <span className="ml-1 opacity-60">{cat.count}</span>
                </Link>
              ))}
          </div>
        </div>
      </Section>

      {/* 작품 갤러리 교차 링크 — 매거진에서 작품 구매로 전환 유도 */}
      <Section variant="canvas-soft" prevVariant="white" className="pb-16">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-lg font-display font-bold text-charcoal">
              {locale === 'en'
                ? 'Ready to start your collection?'
                : '마음에 드는 작품을 찾아보세요'}
            </p>
            <p className="text-sm text-charcoal-muted mt-1">
              {locale === 'en'
                ? '127 artists, artworks available online.'
                : '127명의 작가, 지금 바로 구매 가능한 작품들'}
            </p>
          </div>
          <Link
            href="/artworks"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-strong text-white font-bold rounded-lg transition-colors shadow-sm hover:shadow-md min-h-[48px]"
          >
            {locale === 'en' ? 'Browse Artworks' : '작품 갤러리 보기'} →
          </Link>
        </div>
      </Section>
    </>
  );
}
