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
import type { StoryCategory, Artwork } from '@/types';

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
  const { slug } = await params;
  const locale = resolveLocale(await getLocale());
  const story = await getSupabaseStoryBySlug(slug);

  if (!story) notFound();

  const isEn = locale === 'en';
  const title = isEn && story.title_en ? story.title_en : story.title;
  const excerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
  const body = isEn && story.body_en ? story.body_en : story.body;
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
  let relatedArtworks: Artwork[] = [];
  if (primaryArtistTag) {
    relatedArtworks = (await getSupabaseArtworksByArtist(primaryArtistTag)).slice(0, 3);
  }
  if (relatedArtworks.length === 0) {
    const allArtworks = await getSupabaseArtworks();
    relatedArtworks = allArtworks.filter((a) => !a.sold).slice(0, 3);
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
        description={`${categoryLabel} · ${story.published_at}${story.author ? ` · ${story.author}` : ''}`}
        breadcrumbItems={breadcrumbItems}
      />

      {/* Article Body */}
      <Section variant="white">
        <article className="max-w-3xl mx-auto">
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

          <div
            className="mt-10 text-lg font-semibold tracking-tight text-primary motion-safe:opacity-0 motion-safe:animate-fade-in-up"
            style={{ animationDelay: '0.25s', animationFillMode: 'forwards' }}
          >
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
      {/* 관련 작품 */}
      {relatedArtworks.length > 0 && (
        <Section
          variant="canvas-soft"
          prevVariant="white"
          className={relatedStories.length === 0 ? 'pb-16 md:pb-24' : ''}
        >
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
                const imgUrl = resolveArtworkImageUrl(artwork.images[0] ?? '');
                return (
                  <Link
                    key={artwork.id}
                    href={`/artworks/${artwork.id}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl motion-safe:opacity-0 motion-safe:animate-fade-in-up"
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

      {/* 관련 글 */}
      {relatedStories.length > 0 && (
        <Section
          variant={relatedArtworks.length > 0 ? 'white' : 'canvas-soft'}
          prevVariant={relatedArtworks.length > 0 ? 'canvas-soft' : 'white'}
          className="pb-16 md:pb-24"
        >
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
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl motion-safe:opacity-0 motion-safe:animate-fade-in-up"
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
    </>
  );
}
