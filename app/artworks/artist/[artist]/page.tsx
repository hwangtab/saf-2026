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

  return {
    title: `${artistName} 작가 - 출품작 | 씨앗페 2026`,
    description: `${artistName} 작가의 작품을 포함한 100여명 작가들의 예술 작품을 만나보세요. 씨앗페 2026.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${artistName} 작가 - 출품작 | 씨앗페 2026`,
      description: `${artistName} 작가의 작품세계를 만나보세요. 2026 씨앗페 출품작.`,
      url: pageUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${artistName} 작가의 작품 - ${representativeArtwork.title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artistName} 작가 - 출품작 | 씨앗페 2026`,
      description: `${artistName} 작가의 작품을 만나보세요.`,
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

  // Verify artist exists
  const hasArtist = artworks.some((a) => a.artist === artistName);

  if (!hasArtist) {
    notFound();
  }

  const pageUrl = `${SITE_URL}/artworks/artist/${encodeURIComponent(artistName)}`;

  return (
    <main className="min-h-screen">
      <PageHero
        title={`${artistName} 작가`}
        description={`예술가들의 시선으로 바라본 우리의 현실과 희망. ${artistName} 작가의 작품을 소개합니다.`}
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
