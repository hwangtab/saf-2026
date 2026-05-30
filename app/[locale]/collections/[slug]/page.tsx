import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import CollectionArtworkGrid from '@/components/features/CollectionArtworkGrid';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
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

  const artworks = await getCollectionArtworks(slug, 1);
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
  return { ...base, alternates: createLocaleAlternates(`/collections/${slug}`, locale) };
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

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: t('landingTitle'), url: buildLocaleUrl('/collections', locale) },
    { name: title, url: pageUrl },
  ]);
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
      <div className={`w-full bg-canvas-soft min-h-screen font-sans ${SAWTOOTH_TOP_SAFE_PADDING}`}>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-charcoal-deep via-charcoal to-primary-strong/70 px-4 py-20 md:py-28">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute left-0 top-0 h-px w-px"
          />
          <div className="relative z-10 mx-auto max-w-3xl text-center text-white">
            <div className="mb-5 text-5xl md:text-6xl" aria-hidden="true">
              {collection.emoji}
            </div>
            <h1 className="font-display text-3xl font-black tracking-tight text-balance sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-lg font-medium text-white/80 text-balance md:text-xl">
              {subtitle}
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/65 break-keep">
              {description}
            </p>
          </div>
        </section>

        {/* Artworks */}
        <div className="mx-auto max-w-[1440px] px-4 py-16 md:py-20">
          {artworks.length > 0 ? (
            <>
              <p className="mb-10 text-center text-sm text-charcoal-muted">
                {t('artworkCount', { count: artworks.length })}
              </p>
              <CollectionArtworkGrid artworks={artworks} locale={locale} returnTo={returnTo} />
            </>
          ) : (
            <section className="py-16 text-center">
              <div className="inline-block rounded-xl border border-charcoal/10 bg-white p-10">
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
            </section>
          )}
        </div>

        {/* Other collections */}
        <div className="mx-auto max-w-5xl px-4 pb-20 md:pb-24">
          <h2 className="mb-8 text-center text-2xl font-bold text-charcoal-deep break-keep md:text-3xl">
            {t('exploreOthers')}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="group block rounded-2xl border border-charcoal/15 bg-white p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-3 text-3xl" aria-hidden="true">
                  {c.emoji}
                </div>
                <div className="text-lg font-bold text-charcoal-deep leading-snug break-keep group-hover:text-primary-strong">
                  {isEn ? c.titleEn : c.titleKo}
                </div>
                <div className="mt-1 text-sm text-charcoal-muted break-keep">
                  {isEn ? c.subtitleEn : c.subtitleKo}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
