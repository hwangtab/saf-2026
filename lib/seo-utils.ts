import type { Metadata } from 'next';
import { SITE_URL, createBreadcrumbSchema, BREADCRUMB_HOME, BREADCRUMBS } from '@/lib/constants';
import { Artwork } from '@/types';

export function generateArtworkMetadata(artwork: Artwork): Metadata {
  const pageUrl = `${SITE_URL}/artworks/${artwork.id}`;
  const imageUrl = `${SITE_URL}/images/artworks/${artwork.image}`;

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

  const seoDescription =
    `${summary}. ` +
    (descSnippet ? `작품 설명: ${descSnippet}... ` : '') +
    (profileSnippet ? `작가 소개: ${profileSnippet}...` : '');

  return {
    title: `${artwork.title} - ${artwork.artist} | 씨앗페 2026`,
    description: seoDescription.substring(0, 300),
    keywords: [
      artwork.artist,
      artwork.title,
      '씨앗페',
      '씨앗페 2026',
      'SAF 2026',
      '예술인 연대',
      '미술품 구매',
      '상호부조',
      artwork.material?.split(' ')?.[0] ?? '미술품',
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

export function generateArtworkJsonLd(artwork: Artwork, numericPrice: string, isInquiry: boolean) {
  const schemaDescription =
    artwork.description || artwork.profile || `${artwork.artist}의 작품 "${artwork.title}"`;

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

  const breadcrumbSchema = createBreadcrumbSchema([
    BREADCRUMB_HOME,
    BREADCRUMBS['/artworks'],
    { name: artwork.title, url: `${SITE_URL}/artworks/${artwork.id}` },
  ]);

  return {
    productSchema,
    breadcrumbSchema,
  };
}
