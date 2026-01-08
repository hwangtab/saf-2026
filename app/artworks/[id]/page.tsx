import { getAllArtworks, getArtworkById } from '@/content/saf2026-artworks';
import Section from '@/components/ui/Section';
import { getArticlesByArtist } from '@/content/artist-articles';
import ArtworkImage from '@/components/features/ArtworkImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { SITE_URL, createBreadcrumbSchema, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import RelatedArticles from '@/components/features/RelatedArticles';
import ExpandableHistory from '@/components/features/ExpandableHistory';

// Dynamic import for client-side ShareButtons
const ShareButtons = dynamic(() => import('@/components/common/ShareButtons'), { ssr: false });

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

  // 1. Create a rich, fact-filled description for AI
  const summary = [
    `작가: ${artwork.artist}`,
    `작품명: ${artwork.title}`,
    artwork.year ? `제작년도: ${artwork.year}` : '',
    artwork.material ? `재료: ${artwork.material}` : '',
    artwork.size ? `크기: ${artwork.size}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const profileSnippet = artwork.profile ? artwork.profile.substring(0, 150) : '';
  const descSnippet = artwork.description ? artwork.description.substring(0, 150) : '';

  // Priority: Custom Description > Profile > Summary
  const seoDescription =
    `${summary}. ` +
    (descSnippet ? `작품 설명: ${descSnippet}... ` : '') +
    (profileSnippet ? `작가 소개: ${profileSnippet}...` : '');

  return {
    title: `${artwork.title} - ${artwork.artist} | 씨앗페 2026`,
    description: seoDescription.substring(0, 300), // Max for SEO
    keywords: [
      artwork.artist,
      artwork.title,
      '씨앗페',
      '씨앗페 2026',
      'SAF 2026',
      '예술인 연대',
      '미술품 구매',
      '상호부조',
      artwork.material?.split(' ')?.[0] ?? '미술품', // Main material e.g., 'Oil', 'Acrylic'
    ].filter(Boolean),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${artwork.title} - ${artwork.artist}`,
      description: seoDescription.substring(0, 200),
      url: pageUrl,
      siteName: '씨앗페 2026',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${artwork.title} by ${artwork.artist}`,
        },
      ],
      type: 'website',
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artwork.title} - ${artwork.artist}`,
      description: seoDescription.substring(0, 200),
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
  const schemaDescription =
    artwork.description || artwork.profile || `${artwork.artist}의 작품 "${artwork.title}"`;

  // Get related articles for this artist
  const relatedArticles = getArticlesByArtist(artwork.artist);

  // Enhanced VisualArtwork + Product Schema for AI & Search Engines
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    name: artwork.title,
    image: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/images/artworks/${artwork.image}`,
      name: `${artwork.title} - ${artwork.artist}`,
    },
    description: schemaDescription.substring(0, 500),
    sku: `SAF2026-${artwork.id}`,
    creator: {
      '@type': 'Person',
      name: artwork.artist,
      description: artwork.profile || undefined,
    },
    artMedium: artwork.material || undefined,
    artworkSurface: artwork.material || undefined,
    dateCreated: artwork.year || undefined,
    width: artwork.size ? { '@type': 'Distance', name: artwork.size } : undefined,
    height: artwork.size ? { '@type': 'Distance', name: artwork.size } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/artworks/${artwork.id}`,
      priceCurrency: 'KRW',
      price: isInquiry ? undefined : numericPrice,
      priceValidUntil: '2026-12-31',
      availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: '한국스마트협동조합',
        url: 'https://www.saf2026.com',
      },
    },
    additionalProperty: [
      artwork.material && {
        '@type': 'PropertyValue',
        name: '재료',
        value: artwork.material,
      },
      artwork.size && {
        '@type': 'PropertyValue',
        name: '크기',
        value: artwork.size,
      },
      artwork.year && {
        '@type': 'PropertyValue',
        name: '제작년도',
        value: artwork.year,
      },
      artwork.edition && {
        '@type': 'PropertyValue',
        name: '에디션',
        value: artwork.edition,
      },
      artwork.history && {
        '@type': 'PropertyValue',
        name: '작가이력',
        value: artwork.history?.substring(0, 200),
      },
    ].filter(Boolean),
  };

  // Safely stringify JSON-LD to prevent XSS (escape < as \u003c)
  const safeJsonLd = JSON.stringify(productSchema).replace(/</g, '\\u003c');

  // BreadcrumbList Schema
  const breadcrumbSchema = createBreadcrumbSchema([
    BREADCRUMB_HOME,
    BREADCRUMBS['/artworks'],
    { name: artwork.title, url: `${SITE_URL}/artworks/${artwork.id}` },
  ]);
  const safeBreadcrumbJsonLd = JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeBreadcrumbJsonLd }}
      />
      <Section
        variant="white"
        prevVariant="canvas-soft"
        padding="none"
        className="min-h-screen pb-20 pt-[calc(4rem+env(safe-area-inset-top,0px))]"
      >
        {/* Navigation Bar */}
        <nav className="border-b sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/50">
          <div className="container-max py-4">
            <Link
              href="/artworks"
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors"
            >
              ← 목록으로 돌아가기
            </Link>
          </div>
        </nav>

        <article className="container-max pt-10 lg:pt-16 pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left Column: Image & CTA */}
            <div className="space-y-8">
              <ArtworkImage
                imagePath={artwork.image}
                title={artwork.title}
                artist={artwork.artist}
                sold={artwork.sold}
              />

              {/* Share Section */}
              <div className="flex items-center justify-center gap-2 py-4 border-y border-gray-100">
                <span className="text-sm text-gray-500 mr-2">공유하기</span>
                <ShareButtons
                  url={`${SITE_URL}/artworks/${artwork.id}`}
                  title={`${artwork.title} - ${artwork.artist} | 씨앗페 2026 출품작`}
                  description={`${artwork.artist}의 작품 "${artwork.title}"을 감상하고 예술인을 응원하세요.`}
                />
              </div>

              {/* CTA Section - Moved here for better visibility */}
              <div className="pt-4 space-y-6">
                {/* 온라인 구매 버튼 - 가격이 있고, shopUrl이 있고, 판매되지 않은 경우에만 표시 */}
                {artwork.price && artwork.price !== '문의' && artwork.shopUrl && !artwork.sold && (
                  <>
                    <Button
                      href={artwork.shopUrl}
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
                  <Button href="tel:02-764-3114" variant="white" className="gap-2 group">
                    <span className="grayscale group-hover:grayscale-0 transition-all">📞</span>
                    <span className="text-sm font-medium">02-764-3114</span>
                  </Button>
                  <Button href="mailto:contact@kosmart.org" variant="white" className="gap-2 group">
                    <span className="grayscale group-hover:grayscale-0 transition-all">✉️</span>
                    <span className="text-sm font-medium">이메일 문의</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Info Section */}
            <div className="space-y-8">
              <header className="mb-6 border-b border-gray-100 pb-6 lg:border-none lg:pb-0 lg:mb-0">
                <h1 className="text-3xl md:text-4xl font-bold font-sans text-charcoal mb-2 break-keep">
                  {artwork.title}
                </h1>
                <p className="text-xl text-gray-600 font-medium">{artwork.artist}</p>
              </header>

              <div className="border-t border-b border-gray-100 py-6">
                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 items-baseline">
                  {/* 재료 */}
                  {artwork.material && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">재료</span>
                      <span className="text-charcoal">{artwork.material}</span>
                    </>
                  )}

                  {/* 크기 */}
                  {artwork.size && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">크기</span>
                      <span className="text-charcoal">{artwork.size}</span>
                    </>
                  )}

                  {/* 년도 */}
                  {artwork.year && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">년도</span>
                      <span className="text-charcoal">{artwork.year}</span>
                    </>
                  )}

                  {/* 에디션 */}
                  {artwork.edition && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">에디션</span>
                      <span className="text-charcoal">{artwork.edition}</span>
                    </>
                  )}

                  {/* 가격 */}
                  {artwork.price && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">가격</span>
                      <span className="text-charcoal font-semibold">{artwork.price}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Artist Profile (profile only, no history) */}
              {artwork.profile && (
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    작가 소개
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                    {artwork.profile}
                  </p>
                </div>
              )}

              {/* Artist Note */}
              {artwork.description && (
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    작가 노트
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                    {artwork.description}
                  </p>
                </div>
              )}

              {/* Artist History - separate card, below artist note */}
              {artwork.history && <ExpandableHistory history={artwork.history} />}

              {/* Related Articles */}
              <RelatedArticles articles={relatedArticles} />
            </div>
          </div>
        </article>
      </Section>
    </>
  );
}
