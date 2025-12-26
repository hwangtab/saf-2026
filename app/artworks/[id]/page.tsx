import { getAllArtworks, getArtworkById } from '@/content/saf2026-artworks';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { EXTERNAL_LINKS } from '@/lib/constants';

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

    // Extract numeric price from string like "₩4,500,000" or "문의"
    const numericPrice = artwork.price.replace(/[₩,원\s]/g, '');
    const isInquiry = artwork.price === '문의' || isNaN(Number(numericPrice));

    // Product JSON-LD Schema for SEO
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: artwork.title,
        image: `https://www.saf2026.com/images/artworks/${artwork.image}`,
        description: artwork.description || `${artwork.artist}의 작품 "${artwork.title}"`,
        brand: {
            '@type': 'Person',
            name: artwork.artist,
        },
        offers: {
            '@type': 'Offer',
            url: `https://www.saf2026.com/artworks/${artwork.id}`,
            priceCurrency: 'KRW',
            price: isInquiry ? undefined : numericPrice,
            priceValidUntil: '2026-01-27',
            availability: 'https://schema.org/InStock',
            seller: {
                '@type': 'Organization',
                name: '한국스마트협동조합',
            },
        },
        additionalProperty: [
            {
                '@type': 'PropertyValue',
                name: '재료',
                value: artwork.material,
            },
            {
                '@type': 'PropertyValue',
                name: '크기',
                value: artwork.size,
            },
            {
                '@type': 'PropertyValue',
                name: '제작년도',
                value: artwork.year,
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
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
                                <h1 className="text-3xl md:text-4xl font-bold font-sans text-charcoal mb-2">
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

                            <div className="pt-8 space-y-6">
                                {/* 온라인 구매 버튼 */}
                                <a
                                    href={artwork.shopUrl || EXTERNAL_LINKS.ONLINE_GALLERY}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-3 w-full bg-primary hover:bg-primary/90 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl text-lg"
                                >
                                    온라인 구매
                                </a>

                                {/* 구분선 */}
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-gray-200" />
                                    <span className="text-gray-400 text-sm">또는 직접 문의</span>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                {/* 연락처 옵션 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <a
                                        href="tel:02-764-3114"
                                        className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-colors bg-white"
                                    >
                                        <span>📞</span>
                                        <span className="text-sm font-medium">02-764-3114</span>
                                    </a>
                                    <a
                                        href="mailto:contact@kosmart.org"
                                        className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-lg hover:border-primary hover:text-primary transition-colors bg-white"
                                    >
                                        <span>✉️</span>
                                        <span className="text-sm font-medium">contact@kosmart.org</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </main>
        </>
    );
}
