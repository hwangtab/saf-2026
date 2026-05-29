import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getSupabaseStories,
  getSupabaseStoriesLight,
  getSupabaseStoryBySlug,
  getSupabaseArtworkById,
  getSupabaseArtworksByArtist,
  getSupabaseHomepageArtworks,
} from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { getPrimaryStorySlug } from '@/lib/artist-story-map';
import { createBreadcrumbSchema, generateArtworkListSchema } from '@/lib/seo-utils';
import { generateBlogPostingSchema } from '@/lib/schemas/content';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { OG_IMAGE } from '@/lib/constants';
import { resolveLocale } from '@/lib/server-locale';
import { localizeStoryAuthor } from '@/lib/story-author';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import RelatedArtworkCard from '@/components/features/RelatedArtworkCard';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { StoryCategory, Artwork } from '@/types';
import { ArrowRight } from 'lucide-react';
import { getStorySeoOverride } from '@/lib/stories-seo-overrides';
import { resolveEnRobots, EN_INDEXABLE_STORY_SLUGS } from '@/lib/en-indexable';
import { extractFaqFromBody, generateFaqPageSchema } from '@/lib/markdown-faq';
import { extractArtworkIdsFromBody } from '@/lib/markdown-artwork-refs';
import { generateInlineCrossLinks, insertCrossLinksBeforeFinalCta } from '@/lib/inline-cross-links';
import { selectRelatedStories, STORY_CLUSTERS } from '@/lib/story-clusters';

export const dynamic = 'force-static';
export const revalidate = 1800;

function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

// extractArtworkIdsFromBody는 lib/markdown-artwork-refs로 이동 — artists 페이지에서도 재사용.

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

const CATEGORY_LABELS_KO: Record<StoryCategory, string> = {
  'artist-story': '작가를 만나다',
  'buying-guide': '컬렉팅 시작하기',
  'art-knowledge': '미술 산책',
};

const CATEGORY_LABELS_EN: Record<StoryCategory, string> = {
  'artist-story': 'Artist Stories',
  'buying-guide': 'Buying Guide',
  'art-knowledge': 'Art Knowledge',
};

