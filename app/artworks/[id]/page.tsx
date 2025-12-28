import { getAllArtworks, getArtworkById } from '@/content/saf2026-artworks';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import Button from '@/components/ui/Button';

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

    const pageUrl = `${SITE_URL}/artworks/${artwork.id}`;
    const imageUrl = `${SITE_URL}/images/artworks/${artwork.image}`;

    // Create description from available data
    const description = artwork.description
        ? artwork.description.substring(0, 155) + '...'
        : artwork.profile
            ? `${artwork.artist} 작가: ${artwork.profile.substring(0, 100)}...`
            : `${artwork.artist}의 작품 "${artwork.title}" - ${artwork.material}, ${artwork.size}. 씨앗페 2026 출품작.`;

    return {
        title: `${artwork.title} - ${artwork.artist} | 씨앗페 2026 출품작`,
        description,
        alternates: {
            canonical: pageUrl,
        },
        openGraph: {
            title: `${artwork.title} - ${artwork.artist}`,
            description,
            url: pageUrl,
            siteName: '씨앗페 2026',
            images: [
                {
                    url: imageUrl,
                    width: 800,
                    height: 800,
                    alt: `${artwork.artist} - ${artwork.title}`,
                },
            ],
            type: 'website',
            locale: 'ko_KR',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${artwork.title} - ${artwork.artist}`,
            description,
            images: [imageUrl],
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

    // Create rich description for schema
    const schemaDescription = artwork.description
        || artwork.profile
        || `${artwork.artist}의 작품 "${artwork.title}"`;

    // Product + VisualArtwork JSON-LD Schema for SEO
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': ['Product', 'VisualArtwork'],
        name: artwork.title,
        image: `${SITE_URL}/images/artworks/${artwork.image}`,
        description: schemaDescription.substring(0, 300),
        creator: {
            '@type': 'Person',
            name: artwork.artist,
            description: artwork.profile || undefined,
        },
        artMedium: artwork.material !== '확인 중' ? artwork.material : undefined,
        artworkSurface: artwork.material !== '확인 중' ? artwork.material : undefined,
        dateCreated: artwork.year !== '확인 중' ? artwork.year : undefined,
        width: artwork.size !== '확인 중' ? artwork.size : undefined,
        offers: {
            '@type': 'Offer',
            url: `${SITE_URL}/artworks/${artwork.id}`,
            priceCurrency: 'KRW',
            price: isInquiry ? undefined : numericPrice,
            priceValidUntil: '2026-01-27',
            availability: 'https://schema.org/InStock',
            seller: {
                '@type': 'Organization',
                name: '한국스마트협동조합',
                url: 'https://www.saf2026.com',
            },
        },
        additionalProperty: [
            artwork.material !== '확인 중' && {
                '@type': 'PropertyValue',
                name: '재료',
                value: artwork.material,
            },
            artwork.size !== '확인 중' && {
                '@type': 'PropertyValue',
                name: '크기',
                value: artwork.size,
            },
            artwork.year !== '확인 중' && {
                '@type': 'PropertyValue',
                name: '제작년도',
                value: artwork.year,
            },
            artwork.edition && {
                '@type': 'PropertyValue',
                name: '에디션',
                value: artwork.edition,
            },
        ].filter(Boolean),
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

                        {/* Left Column: Image & CTA */}
                        <div className="space-y-8">
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

                            {/* CTA Section - Moved here for better visibility */}
                            <div className="pt-4 space-y-6">
                                {/* 온라인 구매 버튼 - 가격이 있는 경우에만 표시 */}
                                {artwork.price && artwork.price !== '문의' && (
                                    <>
                                        <Button
                                            href={artwork.shopUrl || EXTERNAL_LINKS.ONLINE_GALLERY}
                                            variant="primary"
                                            size="lg"
                                            external
                                            className="w-full text-lg gap-3 rounded-xl"
                                        >
                                            온라인 구매
                                        </Button>

                                        {/* 구분선 */}
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-px bg-gray-200" />
                                            <span className="text-gray-400 text-sm">또는 직접 문의</span>
                                            <div className="flex-1 h-px bg-gray-200" />
                                        </div>
                                    </>
                                )}

                                {/* 연락처 옵션 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        href="tel:02-764-3114"
                                        variant="white"
                                        className="gap-2 group"
                                    >
                                        <span className="grayscale group-hover:grayscale-0 transition-all">📞</span>
                                        <span className="text-sm font-medium">02-764-3114</span>
                                    </Button>
                                    <Button
                                        href="mailto:contact@kosmart.org"
                                        variant="white"
                                        className="gap-2 group"
                                    >
                                        <span className="grayscale group-hover:grayscale-0 transition-all">✉️</span>
                                        <span className="text-sm font-medium">이메일 문의</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Info Section */}
                        <div className="space-y-8">
                            <header className="sticky top-24 bg-white/95 backdrop-blur-sm z-30 py-4 -mt-4 mb-4 border-b lg:border-none lg:static lg:bg-transparent lg:p-0 lg:m-0">
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
                            {(artwork.profile || artwork.history) && (
                                <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">작가 소개</h3>
                                    {artwork.profile && (
                                        <div>
                                            <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                                                {artwork.profile}
                                            </p>
                                        </div>
                                    )}
                                    {artwork.history && (
                                        <div className="pt-4 border-t border-gray-200 mt-4">
                                            <h4 className="text-xs font-semibold text-gray-500 mb-2">주요 경력</h4>
                                            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
                                                {artwork.history}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Artist Note */}
                            {artwork.description && (
                                <div className="bg-white border border-gray-100 p-6 rounded-xl">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">작가 노트</h3>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                        {artwork.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </article>
            </main>
        </>
    );
}
