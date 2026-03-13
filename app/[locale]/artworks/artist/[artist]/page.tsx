import { getSupabaseArtworks, getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { SITE_URL, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { generateEnhancedArtistSchema, createBreadcrumbSchema } from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { formatArtistName, resolveArtworkImageUrl } from '@/lib/utils';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Artwork, ArtworkListItem } from '@/types';
import { createLocaleAlternates } from '@/lib/locale-alternates';

const ArtworkGalleryWithSort = dynamic(
  () => import('@/components/features/ArtworkGalleryWithSort'),
  {
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-[4/5] bg-gray-200 rounded-sm animate-pulse" />
        ))}
      </div>
    ),
  }
);

interface Props {
  params: Promise<{
    artist: string;
  }>;
}

const resolveLocale = (locale: string): 'ko' | 'en' => (locale === 'en' ? 'en' : 'ko');

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
  const pageUrl = `${SITE_URL}${artistPath}`;

  // Find valid profile or note from any of the artist's artworks
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile || '';
  const artistNote = artistArtworks.find((a) => a.description)?.description || '';

  const profileSnippet = artistProfile ? `${artistProfile.substring(0, 150)}... ` : '';
  const noteSnippet = artistNote ? `${artistNote.substring(0, 150)}... ` : '';

  const formattedName = formatArtistName(artistName, locale !== 'en');
  const seoDescription =
    t('metaDescription', { artist: formattedName }) +
    (profileSnippet || noteSnippet || t('metaFallback'));

  const metaTitle = t('metaTitle', { artist: formattedName });

  return {
    title: metaTitle,
    description: seoDescription.substring(0, 160),
    keywords:
      locale === 'en'
        ? [artistName, 'SAF 2026', 'artist', 'artworks', 'exhibition']
        : [artistName, '씨앗페', 'SAF 2026', '예술가', '전시회'],
    alternates: createLocaleAlternates(artistPath),
    openGraph: {
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: t('metaImageAlt', { artist: formattedName, title: representativeArtwork.title }),
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
    ({ profile: _profile, history: _history, ...rest }: Artwork) => rest
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
  const artistNote = artistArtworks.find((a) => a.description)?.description;

  const formattedName = formatArtistName(artistName, locale !== 'en');
  const rawDescription =
    artistProfile || artistNote || t('defaultDescription', { artist: formattedName });

  // Truncate to 100 characters for visual balance
  const isTruncated = rawDescription.length > 100;
  const heroDescription = isTruncated ? `${rawDescription.substring(0, 100)}...` : rawDescription;

  const pageUrl = `${SITE_URL}/artworks/artist/${encodeURIComponent(artistName)}`;

  // Person JSON-LD Schema for SEO (enhanced with credentials, expertise, work samples)
  const artistHistory = artistArtworks.find((a) => a.history)?.history;
  const personSchema = generateEnhancedArtistSchema({
    name: artistName,
    description: artistProfile || artistNote || undefined,
    image: representativeArtwork.images[0],
    url: pageUrl,
    jobTitle: 'Artist',
    history: artistHistory,
    artworks: artistArtworks.map((a) => ({
      id: a.id,
      title: a.title,
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
      <Section variant="primary-surface" prevVariant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <ArtworkGalleryWithSort artworks={listArtworks} initialArtist={artistName} />
        </div>
      </Section>
    </main>
  );
}
