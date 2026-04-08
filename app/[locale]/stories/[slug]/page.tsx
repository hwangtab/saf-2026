import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
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
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { StoryCategory } from '@/types';

export const revalidate = 1800;

function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

interface Props {
  params: Promise<{ slug: string }>;
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
  const { slug } = await params;
  const locale = resolveLocale(await getLocale());
  const story = await getSupabaseStoryBySlug(slug);

  if (!story) return { title: 'Not Found' };

  const isEn = locale === 'en';
  const title = isEn && story.title_en ? story.title_en : story.title;
  const description = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
  const path = `/stories/${story.slug}`;
  const pageUrl = buildLocaleUrl(path, locale);

  return {
    title,
    description,
    alternates: createLocaleAlternates(path, locale),
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      locale: isEn ? 'en_US' : 'ko_KR',
      publishedTime: story.published_at,
      ...(story.author ? { authors: [story.author] } : {}),
      section: isEn ? 'Magazine' : '매거진',
      images: [
        {
          url: story.thumbnail || OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: story.thumbnail ? title : isEn ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: story.thumbnail || OG_IMAGE.url,
          alt: story.thumbnail ? title : isEn ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
  };
}

export default async function StoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const locale = resolveLocale(await getLocale());
  const story = await getSupabaseStoryBySlug(slug);

  if (!story) notFound();

  const isEn = locale === 'en';
  const title = isEn && story.title_en ? story.title_en : story.title;
  const excerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
  const body = isEn && story.body_en ? story.body_en : story.body;
  const categoryLabel = isEn
    ? CATEGORY_LABELS_EN[story.category]
    : CATEGORY_LABELS_KO[story.category];
  const path = `/stories/${story.slug}`;
  const pageUrl = buildLocaleUrl(path, locale);

  const blogPostingSchema = generateBlogPostingSchema({
    title,
    description: excerpt,
    datePublished: story.published_at,
    dateModified: story.updated_at,
    image: story.thumbnail || OG_IMAGE.url,
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
  let relatedArtworks: import('@/types').Artwork[] = [];
  if (story.category === 'artist-story' && story.tags?.[0]) {
    relatedArtworks = (await getSupabaseArtworksByArtist(story.tags[0])).slice(0, 3);
  }
  if (relatedArtworks.length === 0) {
    const allArtworks = await getSupabaseArtworks();
    relatedArtworks = allArtworks.filter((a) => !a.sold).slice(0, 3);
  }

  return (
    <>
      <JsonLdScript data={[blogPostingSchema, breadcrumbSchema]} />
      <PageHero
        title={title}
        description={`${categoryLabel} · ${story.published_at}${story.author ? ` · ${story.author}` : ''}`}
        breadcrumbItems={breadcrumbItems}
      />

      {/* Article Body */}
      <Section variant="white">
        <article className="max-w-3xl mx-auto">
          {story.thumbnail && (
            <div
              className="relative w-full aspect-video mb-10 rounded-xl overflow-hidden shadow-lg motion-safe:opacity-0 motion-safe:animate-fade-in-up"
              style={{ animationFillMode: 'forwards' }}
            >
              <SafeImage src={story.thumbnail} alt={title} fill className="object-cover" priority />
            </div>
          )}

          {excerpt && (
            <p
              className="text-xl md:text-2xl text-charcoal-muted leading-relaxed mb-10 border-l-4 border-primary pl-6 motion-safe:opacity-0 motion-safe:animate-fade-in-up"
              style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
            >
              {excerpt}
            </p>
          )}

          <div
            className="motion-safe:opacity-0 motion-safe:animate-fade-in-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            <MarkdownRenderer content={body} />
          </div>

          {/* Author & Share */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {story.author && (
                <div>
                  <p className="text-sm font-semibold text-charcoal">{story.author}</p>
                  <p className="text-xs text-charcoal-muted">{story.published_at}</p>
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
      {relatedStories.length > 0 && (
        <Section variant="canvas-soft" prevVariant="white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-display text-charcoal mb-6">
              {isEn ? 'Related Stories' : '관련 글'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedStories.map((related, i) => {
                const relTitle = isEn && related.title_en ? related.title_en : related.title;
                return (
                  <Link
                    key={related.id}
                    href={`/stories/${related.slug}`}
                    className="group block overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg motion-safe:opacity-0 motion-safe:animate-fade-in-up"
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
                        {related.published_at}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* 관련 작품 */}
      {relatedArtworks.length > 0 && (
        <Section variant="white" prevVariant={relatedStories.length > 0 ? 'canvas-soft' : 'white'}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display text-charcoal">
                {isEn ? 'Featured Artworks' : '관련 작품'}
              </h2>
              <Link
                href="/artworks"
                className="text-sm font-medium text-primary hover:text-primary-strong transition-colors"
              >
                {isEn ? 'View all →' : '전체 보기 →'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedArtworks.map((artwork, i) => {
                const artTitle = isEn && artwork.title_en ? artwork.title_en : artwork.title;
                const imgUrl = resolveArtworkImageUrl(artwork.images[0]);
                return (
                  <Link
                    key={artwork.id}
                    href={`/artworks/${artwork.id}`}
                    className="group block overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      animationFillMode: 'forwards',
                    }}
                  >
                    <div className="relative aspect-square overflow-hidden bg-canvas-soft">
                      {imgUrl ? (
                        <SafeImage
                          src={imgUrl}
                          alt={artTitle}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-charcoal-muted/20 text-4xl font-display">M</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-bold text-charcoal line-clamp-2 group-hover:text-primary transition-colors duration-300">
                        {artTitle}
                      </h3>
                      <p className="text-xs text-charcoal-muted mt-1">{artwork.artist}</p>
                      <p className="text-xs font-semibold text-primary mt-2">
                        {artwork.sold ? (isEn ? 'Sold' : '판매 완료') : artwork.price}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* 내부 링크: 매거진 카테고리 + 작품 갤러리 교차 링크 */}
      <Section
        variant="white"
        prevVariant={
          relatedArtworks.length > 0
            ? 'white'
            : relatedStories.length > 0
              ? 'canvas-soft'
              : undefined
        }
        padding="sm"
      >
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-3">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1 text-sm font-medium text-charcoal-muted hover:text-primary transition-colors"
          >
            ← {isEn ? 'Back to Magazine' : '매거진 목록으로'}
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href={`/stories/category/${story.category}`}
            className="text-sm font-medium text-charcoal-muted hover:text-primary transition-colors"
          >
            {isEn ? CATEGORY_LABELS_EN[story.category] : CATEGORY_LABELS_KO[story.category]}
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/artworks"
            className="text-sm font-medium text-charcoal-muted hover:text-primary transition-colors"
          >
            {isEn ? 'Browse Artworks' : '작품 둘러보기'}
          </Link>
        </div>
      </Section>
    </>
  );
}
