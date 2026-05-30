import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import { OG_IMAGE } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { getSpaceCollections, getCollectionArtworks } from '@/lib/space-collections';

export const dynamic = 'force-static';
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'collections' });
  const base = createPageMetadata(
    t('landingTitle'),
    t('landingSubtitle'),
    '/collections',
    OG_IMAGE.url,
    locale
  );
  return { ...base, alternates: createLocaleAlternates('/collections', locale, true) };
}

export default async function CollectionsLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEn = locale === 'en';
  const t = await getTranslations({ locale, namespace: 'collections' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const collections = getSpaceCollections();
  // 각 컬렉션 대표작 1점 (썸네일). getAvailableArtworksLight는 react cache라 풀은 1회만 fetch.
  const cards = await Promise.all(
    collections.map(async (c) => ({
      collection: c,
      cover: (await getCollectionArtworks(c.slug))[0] ?? null,
    }))
  );

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: t('landingTitle'), url: buildLocaleUrl('/collections', locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title={t('landingTitle')}
        description={t('landingSubtitle')}
        breadcrumbItems={breadcrumbItems}
      />

      <Section variant="canvas-soft">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ collection: c, cover }) => (
            <Link
              key={c.slug}
              href={`/collections/${c.slug}`}
              className="group block overflow-hidden rounded-2xl border border-gallery-hairline bg-white shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-canvas-strong">
                {cover?.images?.[0] ? (
                  <SafeImage
                    src={resolveArtworkImageUrlForPreset(cover.images[0], 'detail')}
                    alt={isEn ? c.titleEn : c.titleKo}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : null}
                <span className="absolute left-4 top-4 text-4xl drop-shadow-lg" aria-hidden="true">
                  {c.emoji}
                </span>
              </div>
              <div className="p-5">
                <h2 className="text-artwork-title text-lg text-charcoal-deep group-hover:text-primary-strong">
                  {isEn ? c.titleEn : c.titleKo}
                </h2>
                <p className="mt-1 text-sm text-charcoal-muted break-keep">
                  {isEn ? c.subtitleEn : c.subtitleKo}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
