import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import CollectionArtworkGrid from '@/components/features/CollectionArtworkGrid';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';
import { createBreadcrumbSchema, generateArtworkListSchema } from '@/lib/seo-utils';
import { createPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import {
  SPACE_COLLECTIONS,
  getSpaceCollections,
  getSpaceCollectionBySlug,
  getCollectionArtworks,
} from '@/lib/space-collections';

export const dynamic = 'force-static';
export const revalidate = 600;
// generateStaticParams의 6개 slug 외 잘못된 경로는 404 — 임의 slug로 ISR 렌더 시도 시
// 500 박힘 방지 (artworks/category/[category]와 동일 정책).
export const dynamicParams = false;

export function generateStaticParams() {
  return SPACE_COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const collection = getSpaceCollectionBySlug(slug);
  if (!collection) return {};
  const isEn = locale === 'en';
  const title = isEn ? collection.titleEn : collection.titleKo;
  const description = isEn ? collection.descriptionEn : collection.descriptionKo;

  // limit 없이 호출해 본문(page)과 동일 react cache 키 공유 → OG 이미지 = 페이지 첫 작품 일치.
  const artworks = await getCollectionArtworks(slug);
  const rawImg = artworks[0]?.images?.[0]
    ? resolveSeoArtworkImageUrl(artworks[0].images[0])
    : OG_IMAGE.url;
  const imageUrl = rawImg.startsWith('http') ? rawImg : `${SITE_URL}${rawImg}`;

  const base = createPageMetadata(
    title,
    description.slice(0, 160),
    `/collections/${slug}`,
    imageUrl,
    locale
  );
  // koOnly: 영문 컬렉션은 ko canonical로 통합 — sitemap(ko-only)과 정합, 중복 hreflang 방지.
  return { ...base, alternates: createLocaleAlternates(`/collections/${slug}`, locale, true) };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const collection = getSpaceCollectionBySlug(slug);
  if (!collection) notFound();

  const isEn = locale === 'en';
  const t = await getTranslations({ locale, namespace: 'collections' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const title = isEn ? collection.titleEn : collection.titleKo;
  const subtitle = isEn ? collection.subtitleEn : collection.subtitleKo;
  const description = isEn ? collection.descriptionEn : collection.descriptionKo;
  const pageUrl = buildLocaleUrl(`/collections/${slug}`, locale);
  const returnTo = encodeURIComponent(`/collections/${slug}`);

  const artworks = await getCollectionArtworks(slug);
  const others = getSpaceCollections().filter((c) => c.slug !== slug);

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: t('landingTitle'), url: buildLocaleUrl('/collections', locale) },
    { name: title, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const itemListSchema = artworks.length
    ? generateArtworkListSchema(artworks, locale, artworks.length, pageUrl, {
        name: title,
        description: subtitle,
      })
    : null;

  return (
    <>
      <JsonLdScript
        data={itemListSchema ? [breadcrumbSchema, itemListSchema] : [breadcrumbSchema]}
      />
      <PageHero title={title} description={subtitle} breadcrumbItems={breadcrumbItems} />

      <Section variant="canvas-soft">
        <p className="mx-auto mb-12 max-w-3xl text-center text-lg leading-relaxed text-charcoal-muted break-keep">
          {description}
        </p>

        {artworks.length > 0 ? (
          <>
            <p className="mb-10 text-center text-sm text-charcoal-soft">
              {t('artworkCount', { count: artworks.length })}
            </p>
            <CollectionArtworkGrid artworks={artworks} locale={locale} returnTo={returnTo} />
          </>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-gallery-hairline bg-white p-10 text-center shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-charcoal-deep text-balance">
              {t('emptyTitle')}
            </h2>
            <p className="mb-6 text-charcoal-muted break-keep">{t('emptyDesc')}</p>
            <Link
              href="/artworks"
              className="inline-flex items-center justify-center rounded-full border border-charcoal/30 px-6 py-3 font-medium text-charcoal-deep transition-colors hover:bg-charcoal hover:text-white"
            >
              {t('browseAll')}
            </Link>
          </div>
        )}
      </Section>

      <Section variant="white" prevVariant="canvas-soft">
        <SectionTitle className="mb-8 text-center">{t('exploreOthers')}</SectionTitle>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((c) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="group block rounded-2xl border border-gallery-hairline bg-white p-6 shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-3 text-3xl" aria-hidden="true">
                {c.emoji}
              </div>
              <h3 className="text-artwork-title text-lg text-charcoal-deep leading-snug group-hover:text-primary-strong">
                {isEn ? c.titleEn : c.titleKo}
              </h3>
              <p className="mt-1 text-sm text-charcoal-muted break-keep">
                {isEn ? c.subtitleEn : c.subtitleKo}
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
