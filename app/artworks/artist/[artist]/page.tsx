import { getAllArtworks } from '@/content/saf2026-artworks';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import { SITE_URL } from '@/lib/constants';
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
  params: {
    artist: string;
  };
}

// Generate metadata for Artist Page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artistName = decodeURIComponent(params.artist);
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
    `${artistName} 작가의 작품 세계를 만나보세요. ` +
    (profileSnippet ||
      noteSnippet ||
      '70여 명의 예술가들이 전하는 연대와 희망의 메시지, 씨앗페 2026.');

  const metaTitle = `${artistName} 작가 - 출품작 | 씨앗페 2026`;

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
          alt: `${artistName} 작가의 작품 - ${representativeArtwork.title}`,
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

export default function ArtistPage({ params }: Props) {
  const artistName = decodeURIComponent(params.artist);
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
    artistProfile || artistNote || `${artistName} 작가의 시선, 그 깊이를 마주하다.`;

  // Truncate to 100 characters for visual balance
  const isTruncated = rawDescription.length > 100;
  const heroDescription = isTruncated ? `${rawDescription.substring(0, 100)}...` : rawDescription;

  const pageUrl = `${SITE_URL}/artworks/artist/${encodeURIComponent(artistName)}`;

  return (
    <main className="min-h-screen">
      <PageHero
        title={`${artistName} 작가`}
        description={heroDescription}
        customBackgroundImage={heroBackgroundImage}
      >
        <ShareButtons
          url={pageUrl}
          title={`${artistName} 작가 - 씨앗페 2026 출품작`}
          description={`${artistName} 작가의 작품을 감상하고 예술인을 응원하세요.`}
        />
      </PageHero>

      {/* Gallery Section */}
      <Section variant="primary-surface" prevVariant="white" padding="none" className="pt-4 pb-12">
        <div className="container-max">
          <ArtworkGalleryWithSort artworks={artworks} initialArtist={artistName} />
        </div>
      </Section>
    </main>
  );
}
