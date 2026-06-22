import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getSupabaseNews, getSupabaseNewsById } from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { generateNewsArticleSchema, createBreadcrumbSchema } from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { OG_IMAGE } from '@/lib/constants';
import { resolveLocale } from '@/lib/server-locale';
import { localizeNewsSource } from '@/lib/news-source';
import SafeImage from '@/components/common/SafeImage';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import Section from '@/components/ui/Section';
import LinkButton from '@/components/ui/LinkButton';
import PageHero from '@/components/ui/PageHero';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-static';
export const revalidate = 1800;

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateStaticParams() {
  const news = await getSupabaseNews();
  return news.flatMap((article) => routing.locales.map((locale) => ({ locale, id: article.id })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const article = await getSupabaseNewsById(id);

  if (!article) return { title: 'Not Found' };

  const path = `/news/${article.id}`;
  const pageUrl = buildLocaleUrl(path, locale);
  const isEn = locale === 'en';
  const localizedTitle = isEn ? article.title_en?.trim() || article.title : article.title;
  const localizedSource = localizeNewsSource(article.source, locale);
  const localizedRawDesc = isEn
    ? article.description_en?.trim() || article.description
    : article.description;
  const description = localizedRawDesc
    ? localizedRawDesc.substring(0, 160)
    : isEn
      ? `Coverage by ${localizedSource}${article.date ? ` (${article.date})` : ''}. Reporting on financial discrimination against Korean artists and the mutual aid campaign.`
      : `${localizedSource}의 씨앗페 온라인 보도${article.date ? ` (${article.date})` : ''}. 예술인 금융 차별과 상호부조 캠페인을 조명합니다.`;

  return {
    title: localizedTitle,
    description,
    keywords: isEn
      ? [
          'SAF Online',
          'Korean artist financial discrimination',
          'artist mutual aid',
          localizedSource,
          'art news',
          'Korean art',
        ]
      : [
          '씨앗페',
          '예술인 금융 차별',
          '상호부조 기금',
          localizedSource,
          '예술인 뉴스',
          '씨앗페 보도',
        ],
    alternates: createLocaleAlternates(path, locale, true),
    openGraph: {
      title: localizedTitle,
      description,
      url: pageUrl,
      type: 'article',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      publishedTime: article.date,
      modifiedTime: article.date,
      authors: [localizedSource],
      section: locale === 'en' ? 'News' : '언론 보도',
      images: article.thumbnail
        ? [{ url: article.thumbnail, width: 1200, height: 630, alt: localizedTitle }]
        : [
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
      title: localizedTitle,
      description,
      images: article.thumbnail
        ? [{ url: article.thumbnail, alt: localizedTitle }]
        : [{ url: OG_IMAGE.url, alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt }],
    },
    // 영문 news detail은 noindex — EN_INDEXABLE_PAGES 화이트리스트는 `/news` list만 포함(detail 슬러그 없음).
    // robots.txt로 막지 않아 크롤러가 X-Robots-Tag/meta noindex를 확인할 수 있다. 외부 발견 시
    // layout 기본 `index: true` 응답을 막아 정합성 확보. 다른 영문 detail
    // (artworks/[id], artworks/artist/[artist], artworks/category/[category]) 정책과 일관.
    ...(isEn ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const article = await getSupabaseNewsById(id);

  // notFound()는 레이아웃 스트리밍 특성상 HTTP 200 + noindex로 응답 (Next.js streaming.mdx — SEO-safe).
  if (!article) notFound();

  const isEn = locale === 'en';
  const localizedTitle = isEn ? article.title_en?.trim() || article.title : article.title;
  const localizedSource = localizeNewsSource(article.source, locale);
  const localizedDescriptionRaw = isEn
    ? article.description_en?.trim() || article.description
    : article.description;
  const description = localizedDescriptionRaw
    ? localizedDescriptionRaw.substring(0, 160)
    : isEn
      ? `Coverage by ${localizedSource}${article.date ? ` (${article.date})` : ''}. Reporting on financial discrimination against Korean artists and the mutual aid campaign.`
      : `${localizedSource}의 씨앗페 온라인 보도${article.date ? ` (${article.date})` : ''}. 예술인 금융 차별과 상호부조 캠페인을 조명합니다.`;

  const articleSchema = generateNewsArticleSchema({
    title: localizedTitle,
    description,
    datePublished: article.date,
    image: article.thumbnail || OG_IMAGE.url,
    url: buildLocaleUrl(`/news/${article.id}`, locale),
    sourceName: localizedSource,
    locale,
  });

  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('news'), url: buildLocaleUrl('/news', locale) },
    { name: localizedTitle, url: buildLocaleUrl(`/news/${article.id}`, locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <JsonLdScript data={[articleSchema, breadcrumbSchema]} />
      <PageHero
        title={localizedTitle}
        description={`${localizedSource} · ${article.date}`}
        breadcrumbItems={breadcrumbItems}
        customBackgroundImage={article.thumbnail || undefined}
      />
      <Section>
        <div className="max-w-3xl mx-auto">
          {article.thumbnail && (
            <div className="relative w-full aspect-video mb-8 rounded overflow-hidden">
              <SafeImage
                src={article.thumbnail}
                alt={localizedTitle}
                fill
                className="object-cover"
              />
            </div>
          )}
          {localizedDescriptionRaw && (
            <MarkdownRenderer
              content={localizedDescriptionRaw}
              compact
              locale={locale}
              className="text-lg leading-relaxed mb-8"
            />
          )}
          {article.link && (
            <LinkButton
              href={article.link}
              external
              variant="primary"
              size="sm"
              className="px-6 py-3"
            >
              {locale === 'en' ? 'Read original article' : '원문 기사 보기'}
            </LinkButton>
          )}
          <div className="mt-10 p-5 bg-primary-surface rounded-lg border border-primary/15">
            <p className="text-sm text-charcoal-muted leading-relaxed">
              {locale === 'en' ? (
                <>
                  Understand{' '}
                  <Link
                    href="/our-reality"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    the structural causes of artist financial exclusion
                  </Link>
                  , or explore{' '}
                  <Link
                    href="/artworks"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    artworks from participating artists
                  </Link>
                  .
                </>
              ) : (
                <>
                  예술인 금융 배제의 구조는{' '}
                  <Link
                    href="/our-reality"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    우리의 현실
                  </Link>
                  에서 살펴보고 참여 작가들의 작품은{' '}
                  <Link
                    href="/artworks"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    전시 작품
                  </Link>
                  에서 확인하세요.
                </>
              )}
            </p>
          </div>
          {/* 공유 버튼 — 언론 보도는 캠페인 신뢰의 사회적 증거라 공유 가치가 높은데
              상세에만 공유 수단이 없었다 (2026-06-12 감사, 목록 페이지와 비대칭 해소) */}
          <div className="mt-8 flex items-center gap-3">
            <ShareButtonsWrapper
              url={buildLocaleUrl(`/news/${article.id}`, locale)}
              title={localizedTitle}
              description={description}
              imageUrl={article.thumbnail ?? undefined}
            />
          </div>
          <div className="mt-6">
            <Link href="/news" className="text-sm text-charcoal-muted hover:underline">
              ← {locale === 'en' ? 'Back to News' : '언론 보도 목록으로'}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
