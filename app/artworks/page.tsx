import { getAllArtworks } from '@/content/saf2026-artworks';
import MasonryGallery from '@/components/features/MasonryGallery';
import PageHero from '@/components/ui/PageHero';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '출품작 (Artworks) - 2026 씨앗페',
    description: '2026 Seed Art Festival에 출품된 100여점의 아름다운 예술 작품들을 만나보세요.',
};

export default function ArtworksPage() {
    const artworks = getAllArtworks();

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            <PageHero
                title="출품작"
                description="예술가들의 시선으로 바라본 우리의 현실과 희망. 2026 씨앗페와 함께하는 작품을 소개합니다."
            />

            {/* Gallery Section */}
            <section className="container-max py-12">
                <MasonryGallery artworks={artworks} />
            </section>
        </main>
    );
}
