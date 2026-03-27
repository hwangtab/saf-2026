import { getSupabaseArtworks, getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { SITE_URL, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { generateEnhancedArtistSchema, createBreadcrumbSchema } from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { formatArtistName, resolveArtworkImageUrl } from '@/lib/utils';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Artwork, ArtworkListItem } from '@/types';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { containsHangul } from '@/lib/search-utils';

import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';

export const revalidate = 600;

interface Props {
  params: Promise<{
    artist: string;
  }>;
}

// Generate metadata for Artist Page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const { artist } = await params;
  const artistName = decodeURIComponent(artist);
  const artistArtworks = await getSupabaseArtworksByArtist(artistName);
  const t = await getTranslations('artistPage');

  if (artistArtworks.length === 0) {
    return {
      title: t('notFound'),
    };
  }

  // Use the first artwork's image as the representative image for the artist
  const representativeArtwork = artistArtworks[0];
  const resolvedImageUrl = resolveArtworkImageUrl(representativeArtwork.images[0]);
  const imageUrl = resolvedImageUrl.startsWith('http')
    ? resolvedImageUrl
    : `${SITE_URL}${resolvedImageUrl}`;
  const artistPath = `/artworks/artist/${encodeURIComponent(artistName)}`;
  const pageUrl = buildLocaleUrl(artistPath, locale);

  // Find valid profile or note from any of the artist's artworks
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile || '';
  const artistProfileEn = artistArtworks.find((a) => a.profile_en)?.profile_en || '';
  const artistNote = artistArtworks.find((a) => a.description)?.description || '';

  const effectiveProfile = locale === 'en' && artistProfileEn ? artistProfileEn : artistProfile;
  const profileSnippet =
    effectiveProfile && !(locale === 'en' && containsHangul(effectiveProfile))
      ? `${effectiveProfile.substring(0, 200)}... `
      : '';
  const noteSnippet =
    artistNote && !(locale === 'en' && containsHangul(artistNote))
      ? `${artistNote.substring(0, 200)}... `
      : '';

  const displayArtistName =
    locale === 'en' && artistArtworks[0]?.artist_en ? artistArtworks[0].artist_en : artistName;
  const formattedName = formatArtistName(displayArtistName, locale !== 'en');
  const seoDescription =
    t('metaDescription', { artist: formattedName }) +
    (profileSnippet || noteSnippet || t('metaFallback'));

  const metaTitle = t('metaTitle', { artist: formattedName });

  return {
    title: metaTitle,
    description: seoDescription.substring(0, 300),
    keywords:
      locale === 'en'
        ? [artistName, 'SAF 2026', 'artist', 'artworks', 'exhibition']
        : [artistName, '씨앗페', 'SAF 2026', '예술가', '전시회'],
    alternates: createLocaleAlternates(artistPath, locale),
    openGraph: {
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: t('metaImageAlt', {
            artist: formattedName,
            title:
              locale === 'en' && representativeArtwork.title_en
                ? representativeArtwork.title_en
                : representativeArtwork.title,
          }),
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      images: [imageUrl],
    },
  };
}

// Generate static params for all artists
export async function generateStaticParams() {
  const artworks = await getSupabaseArtworks();

  // Extract unique artist names
  const artists = Array.from(new Set(artworks.map((a) => a.artist)));

  return artists.map((artist) => ({
    artist: artist,
  }));
}

export default async function ArtistPage({ params }: Props) {
  const locale = resolveLocale(await getLocale());
  const { artist } = await params;
  const artistName = decodeURIComponent(artist);
  const artistArtworks = await getSupabaseArtworksByArtist(artistName);
  const listArtworks: ArtworkListItem[] = artistArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const t = await getTranslations('artistPage');

  if (artistArtworks.length === 0) {
    notFound();
  }

  // Use the first artwork's image as the hero background
  const representativeArtwork = artistArtworks[0];
  const resolvedImageUrl = resolveArtworkImageUrl(representativeArtwork.images[0]);
  const heroBackgroundImage = resolvedImageUrl;

  // Description Logic: Profile > Description (Note) > Default
  // Find valid profile or note from any of the artist's artworks (usually they are same for all)
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile;
  const artistProfileEn = artistArtworks.find((a) => a.profile_en)?.profile_en;
  const artistNote = artistArtworks.find((a) => a.description)?.description;

  const displayArtistName =
    locale === 'en' && artistArtworks[0]?.artist_en ? artistArtworks[0].artist_en : artistName;
  const formattedName = formatArtistName(displayArtistName, locale !== 'en');
  const rawDescription =
    locale === 'en'
      ? artistProfileEn ||
        artistProfile ||
        artistNote ||
        t('defaultDescription', { artist: formattedName })
      : artistProfile || artistNote || t('defaultDescription', { artist: formattedName });
  const localizedDescription =
    locale === 'en' && containsHangul(rawDescription)
      ? t('originalKoreanDescription')
      : rawDescription;

  // Truncate to 100 characters for visual balance
  const isTruncated = localizedDescription.length > 100;
  const heroDescription = isTruncated
    ? `${localizedDescription.substring(0, 100)}...`
    : localizedDescription;

  const pageUrl = `${SITE_URL}/artworks/artist/${encodeURIComponent(artistName)}`;

  // Person JSON-LD Schema for SEO (enhanced with credentials, expertise, work samples)
  const artistHistory = artistArtworks.find((a) => a.history)?.history;
  const artistHistoryEn = artistArtworks.find((a) => a.history_en)?.history_en;
  const schemaProfile = locale === 'en' ? artistProfileEn || artistProfile : artistProfile;
  const schemaDescription =
    locale === 'en' && schemaProfile && containsHangul(schemaProfile)
      ? t('originalKoreanDescription')
      : schemaProfile || artistNote || undefined;
  const effectiveHistory = locale === 'en' ? artistHistoryEn || artistHistory : artistHistory;
  const schemaHistory =
    locale === 'en' && effectiveHistory && containsHangul(effectiveHistory)
      ? undefined
      : effectiveHistory;
  const personSchema = generateEnhancedArtistSchema({
    name: displayArtistName,
    description: schemaDescription,
    image: representativeArtwork.images[0],
    url: pageUrl,
    jobTitle: 'Artist',
    history: schemaHistory,
    artworks: artistArtworks.map((a) => ({
      id: a.id,
      title: locale === 'en' && a.title_en ? a.title_en : a.title,
      image: a.images[0],
    })),
  });

  // Breadcrumb Schema: Home > Artworks > Artist Name
  const breadcrumbSchema = createBreadcrumbSchema([
    BREADCRUMB_HOME,
    BREADCRUMBS['/artworks'],
    { name: formattedName, url: pageUrl },
  ]);

  return (
    <main className="min-h-screen">
      <JsonLdScript data={personSchema} />
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title={formattedName}
        description={heroDescription}
        customBackgroundImage={heroBackgroundImage}
      >
        <ShareButtonsWrapper
          url={pageUrl}
          title={t('shareTitle', { artist: formattedName })}
          description={t('shareDescription', { artist: formattedName })}
        />
      </PageHero>

      {/* Gallery Section */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <ArtworkGalleryWithSort artworks={listArtworks} initialArtist={artistName} />
        </div>
      </Section>

      {/* Campaign Banner */}
      <Section variant="white" prevVariant="primary-surface" className="pb-24 md:pb-32">
        <GalleryCampaignBanner />
      </Section>
    </main>
  );
}
