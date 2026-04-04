import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getSupabaseNews, getSupabaseNewsById } from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { generateNewsArticleSchema, createBreadcrumbSchema } from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { SITE_URL, OG_IMAGE, CONTACT } from '@/lib/constants';
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
  const description = article.description || `${article.source} · ${article.date}`;

  return {
    title: article.title,
    description,
    alternates: createLocaleAlternates(path, locale),
    openGraph: {
      title: article.title,
      description,
      url: pageUrl,
      type: 'article',
      publishedTime: article.date,
      authors: [article.source],
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
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { id } = await params;
  const locale = resolveLocale(await getLocale());
  const article = await getSupabaseNewsById(id);

  if (!article) notFound();

  const description = article.description || `${article.source} · ${article.date}`;

  const articleSchema = generateNewsArticleSchema({
    title: article.title,
    description,
    datePublished: article.date,
    image: article.thumbnail || OG_IMAGE.url,
    url: buildLocaleUrl(`/news/${article.id}`, locale),
    publisherName: CONTACT.ORGANIZATION_NAME,
  });

  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: SITE_URL },
    { name: tBreadcrumbs('news'), url: buildLocaleUrl('/news', locale) },
    { name: article.title, url: buildLocaleUrl(`/news/${article.id}`, locale) },
  ]);

  return (
    <>
      <JsonLdScript data={[articleSchema, breadcrumbSchema]} />
      <PageHero title={article.title} description={`${article.source} · ${article.date}`} />
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
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-primary text-white rounded hover:opacity-90 transition"
            >
              {locale === 'en' ? 'Read original article' : '원문 기사 보기'}
            </a>
          )}
          <div className="mt-8">
            <Link href="/news" className="text-sm text-charcoal-muted hover:underline">
              ← {locale === 'en' ? 'Back to News' : '언론 보도 목록으로'}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
