import dynamic from 'next/dynamic';
import Section from '@/components/ui/Section';

import { getAllArtworks } from '@/content/saf2026-artworks';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import { SITE_URL } from '@/lib/constants';
import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import { GallerySkeleton, SearchBarSkeleton } from '@/components/ui/Skeleton';

const ArtworkGalleryWithSort = dynamic(
  () => import('@/components/features/ArtworkGalleryWithSort'),
  {
    loading: () => (
      <div className="space-y-6">
        <SearchBarSkeleton />
        <GallerySkeleton count={6} />
      </div>
    ),
  }
);

const PAGE_URL = `${SITE_URL}/artworks`;

export const metadata: Metadata = createPageMetadata(
  '출품작',
  '씨앗페 2026에 출품된 예술가들의 작품을 만나보세요. 후원과 작품 구매로 예술인의 금융 위기 해결에 동참할 수 있습니다.',
  '/artworks'
);

export default function ArtworksPage() {
  const artworks = getAllArtworks();

  return (
    <main className="min-h-screen">
      <PageHero
        title="출품작"
        description="예술가들의 시선으로 바라본 우리의 현실과 희망. 2026 씨앗페와 함께하는 작품을 소개합니다."
      >
        <ShareButtons
          url={PAGE_URL}
          title="출품작 - 2026 씨앗페"
          description="2026 Seed Art Festival에 출품된 아름다운 예술 작품들을 만나보세요."
        />
      </PageHero>

      {/* Gallery Section */}
      <Section variant="primary-surface" prevVariant="white" padding="default">
        <div className="container-max">
          <ArtworkGalleryWithSort artworks={artworks} />
        </div>
      </Section>
    </main>
  );
}
