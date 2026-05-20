import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import PageHero from '@/components/ui/PageHero';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { createPageMetadata } from '@/lib/seo';
import { createLocaleAlternates, buildLocaleUrl } from '@/lib/locale-alternates';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { SITE_URL, CONTACT } from '@/lib/constants';
import type { Artwork } from '@/types';

export const dynamic = 'force-static';
export const revalidate = 600;

type LocaleParams = { locale: string };

type ArtistEntry = {
  name: string;
  nameEn?: string;
  cover: Artwork;
  count: number;
};

function groupArtistsByName(artworks: Artwork[]): ArtistEntry[] {
  const byArtist = new Map<
    string,
    { name: string; nameEn?: string; cover?: Artwork; count: number }
  >();
  for (const aw of artworks) {
    if (!aw.artist) continue;
    const e = byArtist.get(aw.artist) ?? { name: aw.artist, nameEn: aw.artist_en, count: 0 };
    e.count += 1;
    if (!e.cover && aw.images?.[0]) e.cover = aw;
    byArtist.set(aw.artist, e);
  }
  return [...byArtist.values()]
    .filter((a): a is ArtistEntry => !!a.cover)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'artistsIndexPage' });

  const artworks = await getSupabaseArtworks();
  const artistCount = new Set(artworks.map((a) => a.artist).filter(Boolean)).size;

  const description = t('description', { artistCount });
  const representativeArtwork = artworks.find((a) => !a.sold && a.images[0]) || artworks[0];
  const ogImageUrl = representativeArtwork?.images[0]
    ? resolveArtworkImageUrlForPreset(representativeArtwork.images[0], 'hero')
    : undefined;

  return {
    ...createPageMetadata(
      t('seoTitle', { artistCount }),
      description,
      '/artworks/artist',
      ogImageUrl,
      locale
    ),
    alternates: createLocaleAlternates('/artworks/artist', locale, true),
    ...(locale === 'en' ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ArtistsIndexPage({ params }: { params: Promise<LocaleParams> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'artistsIndexPage' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const isEn = locale === 'en';

  const artworks = await getSupabaseArtworks();
  const artists = groupArtistsByName(artworks);
  const artistCount = artists.length;

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: tBreadcrumbs('artists'), url: buildLocaleUrl('/artworks/artist', locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const pageUrl = buildLocaleUrl('/artworks/artist', locale);

  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    name: isEn
      ? `SAF Artists — ${artistCount} Korean Contemporary Art Galleries`
      : `씨앗페 참여 작가 ${artistCount}명`,
    description: t('description', { artistCount }),
    url: pageUrl,
    isPartOf: { '@id': `${SITE_URL}#website` },
    inLanguage: isEn ? 'en-US' : 'ko-KR',
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#item-list`,
    name: isEn ? 'SAF 2026 Artists' : '씨앗페 2026 참여 작가',
    numberOfItems: artistCount,
    itemListElement: artists.map((artist, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Person',
        name: isEn && artist.nameEn ? artist.nameEn : artist.name,
        url: `${SITE_URL}${isEn ? '/en' : ''}/artworks/artist/${encodeURIComponent(artist.name)}`,
      },
    })),
  };

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={collectionPageSchema} />
      <JsonLdScript data={itemListSchema} />
      <div className={`min-h-screen ${SAWTOOTH_TOP_SAFE_PADDING}`}>
        <PageHero
          title={t('title')}
          description={t('heroDescription', { artistCount })}
          breadcrumbItems={breadcrumbItems}
        />

        <Section variant="white" padding="none" className="pt-8 md:pt-10 pb-4">
          <div className="container-max max-w-4xl">
            <p className="text-charcoal text-base md:text-lg leading-relaxed">{t('intro')}</p>
          </div>
        </Section>

        <Section variant="white" padding="none" className="pt-2 pb-16 md:pb-24">
          <div className="container-max">
            <SectionTitle className="sr-only">{t('browseByArtist')}</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {artists.map((artist) => {
                const displayName = isEn && artist.nameEn ? artist.nameEn : artist.name;
                const coverSrc = resolveArtworkImageUrlForPreset(artist.cover.images[0], 'card');
                const href = `/artworks/artist/${encodeURIComponent(artist.name)}`;

                return (
                  <Link
                    key={artist.name}
                    href={href}
                    className="group block"
                    aria-label={t('viewArtist', { name: displayName })}
                  >
                    <article className="h-full overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl">
                      <div className="relative aspect-square overflow-hidden bg-canvas-soft">
                        <SafeImage
                          src={coverSrc}
                          alt={
                            isEn ? `${displayName} — representative work` : `${displayName} 대표작`
                          }
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 230px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>
                      <div className="p-4 md:p-5">
                        <h2 className="text-base md:text-lg font-bold text-charcoal-deep break-keep mb-1">
                          {displayName}
                        </h2>
                        <p className="text-sm text-charcoal-muted">
                          {t('artworkCount', { count: artist.count })}
                        </p>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>

            <div className="mt-10 md:mt-12 flex justify-center">
              <Link
                href="/artworks"
                className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm md:text-base font-semibold border border-charcoal/20 text-charcoal bg-white hover:bg-canvas hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow,background-color] duration-300"
              >
                {isEn ? 'View All Artworks' : '전체 작품 보기'}
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
