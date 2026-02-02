import type { Metadata } from 'next';
import {
  SITE_URL,
  BREADCRUMB_HOME,
  BREADCRUMBS,
  CAMPAIGN,
  EXHIBITION,
  CONTACT,
  SOCIAL_LINKS,
  OG_IMAGE,
} from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { formatArtistName } from '@/lib/utils';
import { Artwork, BreadcrumbItem } from '@/types';
import { exhibitionReviews, Review } from '@/content/reviews';

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
      '원화 구매',
      '미술품 투자',
      '신진작가 원화',
      '현대미술 컬렉션',
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
    `${formatArtistName(artwork.artist)}의 ${artwork.title}`,
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
        price: parseFloat(numericPrice) || 0,
        priceValidUntil: CAMPAIGN.END_DATE,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        seller: sellerOrg,
      };

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    name: artwork.title,
    inLanguage: 'ko',
    artform: artwork.material?.toLowerCase().includes('canvas') ? 'Painting' : 'Visual Artwork',
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
    size: artwork.size
      ? {
          '@type': 'QuantitativeValue',
          name: artwork.size,
          description: `작품 크기: ${artwork.size}`,
        }
      : undefined,
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

export function generateExhibitionSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: '씨앗페 2026 (Seed Art Festival 2026)',
    description:
      '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 50여 명의 작가가 참여한 회화, 조각, 사진 등 다양한 예술 작품을 만나보세요.',
    url: SITE_URL,
    image: [OG_IMAGE.url],
    startDate: '2026-01-14T10:00:00+09:00',
    endDate: '2026-01-26T19:00:00+09:00',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: EXHIBITION.LOCATION,
      address: {
        '@type': 'PostalAddress',
        streetAddress: EXHIBITION.ADDRESS,
        addressLocality: '서울시',
        addressCountry: 'KR',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: EXHIBITION.LAT,
        longitude: EXHIBITION.LNG,
      },
    },
    organizer: {
      '@type': 'Organization',
      name: CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
      url: SITE_URL,
    },
    performer: {
      '@type': 'Organization',
      name: '참여 예술가 50여 명',
    },
    isAccessibleForFree: true,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: exhibitionReviews.length.toString(),
      bestRating: '5',
      worstRating: '1',
    },
    review: exhibitionReviews.map((rev: Review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: rev.author,
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rev.rating.toString(),
      },
      reviewBody: rev.comment,
      datePublished: rev.date,
    })),
  };
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: CONTACT.ORGANIZATION_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/og-image2.png`,
    description: '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
    sameAs: [
      SOCIAL_LINKS.INSTAGRAM,
      SOCIAL_LINKS.FACEBOOK,
      SOCIAL_LINKS.TWITTER,
      SOCIAL_LINKS.YOUTUBE,
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.ADDRESS,
      addressLocality: '서울시',
      addressCountry: 'KR',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      telephone: CONTACT.PHONE,
      email: CONTACT.EMAIL,
    },
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '씨앗페 2026',
    alternateName: 'SAF 2026',
    url: SITE_URL,
    description: '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
    inLanguage: 'ko-KR',
    publisher: {
      '@type': 'Organization',
      name: CONTACT.ORGANIZATION_NAME,
    },
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export interface VideoSchemaInput {
  title: string;
  description: string;
  youtubeId: string;
  uploadDate?: string;
  transcript?: string;
}

export function generateVideoSchema(video: VideoSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: video.description,
    thumbnailUrl: `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`,
    uploadDate: video.uploadDate || '2023-03-26',
    contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
    transcript: video.transcript,
    publisher: {
      '@type': 'Organization',
      name: '한국스마트협동조합',
      url: SITE_URL,
    },
  };
}

export interface NewsArticleSchemaInput {
  title: string;
  description: string;
  datePublished: string;
  image: string; // URL string
  url: string;
  publisherName: string;
}

export function generateNewsArticleSchema(article: NewsArticleSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description,
    image: [article.image],
    datePublished: article.datePublished,
    author: [
      {
        '@type': 'Organization',
        name: article.publisherName,
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: article.publisherName, // Using the source as publisher for consistency with existing logic
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };
}

export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ArtGallery',
    name: '씨앗페 2026 (Seed Art Festival)',
    image: OG_IMAGE.url,
    '@id': SITE_URL,
    url: SITE_URL,
    telephone: CONTACT.PHONE,
    email: CONTACT.EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: EXHIBITION.ADDRESS,
      addressLocality: '서울시',
      addressCountry: 'KR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: EXHIBITION.LAT,
      longitude: EXHIBITION.LNG,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '10:00',
        closes: '19:00',
        validFrom: CAMPAIGN.START_DATE,
        validThrough: CAMPAIGN.END_DATE,
      },
    ],
    priceRange: 'KRW',
  };
}

export interface ArtistSchemaInput {
  name: string;
  description?: string;
  image?: string;
  url: string;
  jobTitle?: string;
}

export function generateArtistSchema(artist: ArtistSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    description: artist.description,
    image: artist.image,
    url: artist.url,
    jobTitle: artist.jobTitle || 'Artist',
    sameAs: [artist.url], // Can be expanded if artist has social links
    mainEntityOfPage: {
      '@type': 'ProfilePage',
      '@id': artist.url,
    },
  };
}
