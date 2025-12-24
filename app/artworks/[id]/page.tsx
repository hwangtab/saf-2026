import { getAllArtworks, getArtworkById } from '@/content/saf2026-artworks';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface Props {
    params: {
        id: string;
    };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const artwork = getArtworkById(params.id);

    if (!artwork) {
        return {
            title: '작품을 찾을 수 없습니다',
        };
    }

    return {
        title: `${artwork.title} - ${artwork.artist} | 2026 씨앗페`,
        description: artwork.description.substring(0, 160),
        openGraph: {
            images: [`/images/artworks/${artwork.image}`],
        },
    };
}

// Generate static params for all artworks at build time
export async function generateStaticParams() {
    const artworks = getAllArtworks();
    return artworks.map((artwork) => ({
        id: artwork.id,
    }));
}

export default function ArtworkDetailPage({ params }: Props) {
    const artwork = getArtworkById(params.id);

    if (!artwork) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-white pb-20">
            {/* Navigation Bar */}
            <nav className="border-b sticky top-16 z-40 bg-white/90 backdrop-blur-sm">
                <div className="container-max py-4">
                    <Link
                        href="/artworks"
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors"
                    >
                        ← 목록으로 돌아가기
                    </Link>
                </div>
            </nav>

            <article className="container-max py-10 lg:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

                    {/* Image Section */}
                    <div className="relative rounded-2xl overflow-hidden bg-gray-50 shadow-sm">
                        <Image
                            src={`/images/artworks/${artwork.image}`}
                            alt={artwork.title}
                            width={1000}
                            height={1000}
                            className="w-full h-auto object-contain max-h-[80vh]"
                            priority
                        />
                    </div>

                    {/* Info Section */}
                    <div className="lg:sticky lg:top-32 space-y-8">
                        <header>
                            <h1 className="text-3xl md:text-4xl font-bold font-sans font-bold text-charcoal mb-2">
                                {artwork.title}
                            </h1>
                            <p className="text-xl text-gray-600 font-medium">
                                {artwork.artist}
                            </p>
                        </header>

                        <div className="border-t border-b border-gray-100 py-6">
                            <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 items-baseline">
                                <span className="text-gray-400 font-medium text-sm">재료</span>
                                <span className="text-charcoal">{artwork.material}</span>

                                <span className="text-gray-400 font-medium text-sm">크기</span>
                                <span className="text-charcoal">{artwork.size}</span>

                                <span className="text-gray-400 font-medium text-sm">년도</span>
                                <span className="text-charcoal">{artwork.year}</span>

                                {artwork.edition && (
                                    <>
                                        <span className="text-gray-400 font-medium text-sm">에디션</span>
                                        <span className="text-charcoal">{artwork.edition}</span>
                                    </>
                                )}

                                <span className="text-gray-400 font-medium text-sm">가격</span>
                                <span className="text-charcoal font-semibold">{artwork.price}</span>
                            </div>
                        </div>

                        {/* Artist Profile */}
                        {artwork.profile && (
                            <div className="bg-gray-50 p-6 rounded-xl space-y-2">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">About the Artist</h3>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                                    {artwork.profile}
                                </p>
                            </div>
                        )}

                        {/* Artist Note */}
                        {artwork.description && (
                            <div className="prose prose-lg text-gray-700 leading-relaxed whitespace-pre-line">
                                <h3 className="text-lg font-bold text-charcoal mb-4">Artist Note</h3>
                                {artwork.description}
                            </div>
                        )}

                        <div className="pt-8">
                            <a
                                href="mailto:contact@kosmart.org?subject=작품 구매 문의"
                                className="inline-block bg-primary hover:bg-light text-white hover:text-primary border border-transparent hover:border-primary font-bold px-8 py-3 rounded-lg transition-colors"
                            >
                                작품 구매 문의하기
                            </a>
                        </div>
                    </div>
                </div>
            </article>
        </main>
    );
}
