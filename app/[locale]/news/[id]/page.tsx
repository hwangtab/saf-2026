import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getSupabaseNews, getSupabaseNewsById } from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { generateNewsArticleSchema, createBreadcrumbSchema } from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { OG_IMAGE } from '@/lib/constants';
import { resolveLocale } from '@/lib/server-locale';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export const revalidate = 1800;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const news = await getSupabaseNews();
  return news.flatMap((article) => routing.locales.map((locale) => ({ locale, id: article.id })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = resolveLocale(await getLocale());
  const article = await getSupabaseNewsById(id);

  if (!article) return { title: 'Not Found' };

  const path = `/news/${article.id}`;
  const pageUrl = buildLocaleUrl(path, locale);
  const isEn = locale === 'en';
  const description = article.description
    ? article.description.substring(0, 160)
    : isEn
      ? `Coverage by ${article.source}${article.date ? ` (${article.date})` : ''}. Reporting on financial discrimination against Korean artists and the mutual aid campaign.`
      : `${article.source}의 씨앗페 온라인 보도${article.date ? ` (${article.date})` : ''}. 예술인 금융 차별 문제와 상호부조 캠페인을 조명합니다.`;

  return {
    title: article.title,
    description,
    keywords: isEn
      ? [
          'SAF Online',
          'Korean artist financial discrimination',
          'artist mutual aid',
          article.source,
          'art news',
          'Korean art',
        ]
      : [
          '씨앗페',
          '예술인 금융 차별',
          '상호부조 기금',
          article.source,
          '예술인 뉴스',
          '씨앗페 보도',
        ],
    alternates: createLocaleAlternates(path, locale),
    openGraph: {
      title: article.title,
      description,
      url: pageUrl,
      type: 'article',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      publishedTime: article.date,
      authors: [article.source],
      section: locale === 'en' ? 'News' : '언론 보도',
      images: article.thumbnail
        ? [{ url: article.thumbnail, width: 1200, height: 630, alt: article.title }]
        : [
            {
              url: OG_IMAGE.url,
              width: OG_IMAGE.width,
              height: OG_IMAGE.height,
              alt: OG_IMAGE.alt,
            },
          ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: article.thumbnail ? [article.thumbnail] : [OG_IMAGE.url],
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { id } = await params;
  const locale = resolveLocale(await getLocale());
  const article = await getSupabaseNewsById(id);

  if (!article) notFound();

  const isEn = locale === 'en';
  const description = article.description
    ? article.description.substring(0, 160)
    : isEn
      ? `Coverage by ${article.source}${article.date ? ` (${article.date})` : ''}. Reporting on financial discrimination against Korean artists and the mutual aid campaign.`
      : `${article.source}의 씨앗페 온라인 보도${article.date ? ` (${article.date})` : ''}. 예술인 금융 차별 문제와 상호부조 캠페인을 조명합니다.`;

  const articleSchema = generateNewsArticleSchema({
    title: article.title,
    description,
    datePublished: article.date,
    image: article.thumbnail || OG_IMAGE.url,
    url: buildLocaleUrl(`/news/${article.id}`, locale),
    sourceName: article.source,
    locale,
  });

  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('news'), url: buildLocaleUrl('/news', locale) },
    { name: article.title, url: buildLocaleUrl(`/news/${article.id}`, locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <JsonLdScript data={[articleSchema, breadcrumbSchema]} />
      <PageHero
        title={article.title}
        description={`${article.source} · ${article.date}`}
        breadcrumbItems={breadcrumbItems}
      />
      <Section>
        <div className="max-w-3xl mx-auto">
          {article.thumbnail && (
            <div className="relative w-full aspect-video mb-8 rounded overflow-hidden">
              <SafeImage
                src={article.thumbnail}
                alt={article.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          {article.description && (
            <p className="text-lg leading-relaxed mb-8">{article.description}</p>
          )}
          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-block px-6 py-3 bg-primary text-white rounded hover:opacity-90 transition"
            >
              {locale === 'en' ? 'Read original article' : '원문 기사 보기'}
            </a>
          )}
          <div className="mt-10 p-5 bg-primary/5 rounded-lg border border-primary/15">
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
                  예술인 금융 배제의 구조적 원인은{' '}
                  <Link
                    href="/our-reality"
                    className="text-primary-strong hover:underline font-medium"
                  >
                    우리의 현실
                  </Link>
                  에서, 참여 작가들의 작품은{' '}
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