export async function generateStaticParams() {
  // slug만 필요 — body 제외 light fetch로 빌드 시 statement timeout 차단.
  const stories = await getSupabaseStoriesLight();
  return stories.flatMap((story) =>
    routing.locales.map((locale) => ({ locale, slug: story.slug }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const story = await getSupabaseStoryBySlug(slug);

  if (!story) return { title: 'Not Found' };

  const isEn = locale === 'en';
  const baseTitle = isEn && story.title_en ? story.title_en : story.title;
  const baseDescription = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
  // SEO 오버라이드: GSC Performance상 검색어 매칭이 약한 long-tail에 키워드 풍부 title/desc 적용.
  // 본문 H1은 baseTitle 그대로(매거진 톤 유지), SERP `<title>`만 키워드 풍부하게 분리.
  const seoOverride = getStorySeoOverride(story.slug);
  const title = isEn ? (seoOverride?.titleEn ?? baseTitle) : (seoOverride?.titleKo ?? baseTitle);
  const description = isEn
    ? (seoOverride?.descriptionEn ?? baseDescription)
    : (seoOverride?.descriptionKo ?? baseDescription);
  const path = `/stories/${story.slug}`;
  const pageUrl = buildLocaleUrl(path, locale);
  // Sprint 70: heroImage 변수 제거 — Next.js 컨벤션 파일 opengraph-image.tsx가 자동 emit.
  const isEnIndexable = Boolean(story.body_en) && EN_INDEXABLE_STORY_SLUGS.has(story.slug);

  return {
    title,
    description,
    alternates: createLocaleAlternates(path, locale, !isEnIndexable),
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      locale: isEn ? 'en_US' : 'ko_KR',
      publishedTime: story.published_at,
      modifiedTime: story.updated_at ?? story.published_at,
      authors: [localizeStoryAuthor(story.author, locale)],
      section: isEn ? 'Magazine' : '매거진',
      // article:tag — story.tags(매체·작가·주제 키워드)를 Open Graph article tag로 노출.
      // SNS/Facebook Article schema 매칭 + Knowledge Graph entity 보강. KO tags는 EN locale에서도 노출
      // (Facebook은 entity name 정규화 처리).
      tags: story.tags && story.tags.length > 0 ? story.tags.slice(0, 6) : undefined,
      // images 미명시 — Next.js 컨벤션 파일(opengraph-image.tsx)이 자동 emit.
      // 카테고리별 색상 + SAF Magazine 브랜딩 + title이 그려진 1200x630 ImageResponse가
      // raw story thumbnail(작품 도판 이미지)보다 SNS/카카오 미리보기에서 매거진 entity를 명확히 노출.
      images: undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      // twitter-image.tsx 컨벤션 부재 시 Next.js가 opengraph-image.tsx로 자동 fallback.
      images: undefined,
    },
    ...(() => {
      const enRobots = resolveEnRobots(locale, isEnIndexable);
      return enRobots ? { robots: enRobots } : {};
    })(),
  };
}

export default async function StoryDetailPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const story = await getSupabaseStoryBySlug(slug);

  // notFound()는 레이아웃 스트리밍 특성상 HTTP 200 + noindex로 응답 (Next.js streaming.mdx — SEO-safe).
  if (!story) notFound();

  const isEn = locale === 'en';
  const title = isEn && story.title_en ? story.title_en : story.title;
  const excerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
  const body = isEn && story.body_en ? story.body_en : story.body;
  // English user but no body_en: show Korean source with a small label so readers
  // know the translation is forthcoming rather than missing/broken.
  const showKoreanFallbackNotice = isEn && !story.body_en;
  // Magazine-tone date formatting. ISO date string -> "May 7, 2026" / "2026-05-07".
  const formattedDate = (() => {
    if (!story.published_at) return '';
    const d = new Date(story.published_at);
    if (Number.isNaN(d.getTime())) return story.published_at;
    return isEn
      ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : story.published_at;
  })();
  const primaryArtistTag =
    story.category === 'artist-story'
      ? story.tags?.find((tag) => tag.trim().length > 0)?.trim()
      : null;
  // 작가 태그의 실제 갤러리 보유 여부를 1회 조회 — artist-fallback + 푸터 링크 양쪽에서 재사용.
  // primaryArtistTag가 없으면 빈 배열로 단락(추가 쿼리 없음).
  const artistArtworks = primaryArtistTag
    ? await getSupabaseArtworksByArtist(primaryArtistTag)
    : [];
  const artistTagHasArtworks = artistArtworks.length > 0;
  const categoryLabel = isEn
    ? CATEGORY_LABELS_EN[story.category]
    : CATEGORY_LABELS_KO[story.category];
  const path = `/stories/${story.slug}`;
  const pageUrl = buildLocaleUrl(path, locale);

  // BlogPosting schema도 동일한 thumbnail/body 첫 이미지 fallback 적용 — 일관성.
  // BlogPosting schema는 relatedArtworks·relatedStories가 hydrate된 이후 생성하므로
  // 함수 끝부분으로 이동 (아래 참고).
  const schemaImage = story.thumbnail || extractFirstImage(body) || OG_IMAGE.url;
  const categoryUrl = buildLocaleUrl(`/stories/category/${story.category}`, locale);

  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const tStory = await getTranslations({ locale, namespace: 'home.storyDetail' });
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('stories'), url: buildLocaleUrl('/stories', locale) },
    { name: title, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  // 본문에 "## 자주 묻는 질문" / "## Frequently asked questions" 섹션이 있으면
  // FAQPage schema 자동 생성 — Google AI Overview·featured snippet 진입 우선순위 ↑.
  // 추출 실패 시 null → JsonLdScript에 추가하지 않음.
  const faqSchema = generateFaqPageSchema(extractFaqFromBody(body), {
    url: pageUrl,
    locale,
  });

  // Related stories — cluster-aware: cluster siblings first, category fallback
  const allStories = await getSupabaseStories();
  const relatedStories = selectRelatedStories(story.slug, story.category, allStories, 3);

  // Related artworks
  // 우선순위: 본문에 직접 인용된 작품 → 작가 태그(artist-story) → 최신 판매중 작품 fallback
  // source는 tracking에서 tier별 CTR 비교에 사용 — 어느 매칭이 실제 conversion을 만드는지 측정.
  let relatedArtworks: Artwork[] = [];
  let artworksSource: 'inline' | 'artist-fallback' | 'recent-fallback' = 'inline';

  // sold 작품은 클릭 시 "SOLD" 화면으로 dead-end가 되므로 가장 끝으로 밀어내려 정렬.
  // 인용 자체는 유지 (sold-out 명작 referencing 같은 educational use-case 보존).
  const sortAvailableFirst = (a: Artwork, b: Artwork) =>
    Number(a.sold ?? false) - Number(b.sold ?? false);

  const referencedArtworkIds = extractArtworkIdsFromBody(story.body);
  if (referencedArtworkIds.length > 0) {
    // 전체 365개 over-fetch 대신 참조 ID 각각 per-item 쿼리 (unstable_cache wrapping으로 ISR rebuild 시 캐시 효율 유지)
    const artworkResults = await Promise.all(referencedArtworkIds.map(getSupabaseArtworkById));
    // tier 1: 본문에 작가가 직접 인용한 작품은 추천 가치 높음 — 6개까지 노출
    // (이전 3개 제한은 작가의도 누락. tier 2/3 fallback은 3개 유지 — thin link 회피).
    relatedArtworks = artworkResults
      .filter((a): a is Artwork => Boolean(a))
      .sort(sortAvailableFirst)
      .slice(0, 6);
    artworksSource = 'inline';
  }

  if (relatedArtworks.length === 0 && primaryArtistTag) {
    // artistArtworks는 primaryArtistTag 계산 직후 이미 fetch됨 — 중복 쿼리 없음.
    relatedArtworks = [...artistArtworks].sort(sortAvailableFirst).slice(0, 3);
    artworksSource = 'artist-fallback';
  }

  if (relatedArtworks.length === 0) {
    // tier 3 fallback: over-fetch 12개 후 정전 작가(26명) 작품 우선 정렬 → top 3.
    // 매거진 글에서 작품으로 가는 link equity가 거장 작가에 집중.
    relatedArtworks = (await getSupabaseHomepageArtworks(12))
      .filter((a) => !a.sold)
      .sort((a, b) => {
        const pa = getPrimaryStorySlug(a.artist) ? 0 : 1;
        const pb = getPrimaryStorySlug(b.artist) ? 0 : 1;
        return pa - pb;
      })
      .slice(0, 3);
    artworksSource = 'recent-fallback';
  }

  const isClusterSpoke = Object.values(STORY_CLUSTERS).some((slugs) =>
    (slugs as readonly string[]).includes(story.slug)
  );

  const footerLinks = [
    {
      // 작가 태그가 실제 갤러리 작품을 보유할 때만 /artworks/artist/{tag}로 링크.
      // 태그가 작가명이 아닌 경우(예: "컬렉터", "여성 작가") soft-404 방지.
      href:
        artistTagHasArtworks && primaryArtistTag
          ? `/artworks/artist/${encodeURIComponent(primaryArtistTag)}`
          : '/artworks',
      label:
        artistTagHasArtworks && primaryArtistTag
          ? isEn
            ? `View ${primaryArtistTag}'s Artworks`
            : `${primaryArtistTag}의 작품 보기`
          : isEn
            ? 'Browse Artworks'
            : '작품 보기',
    },
    {
      href: `/stories/category/${story.category}`,
      label: isEn ? 'Related Magazine' : '관련 매거진',
    },
    ...(isClusterSpoke
      ? [
          {
            href: '/stories/guide',
            label: isEn ? 'Collecting Guide' : '컬렉팅 가이드',
          },
        ]
      : []),
  ];

  // 매거진 본문에 직접 인용된 작품(artworksSource='inline') = 큐레이터가 의도적으로 추천한 5점.
  // 이를 ItemList VisualArtwork carousel schema로 발행하면 Google 검색·AI Overview에서
  // 작품 carousel rich result 진입 가능. inline이 아닌 fallback일 땐 발행 안 함 (의도된 큐레이션 아님).
  const inlineCurationSchema =
    artworksSource === 'inline' && relatedArtworks.length > 0
      ? generateArtworkListSchema(relatedArtworks, locale === 'en' ? 'en' : 'ko', 10, pageUrl, {
          name: isEn ? `Curated artworks in: ${title}` : `이 글에서 큐레이션한 작품: ${title}`,
          description: isEn
            ? `${relatedArtworks.length} artworks recommended in the SAF Magazine article "${title}".`
            : `씨앗페 매거진 "${title}"에서 큐레이션한 ${relatedArtworks.length}점.`,
        })
      : null;

  // 본문 끝에 관련 글 추천 inline markdown 자동 추가.
  // UI "관련 글" 카드 섹션이 이미 있지만, 본문 inline 텍스트 link는 Google·AI에 더 강한 신호.
  // cluster-aware: 같은 토픽 클러스터 형제 우선, 나머지 슬롯은 category fallback.
  const inlineCandidates = selectRelatedStories(story.slug, story.category, allStories, 3);
  const inlineCrossLinksMarkdown = generateInlineCrossLinks({
    currentSlug: story.slug,
    sameCategoryStories: inlineCandidates,
    isEnglish: isEn,
  });
  // 단순 append가 아니라 본문 마지막 CTA link/horizontal rule 직전에 삽입 →
  // "본문 → 다른 글 추천 → 마무리 CTA" 흐름을 자연스럽게 유지.
  const bodyWithCrossLinks = insertCrossLinksBeforeFinalCta(body, inlineCrossLinksMarkdown);

  // BlogPosting schema 생성 — relatedArtworks·relatedStories hydrate된 이후이라
  // mentions 필드를 정확한 작품 title·관련 매거진 title로 채울 수 있음.
  // mentions는 schema.org에서 "이 글이 참조하는 entity" 시그널 — AI Overview·Knowledge Graph
  // entity 매칭과 관련 entity 그래프 형성에 직접 영향.
  const blogPostingSchema = generateBlogPostingSchema({
    title,
    description: excerpt,
    datePublished: story.published_at,
    dateModified: story.updated_at,
    image: schemaImage,
    url: pageUrl,
    authorName: localizeStoryAuthor(story.author, locale),
    locale,
    articleSection: categoryLabel,
    categoryUrl,
    // story.tags는 DB에 KO만 저장 (tags_en 컬럼 부재). /en에 KO 키워드 발행하면
    // BlogPosting.keywords에 한국어 노출 누락 — 영문 검색 시그널 의미 없음. /en은 생략.
    keywords: isEn ? undefined : (story.tags ?? undefined),
    // about Thing entity — Knowledge Graph 매칭 + AI Overview 신호. KO/EN 양쪽 노출
    // (entity name은 검색엔진이 정규화 처리). tags 비어있으면 생략.
    about: story.tags && story.tags.length > 0 ? story.tags.slice(0, 5) : undefined,
    mentions: [
      ...relatedArtworks.map((art) => ({
        type: 'Product' as const,
        name: isEn && art.title_en ? art.title_en : art.title,
        url: buildLocaleUrl(`/artworks/${art.id}`, locale),
      })),
      ...relatedStories.map((rel) => ({
        type: 'BlogPosting' as const,
        name: isEn && rel.title_en ? rel.title_en : rel.title,
        url: buildLocaleUrl(`/stories/${rel.slug}`, locale),
      })),
    ],
  });

  return (
    <>
      <JsonLdScript
        data={[
          blogPostingSchema,
          breadcrumbSchema,
          ...(faqSchema ? [faqSchema] : []),
          ...(inlineCurationSchema ? [inlineCurationSchema] : []),
        ]}
      />
      <PageHero
        title={title}
        description={`${categoryLabel} · ${tStory('publishedAt', { date: formattedDate })} · ${localizeStoryAuthor(story.author, locale)}`}
        breadcrumbItems={breadcrumbItems}
        // 매거진 자체 thumbnail 또는 본문 첫 이미지 — OG 사이트 대표 이미지는 hero에 부적합해
        // schemaImage 변수와 달리 OG_IMAGE.url fallback은 제외 (hero 단색 fallback이 더 자연스러움).
        customBackgroundImage={story.thumbnail || extractFirstImage(body) || undefined}
      />

      {/* Article Body */}
      <Section variant="white">
        <article className="max-w-3xl mx-auto px-4 sm:px-5">
          {excerpt && (
            <p className="text-xl md:text-2xl text-charcoal-muted leading-relaxed mb-10 border-l-4 border-primary pl-6 motion-safe:opacity-0 motion-safe:animate-fade-in-up [animation-delay:0.1s]">
              {excerpt}
            </p>
          )}

          {showKoreanFallbackNotice && (
            <p className="mb-8 inline-block rounded-full border border-gray-200 bg-canvas-soft px-4 py-1.5 text-xs font-medium tracking-wide uppercase text-charcoal-muted">
              Korean original — English translation pending
            </p>
          )}

          <div className="motion-safe:opacity-0 motion-safe:animate-fade-in-up [animation-delay:0.2s]">
            <MarkdownRenderer content={bodyWithCrossLinks} />
          </div>

          <div className="mt-10 text-lg font-semibold tracking-tight text-primary-strong motion-safe:opacity-0 motion-safe:animate-fade-in-up [animation-delay:0.25s]">
            {footerLinks.map((link, index) => (
              <span key={link.href}>
                {index > 0 ? ' · ' : ''}
                <Link href={link.href} className="hover:text-primary-strong transition-colors">
                  {link.label}
                </Link>
              </span>
            ))}
          </div>

          {/* Author & Share */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {localizeStoryAuthor(story.author, locale)}
                </p>
                <p className="text-xs text-charcoal-muted">
                  {tStory('publishedAt', { date: formattedDate })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-charcoal-muted">{tStory('share')}</span>
              <ShareButtonsWrapper title={title} description={excerpt} url={pageUrl} />
            </div>
          </div>
        </article>
      </Section>

      {/* Related Stories */}
      {/* 관련 작품 */}
      {relatedArtworks.length > 0 && (
        <Section
          variant="canvas"
          prevVariant="white"
          className={relatedStories.length === 0 ? 'pb-16 md:pb-24' : ''}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-charcoal">
                {tStory('featuredArtworks')}
              </h2>
              <Link
                href="/artworks"
                className="text-sm font-medium text-primary hover:text-primary-strong transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  {tStory('viewAll')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedArtworks.map((artwork, i) => (
                <RelatedArtworkCard
                  key={artwork.id}
                  artwork={artwork}
                  isEn={isEn}
                  storySlug={story.slug}
                  position={i}
                  source={artworksSource}
                />
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* 관련 글 */}
      {relatedStories.length > 0 && (
        <Section
          variant={relatedArtworks.length > 0 ? 'white' : 'canvas-soft'}
          prevVariant={relatedArtworks.length > 0 ? 'canvas-soft' : 'white'}
          className="pb-16 md:pb-24"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-5">
            <h2 className="text-2xl font-display font-bold text-charcoal mb-6">
              {tStory('relatedStories')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedStories.map((related, i) => {
                const relTitle = isEn && related.title_en ? related.title_en : related.title;
                return (
                  <Link
                    key={related.id}
                    href={`/stories/${related.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      animationFillMode: 'forwards',
                    }}
                  >
                    {(() => {
                      const relImg = related.thumbnail || extractFirstImage(related.body);
                      return relImg ? (
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <SafeImage
                            src={relImg}
                            alt={relTitle}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : null;
                    })()}
                    <div className="p-5">
                      <span className="text-xs font-semibold tracking-wider uppercase text-primary-strong">
                        {isEn
                          ? CATEGORY_LABELS_EN[related.category]
                          : CATEGORY_LABELS_KO[related.category]}
                      </span>
                      <h3 className="text-sm font-bold mt-2 line-clamp-2 group-hover:text-primary transition-colors duration-300">
                        {relTitle}
                      </h3>
                      <span className="text-xs text-charcoal-muted/60 mt-2 block">
                        {(() => {
                          if (!related.published_at) return localizeStoryAuthor(null, locale);
                          const dateStr = !isEn
                            ? related.published_at
                            : (() => {
                                const d = new Date(related.published_at);
                                return Number.isNaN(d.getTime())
                                  ? related.published_at
                                  : d.toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    });
                              })();
                          return `${dateStr} · ${localizeStoryAuthor(null, locale)}`;
                        })()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
