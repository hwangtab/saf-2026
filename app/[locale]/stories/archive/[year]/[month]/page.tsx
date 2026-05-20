import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSupabaseStoriesLight } from '@/lib/supabase-data';
import type { StoryLight } from '@/lib/supabase-data';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { localizeStoryAuthor } from '@/lib/story-author';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { SITE_URL, CONTACT, OG_IMAGE } from '@/lib/constants';
import type { StoryCategory } from '@/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export const dynamic = 'force-static';
export const revalidate = 1800;

function extractFirstImage(body: string | null | undefined): string | null {
  if (!body) return null;
  const match = body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match?.[1] ?? null;
}

function getAvailableMonths(stories: StoryLight[]): string[] {
  const months = new Set<string>();
  stories.forEach((s) => {
    if (!s.published_at) return;
    const d = new Date(s.published_at);
    if (Number.isNaN(d.getTime())) return;
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });
  return Array.from(months).sort();
}

interface Props {
  params: Promise<{ locale: string; year: string; month: string }>;
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
  const stories = await getSupabaseStoriesLight();
  return getAvailableMonths(stories).flatMap((ym) => {
    const [year, month] = ym.split('-');
    return routing.locales.map((locale) => ({ locale, year, month }));
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, year, month } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEn = locale === 'en';

  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return {};
  }

  const date = new Date(yearNum, monthNum - 1, 1);
  const monthLabel = date.toLocaleDateString(isEn ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  const title = isEn
    ? `${monthLabel} Magazine | Seed Art Festival`
    : `${monthLabel} 매거진 | 씨앗페`;
  const description = isEn
    ? `Browse all magazine articles published in ${monthLabel} — artist stories, collecting guides, and art knowledge.`
    : `${monthLabel}에 발행된 씨앗페 매거진 글 모음 — 작가 이야기, 컬렉팅 가이드, 미술 상식.`;

  const path = `/stories/archive/${year}/${month}`;

  return {
    title,
    description,
    alternates: createLocaleAlternates(path, locale, true),
    ...(isEn ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: buildLocaleUrl(path, locale),
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
      title,
      description,
      images: [{ url: OG_IMAGE.url, alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt }],
    },
  };
}

export default async function StoryArchiveMonthPage({ params }: Props) {
  const { locale: rawLocale, year, month } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEn = locale === 'en';

  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  if (
    Number.isNaN(yearNum) ||
    year.length !== 4 ||
    Number.isNaN(monthNum) ||
    monthNum < 1 ||
    monthNum > 12
  ) {
    notFound();
  }

  const [allStories, tArchive] = await Promise.all([
    getSupabaseStoriesLight(),
    getTranslations({ locale, namespace: 'storiesArchive' }),
  ]);

  const monthStr = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
  const filtered = allStories
    .filter((s) => {
      if (!s.published_at) return false;
      const d = new Date(s.published_at);
      if (Number.isNaN(d.getTime())) return false;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return ym === monthStr;
    })
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  if (filtered.length === 0) notFound();

  const date = new Date(yearNum, monthNum - 1, 1);
  const monthLabel = date.toLocaleDateString(isEn ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
  });
  const heroSubtitle = tArchive('heroSubtitle', { count: filtered.length });

  // Adjacent month navigation
  const availableMonths = getAvailableMonths(allStories);
  const currentIdx = availableMonths.indexOf(monthStr);
  const prevMonthStr = currentIdx > 0 ? availableMonths[currentIdx - 1] : null;
  const nextMonthStr =
    currentIdx < availableMonths.length - 1 ? availableMonths[currentIdx + 1] : null;

  function monthToHref(ym: string) {
    const [y, m] = ym.split('-');
    return buildLocaleUrl(`/stories/archive/${y}/${m}`, locale);
  }
  function monthToLabel(ym: string) {
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleDateString(isEn ? 'en-US' : 'ko-KR', { year: 'numeric', month: 'long' });
  }

  const path = `/stories/archive/${year}/${month}`;
  const breadcrumbItems = [
    { name: isEn ? 'Home' : '홈', url: buildLocaleUrl('/', locale) },
    { name: isEn ? 'Magazine' : '매거진', url: buildLocaleUrl('/stories', locale) },
    { name: monthLabel, url: buildLocaleUrl(path, locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: isEn ? `${monthLabel} Magazine` : `${monthLabel} 매거진`,
    description: isEn
      ? `Browse all ${filtered.length} magazine articles published in ${monthLabel}.`
      : `${monthLabel}에 발행된 씨앗페 매거진 글 ${filtered.length}편.`,
    url: buildLocaleUrl(path, locale),
    inLanguage: isEn ? 'en-US' : 'ko-KR',
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: filtered.length,
      itemListElement: filtered.map((story, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: buildLocaleUrl(`/stories/${story.slug}`, locale),
        name: isEn && story.title_en ? story.title_en : story.title,
      })),
    },
  };

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={collectionSchema} />

      <PageHero title={monthLabel} description={heroSubtitle} breadcrumbItems={breadcrumbItems} />

      <Section variant="white" className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-5">
          {filtered.length === 0 ? (
            <p className="text-charcoal-muted text-center py-20">{tArchive('emptyState')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((story, i) => {
                const title = isEn && story.title_en ? story.title_en : story.title;
                const excerpt = isEn && story.excerpt_en ? story.excerpt_en : story.excerpt;
                const categoryLabel = isEn
                  ? CATEGORY_LABELS_EN[story.category]
                  : CATEGORY_LABELS_KO[story.category];

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
                        const cardImg = story.thumbnail ?? extractFirstImage(null);
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
                            <span className="text-charcoal-muted/20 text-5xl font-display font-black">
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
                        <span>·</span>
                        <span>{localizeStoryAuthor(story.author, locale as 'ko' | 'en')}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Adjacent month navigation */}
          {(prevMonthStr || nextMonthStr) && (
            <div className="mt-16 flex items-center justify-between gap-4 border-t border-gray-200 pt-8">
              {prevMonthStr ? (
                <Link
                  href={monthToHref(prevMonthStr)}
                  className="group inline-flex items-center gap-2 text-sm text-charcoal-muted hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  {monthToLabel(prevMonthStr)}
                </Link>
              ) : (
                <span />
              )}
              {nextMonthStr ? (
                <Link
                  href={monthToHref(nextMonthStr)}
                  className="group inline-flex items-center gap-2 text-sm text-charcoal-muted hover:text-primary transition-colors"
                >
                  {monthToLabel(nextMonthStr)}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
