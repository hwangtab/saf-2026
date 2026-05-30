import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
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
      // limit 없이 호출 — 개별 페이지와 동일 react cache 키 공유로 썸네일/첫 작품 일치.
      cover: (await getCollectionArtworks(c.slug))[0] ?? null,
    }))
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: t('landingTitle'), url: buildLocaleUrl('/collections', locale) },
  ]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <div className={`w-full bg-canvas-soft min-h-screen font-sans ${SAWTOOTH_TOP_SAFE_PADDING}`}>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-charcoal-deep via-charcoal to-primary-strong/70 px-4 py-20 md:py-28">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute left-0 top-0 h-px w-px"
          />
          <div className="relative z-10 mx-auto max-w-3xl text-center text-white">
            <h1 className="font-display text-3xl font-black tracking-tight text-balance sm:text-4xl md:text-5xl">
              {t('landingTitle')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg font-medium text-white/80 text-balance md:text-xl">
              {t('landingSubtitle')}
            </p>
          </div>
        </section>

        {/* Collection cards */}
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ collection: c, cover }) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="group block overflow-hidden rounded-2xl border border-gallery-hairline bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
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
                  <span
                    className="absolute left-4 top-4 text-4xl drop-shadow-lg"
                    aria-hidden="true"
                  >
                    {c.emoji}
                  </span>
                </div>
                <div className="p-5">
                  <div className="text-lg font-bold text-charcoal-deep leading-snug break-keep group-hover:text-primary-strong">
                    {isEn ? c.titleEn : c.titleKo}
                  </div>
                  <div className="mt-1 text-sm text-charcoal-muted break-keep">
                    {isEn ? c.subtitleEn : c.subtitleKo}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
