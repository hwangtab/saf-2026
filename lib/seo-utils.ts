import type { Metadata } from 'next';
import { SITE_URL, BREADCRUMB_HOME, BREADCRUMBS, CAMPAIGN, EXHIBITION } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { Artwork, BreadcrumbItem } from '@/types';

// JSON-LD Security: Escape < characters to prevent XSS
export function escapeJsonLdForScript(json: string): string {
  return json.replace(/</g, '\\u003c');
}

export function createBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateArtworkMetadata(artwork: Artwork): Metadata {
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

  const baseMetadata = createPageMetadata(
    `${artwork.title} - ${artwork.artist}`,
    seoDescription.substring(0, 300),
    `/artworks/${artwork.id}`,
    imageUrl
  );

  return {
    ...baseMetadata,
    keywords: [
      artwork.artist,
      artwork.title,
      '씨앗페',
      '씨앗페 2026',
      'SAF 2026',
      '예술인 연대',
      '미술품 구매',
      '상호부조',
      '예술인 상호부조',
      '인사아트센터',
      artwork.material?.split(' ')?.[0] ?? '미술품',
      artwork.year ? `${artwork.year}년 작품` : null,
    ].filter(Boolean) as string[],
    openGraph: {
      ...baseMetadata.openGraph,
      type: 'website',
      locale: 'ko_KR',
      siteName: '씨앗페 2026',
    },
    twitter: {
      ...baseMetadata.twitter,
      card: 'summary_large_image',
    },
  };
}

export function generateArtworkJsonLd(artwork: Artwork, numericPrice: string, isInquiry: boolean) {
  const schemaDescription =
    artwork.description || artwork.profile || `${artwork.artist}의 작품 "${artwork.title}"`;

  // Build alternateName for image SEO
  const imageAlternateName = [
    `${artwork.artist} 작가의 ${artwork.title}`,
    artwork.year,
    artwork.material,
  ]
    .filter(Boolean)
    .join(', ');

  // Seller organization (reused in offers)
  const sellerOrg = {
    '@type': 'Organization',
    name: '한국스마트협동조합',
    url: 'https://www.saf2026.com',
  };

  // Build offers based on whether price is inquiry or numeric
  const offers = isInquiry
    ? {
        '@type': 'Offer',
        url: `${SITE_URL}/artworks/${artwork.id}`,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'PriceSpecification',
          valueAddedTaxIncluded: true,
        },
        seller: sellerOrg,
      }
    : {
        '@type': 'Offer',
        url: `${SITE_URL}/artworks/${artwork.id}`,
        priceCurrency: 'KRW',
        price: numericPrice,
        priceValidUntil: CAMPAIGN.END_DATE,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        seller: sellerOrg,
      };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    name: artwork.title,
    inLanguage: 'ko',
    image: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/images/artworks/${artwork.image}`,
      name: `${artwork.title} - ${artwork.artist}`,
      alternateName: imageAlternateName,
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
    offers,
    isPartOf: {
      '@type': 'ExhibitionEvent',
      name: '씨앗페 2026 - 예술인 상호부조 기금 마련 특별전',
      startDate: CAMPAIGN.START_DATE,
      endDate: CAMPAIGN.END_DATE,
      location: {
        '@type': 'Place',
        name: EXHIBITION.LOCATION,
        address: EXHIBITION.ADDRESS,
      },
      organizer: sellerOrg,
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
