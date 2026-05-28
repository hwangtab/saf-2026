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
import { getSupabaseArtworks, getSupabaseStoriesLight } from '@/lib/supabase-data';
import { getMediumHubSlug } from '@/lib/artwork-medium-hub';
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

  const [artworks, allStories] = await Promise.all([
    getSupabaseArtworks(),
    getSupabaseStoriesLight(),
  ]);
  const artists = groupArtistsByName(artworks);
  const artistCount = artists.length;

  // 매체별 hub 매거진 카드 — 작가 인덱스 → 매체 hub link equity flow.
  // 작품수 기준 top 4 매체 카테고리만 노출(noise 최소화).
  const categoryCounts = artworks.reduce<Record<string, number>>((acc, a) => {
    if (a.category) acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat]) => cat);
  const mediumHubCards = topCategories
    .map((cat) => {
      const slug = getMediumHubSlug(cat);
      if (!slug) return null;
      const story = allStories.find((s) => s.slug === slug);
      if (!story) return null;
      return { category: cat, slug, title: story.title, titleEn: story.title_en };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: tBreadcrumbs('artists'), url: buildLocaleUrl('/artworks/artist', locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const pageUrl = buildLocaleUrl('/artworks/artist', locale);

  // 매체 hub about entity — 작가 인덱스도 4 매체 hub와 schema 연결(작품수 top 4).
  const aboutHubs = mediumHubCards.map((card) => ({
    '@type': 'CreativeWork' as const,
    '@id': `${SITE_URL}/stories/${card.slug}#about`,
    url: `${SITE_URL}/stories/${card.slug}`,
    name: isEn && card.titleEn ? card.titleEn : card.title,
  }));

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
    ...(aboutHubs.length > 0 && { about: aboutHubs }),
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

        {/* 매체별 hub 매거진 — 작가 인덱스 → 매체 hub link equity. top 4 매체만 노출. */}
        {mediumHubCards.length > 0 && (
          <Section variant="canvas-soft" prevVariant="white" className="pt-10 md:pt-16 pb-16">
            <div className="container-max max-w-4xl">
              <h2 className="text-xl md:text-2xl font-section font-bold text-charcoal-deep mb-6 text-center">
                {isEn ? 'Magazine guides by medium' : '매체별 매거진 가이드'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mediumHubCards.map((card) => (
                  <Link
                    key={card.slug}
                    href={`/stories/${card.slug}`}
                    className="block rounded-2xl border border-gallery-hairline bg-white p-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-eyebrow text-primary-strong mb-1.5">{card.category}</div>
                    <div className="text-sm md:text-base font-medium text-charcoal-deep leading-snug">
                      {isEn && card.titleEn ? card.titleEn : card.title}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
