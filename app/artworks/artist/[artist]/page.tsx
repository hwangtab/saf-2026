import { getAllArtworks } from '@/content/saf2026-artworks';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import { SITE_URL } from '@/lib/constants';
import { escapeJsonLdForScript } from '@/lib/seo-utils';
import { formatArtistName } from '@/lib/utils';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

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

// Generate metadata for Artist Page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist } = await params;
  const artistName = decodeURIComponent(artist);
  const artworks = getAllArtworks();
  const artistArtworks = artworks.filter((a) => a.artist === artistName);

  if (artistArtworks.length === 0) {
    return {
      title: '작가를 찾을 수 없습니다',
    };
  }

  // Use the first artwork's image as the representative image for the artist
  const representativeArtwork = artistArtworks[0];
  const imageUrl = `${SITE_URL}/images/artworks/${representativeArtwork.image}`;
  const pageUrl = `${SITE_URL}/artworks/artist/${encodeURIComponent(artistName)}`;

  // Find valid profile or note from any of the artist's artworks
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile || '';
  const artistNote = artistArtworks.find((a) => a.description)?.description || '';

  const profileSnippet = artistProfile ? `${artistProfile.substring(0, 150)}... ` : '';
  const noteSnippet = artistNote ? `${artistNote.substring(0, 150)}... ` : '';

  const seoDescription =
    `${formatArtistName(artistName)}의 작품 세계를 만나보세요. ` +
    (profileSnippet || noteSnippet || '예술가들이 전하는 연대와 희망의 메시지, 씨앗페 2026.');

  const metaTitle = `${formatArtistName(artistName)} - 출품작 | 씨앗페 2026`;

  return {
    title: metaTitle,
    description: seoDescription.substring(0, 160),
    keywords: [artistName, '씨앗페', 'SAF 2026', '예술가', '전시회'],
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${formatArtistName(artistName)}의 작품 - ${representativeArtwork.title}`,
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
  const artworks = getAllArtworks();

  // Extract unique artist names
  const artists = Array.from(new Set(artworks.map((a) => a.artist)));

  return artists.map((artist) => ({
    artist: artist,
  }));
}

export default async function ArtistPage({ params }: Props) {
  const { artist } = await params;
  const artistName = decodeURIComponent(artist);
  const artworks = getAllArtworks();

  // Get artist's artworks
  const artistArtworks = artworks.filter((a) => a.artist === artistName);

  if (artistArtworks.length === 0) {
    notFound();
  }

  // Use the first artwork's image as the hero background
  const representativeArtwork = artistArtworks[0];
  const heroBackgroundImage = `/images/artworks/${representativeArtwork.image}`;

  // Description Logic: Profile > Description (Note) > Default
  // Find valid profile or note from any of the artist's artworks (usually they are same for all)
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile;
  const artistNote = artistArtworks.find((a) => a.description)?.description;

  const rawDescription =
    artistProfile || artistNote || `${formatArtistName(artistName)}의 시선, 그 깊이를 마주하다.`;

  // Truncate to 100 characters for visual balance
  const isTruncated = rawDescription.length > 100;
  const heroDescription = isTruncated ? `${rawDescription.substring(0, 100)}...` : rawDescription;

  const pageUrl = `${SITE_URL}/artworks/artist/${encodeURIComponent(artistName)}`;

  // Person JSON-LD Schema for SEO
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artistName,
    description: artistProfile || artistNote || undefined,
    image: `${SITE_URL}/images/artworks/${representativeArtwork.image}`,
    url: pageUrl,
    knowsAbout: ['미술', '예술', 'Visual Arts'],
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLdForScript(JSON.stringify(personSchema)) }}
      />
      <PageHero
        title={formatArtistName(artistName)}
        description={heroDescription}
        customBackgroundImage={heroBackgroundImage}
      >
        <ShareButtons
          url={pageUrl}
          title={`${formatArtistName(artistName)} - 씨앗페 2026 출품작`}
          description={`${formatArtistName(artistName)}의 작품을 감상하고 예술인을 응원하세요.`}
        />
      </PageHero>

      {/* Gallery Section */}
      <Section variant="primary-surface" prevVariant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <ArtworkGalleryWithSort artworks={artworks} initialArtist={artistName} />
        </div>
      </Section>
    </main>
  );
}
