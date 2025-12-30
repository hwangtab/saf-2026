import { getAllArtworks } from '@/content/saf2026-artworks';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';
import { Metadata } from 'next';

const PAGE_URL = `${SITE_URL}/artworks`;

export const metadata: Metadata = {
    title: '출품작 | 씨앗페 2026',
    description: '씨앗페 2026에 출품된 100여점의 예술 작품을 만나보세요. 후원과 작품 구매로 예술인의 금융 위기 해결에 동참할 수 있습니다.',
    alternates: {
        canonical: PAGE_URL,
    },
    openGraph: {
        title: '출품작 | 씨앗페 2026',
        description: '예술가들의 시선으로 바라본 우리의 현실과 희망. 100여점의 작품을 만나보세요.',
        url: PAGE_URL,
        images: [
            {
                url: OG_IMAGE.url,
                width: OG_IMAGE.width,
                height: OG_IMAGE.height,
                alt: OG_IMAGE.alt,
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: '출품작 | 씨앗페 2026',
        description: '씨앗페 2026에 출품된 100여점의 예술 작품을 만나보세요.',
        images: [OG_IMAGE.url],
    },
};

export default function ArtworksPage() {
    const artworks = getAllArtworks();

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
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
            <section className="container-max pt-4 pb-12">
                <ArtworkGalleryWithSort artworks={artworks} />
            </section>
        </main>
    );
}
