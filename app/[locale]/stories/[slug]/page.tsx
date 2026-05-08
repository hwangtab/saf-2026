import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getSupabaseStories,
  getSupabaseStoryBySlug,
  getSupabaseArtworks,
  getSupabaseArtworksByArtist,
} from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { generateBlogPostingSchema } from '@/lib/schemas/content';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { OG_IMAGE } from '@/lib/constants';
import { resolveLocale } from '@/lib/server-locale';
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

export const dynamic = 'force-static';
export const revalidate = 1800;

function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

/**
 * body 마크다운에서 `/artworks/{uuid}` 링크로 직접 참조된 작품 id를 중복 없이 등장 순서대로 추출.
 * artist-story 외 카테고리에서도 '이 글에서 소개한 작품'을 관련 작품 카드로 노출하기 위함.
 */
function extractArtworkIds(body: string | null | undefined): string[] {
  if (!body) return [];
  // 뒤따르는 문자로 끝(`)`, `"`, 공백, 문자열 끝)일 때만 매칭 — Supabase Storage URL
  // (`/artworks/{artist-id}/...` 구조)의 artist-id가 잡히지 않도록 경계 제약.
  const pattern =
    /\/(?:en\/)?artworks\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=[)"\s]|$)/gi;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const match of body.matchAll(pattern)) {
    const id = match[1].toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered;
}

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
  const stories = await getSupabaseStories();
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
  // Discover/SNS는 1200px+ 이미지 필수. thumbnail이 없으면 body 마크다운 첫 이미지로 fallback.
  const bodyForImage = isEn && story.body_en ? story.body_en : story.body;
  const heroImage = story.thumbnail || extractFirstImage(bodyForImage) || OG_IMAGE.url;
  const isCustomImage = heroImage !== OG_IMAGE.url;

  return {
    title,
    description,
    alternates: createLocaleAlternates(path, locale, !story.body_en),
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      locale: isEn ? 'en_US' : 'ko_KR',
      publishedTime: story.published_at,
      modifiedTime: story.updated_at ?? story.published_at,
      ...(story.author ? { authors: [story.author] } : {}),
      section: isEn ? 'Magazine' : '매거진',
      images: [
        {
          url: heroImage,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: isCustomImage ? title : isEn ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: heroImage,
          alt: isCustomImage ? title : isEn ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    // 영어 번역 본문(body_en)이 없는 스토리는 한국어가 그대로 노출 — thin content 색인 제외
    ...(isEn && !story.body_en ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function StoryDetailPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const story = await getSupabaseStoryBySlug(slug);

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
  const categoryLabel = isEn
    ? CATEGORY_LABELS_EN[story.category]
    : CATEGORY_LABELS_KO[story.category];
  const path = `/stories/${story.slug}`;
  const pageUrl = buildLocaleUrl(path, locale);

  // BlogPosting schema도 동일한 thumbnail/body 첫 이미지 fallback 적용 — 일관성
  const schemaImage = story.thumbnail || extractFirstImage(body) || OG_IMAGE.url;
  const blogPostingSchema = generateBlogPostingSchema({
    title,
    description: excerpt,
    datePublished: story.published_at,
    dateModified: story.updated_at,
    image: schemaImage,
    url: pageUrl,
    authorName: story.author,
    locale,
  });

  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('stories'), url: buildLocaleUrl('/stories', locale) },
    { name: title, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  // Related stories (same category, exclude current)
  const allStories = await getSupabaseStories();
  const relatedStories = allStories
    .filter((s) => s.category === story.category && s.slug !== story.slug)
    .slice(0, 3);

  // Related artworks
  // 우선순위: 본문에 직접 인용된 작품 → 작가 태그(artist-story) → 최신 판매중 작품 fallback
  // source는 tracking에서 tier별 CTR 비교에 사용 — 어느 매칭이 실제 conversion을 만드는지 측정.
  let relatedArtworks: Artwork[] = [];
  let artworksSource: 'inline' | 'artist-fallback' | 'recent-fallback' = 'inline';

  // sold 작품은 클릭 시 "SOLD" 화면으로 dead-end가 되므로 가장 끝으로 밀어내려 정렬.
  // 인용 자체는 유지 (sold-out 명작 referencing 같은 educational use-case 보존).
  const sortAvailableFirst = (a: Artwork, b: Artwork) =>
    Number(a.sold ?? false) - Number(b.sold ?? false);

  const referencedArtworkIds = extractArtworkIds(story.body);
  if (referencedArtworkIds.length > 0) {
    const allArtworks = await getSupabaseArtworks();
    const byId = new Map(allArtworks.map((a) => [a.id, a]));
    // tier 1: 본문에 작가가 직접 인용한 작품은 추천 가치 높음 — 6개까지 노출
    // (이전 3개 제한은 작가의도 누락. tier 2/3 fallback은 3개 유지 — thin link 회피).
    relatedArtworks = referencedArtworkIds
      .map((id) => byId.get(id))
      .filter((a): a is Artwork => Boolean(a))
      .sort(sortAvailableFirst)
      .slice(0, 6);
    artworksSource = 'inline';
  }

  if (relatedArtworks.length === 0 && primaryArtistTag) {
    relatedArtworks = (await getSupabaseArtworksByArtist(primaryArtistTag))
      .sort(sortAvailableFirst)
      .slice(0, 3);
    artworksSource = 'artist-fallback';
  }

  if (relatedArtworks.length === 0) {
    const allArtworks = await getSupabaseArtworks();
    relatedArtworks = allArtworks.filter((a) => !a.sold).slice(0, 3);
    artworksSource = 'recent-fallback';
  }

  const footerLinks = [
    {
      href: primaryArtistTag
        ? `/artworks/artist/${encodeURIComponent(primaryArtistTag)}`
        : '/artworks',
      label: primaryArtistTag
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
  ];

  return (
    <>
      <JsonLdScript data={[blogPostingSchema, breadcrumbSchema]} />
      <PageHero
        title={title}
        description={`${categoryLabel} · ${isEn ? 'Published' : '발행'} ${formattedDate}${story.author ? ` · ${story.author}` : ''}`}
        breadcrumbItems={breadcrumbItems}
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
            <MarkdownRenderer content={body} />
          </div>

          <div className="mt-10 text-lg font-semibold tracking-tight text-primary motion-safe:opacity-0 motion-safe:animate-fade-in-up [animation-delay:0.25s]">
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
              {story.author && (
                <div>
                  <p className="text-sm font-semibold text-charcoal">{story.author}</p>
                  <p className="text-xs text-charcoal-muted">
                    {isEn ? `Published ${formattedDate}` : `발행 ${formattedDate}`}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-charcoal-muted">{isEn ? 'Share' : '공유하기'}</span>
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
                {isEn ? 'Featured Artworks' : '관련 작품'}
              </h2>
              <Link
                href="/artworks"
                className="text-sm font-medium text-primary hover:text-primary-strong transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  {isEn ? 'View all' : '전체 보기'}
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
              {isEn ? 'Related Stories' : '관련 글'}
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
                      <span className="text-xs font-semibold tracking-wider uppercase text-primary">
                        {isEn
                          ? CATEGORY_LABELS_EN[related.category]
                          : CATEGORY_LABELS_KO[related.category]}
                      </span>
                      <h3 className="text-sm font-bold mt-2 line-clamp-2 group-hover:text-primary transition-colors duration-300">
                        {relTitle}
                      </h3>
                      <span className="text-xs text-charcoal-muted/60 mt-2 block">
                        {(() => {
                          if (!related.published_at) return '';
                          if (!isEn) return related.published_at;
                          const d = new Date(related.published_at);
                          return Number.isNaN(d.getTime())
                            ? related.published_at
                            : d.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              });
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
