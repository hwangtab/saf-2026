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
  MERCHANT_POLICIES,
} from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { formatArtistName, resolveArtworkImageUrl } from '@/lib/utils';
import { getArtformForSchema, getMediumKeywords, classifyArtworkMedium } from '@/lib/art-taxonomy';
import { Artwork, BreadcrumbItem, ExhibitionReview } from '@/types';

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
  const resolvedImageUrl = resolveArtworkImageUrl(artwork.images[0]);
  const imageUrl = resolvedImageUrl.startsWith('http')
    ? resolvedImageUrl
    : `${SITE_URL}${resolvedImageUrl}`;

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

  // Get medium-specific keywords for better categorization
  const mediumKeywords = getMediumKeywords(artwork.material || '');

  return {
    ...baseMetadata,
    keywords: [
      artwork.artist,
      artwork.title,
      ...mediumKeywords,
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
  const resolvedImageUrl = resolveArtworkImageUrl(artwork.images[0]);
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
    url: SITE_URL,
  };

  // Offer URL: prefer shopUrl for direct purchase link
  const offerUrl = artwork.shopUrl || `${SITE_URL}/artworks/${artwork.id}`;

  // Merchant return policy for e-commerce SEO
  const returnPolicy = {
    '@type': 'MerchantReturnPolicy',
    '@id': `${SITE_URL}#return-policy`,
    applicableCountry: MERCHANT_POLICIES.RETURN.applicableCountry,
    returnPolicyCategory: MERCHANT_POLICIES.RETURN.returnPolicyCategory,
    merchantReturnDays: MERCHANT_POLICIES.RETURN.merchantReturnDays,
    returnMethod: MERCHANT_POLICIES.RETURN.returnMethod,
    returnFees: MERCHANT_POLICIES.RETURN.returnFees,
  };

  // Shipping details for e-commerce SEO
  const shippingDetails = {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: MERCHANT_POLICIES.SHIPPING.rate.toString(),
      currency: MERCHANT_POLICIES.SHIPPING.currency,
    },
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: MERCHANT_POLICIES.SHIPPING.country,
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: MERCHANT_POLICIES.SHIPPING.handlingDays.min,
        maxValue: MERCHANT_POLICIES.SHIPPING.handlingDays.max,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: MERCHANT_POLICIES.SHIPPING.transitDays.min,
        maxValue: MERCHANT_POLICIES.SHIPPING.transitDays.max,
        unitCode: 'DAY',
      },
    },
  };

  // Build offers based on whether price is inquiry or numeric
  const offers = isInquiry
    ? {
        '@type': 'Offer',
        url: offerUrl,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'PriceSpecification',
          valueAddedTaxIncluded: true,
        },
        seller: sellerOrg,
        hasMerchantReturnPolicy: returnPolicy,
        shippingDetails,
      }
    : {
        '@type': 'Offer',
        url: offerUrl,
        priceCurrency: 'KRW',
        price: parseFloat(numericPrice) || 0,
        priceValidUntil: CAMPAIGN.END_DATE,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        seller: sellerOrg,
        hasMerchantReturnPolicy: returnPolicy,
        shippingDetails,
      };

  // Classify artwork medium for better SEO categorization
  const mediumCategory = classifyArtworkMedium(artwork.material || '');

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    name: artwork.title,
    inLanguage: 'ko',
    artform: getArtformForSchema(artwork.material || ''),
    // Category for faceted navigation SEO
    ...(mediumCategory && {
      category: {
        '@type': 'Thing',
        '@id': `${SITE_URL}/artworks?medium=${mediumCategory.id}`,
        name: mediumCategory.name,
        alternateName: mediumCategory.nameEn,
      },
    }),
    image: {
      '@type': 'ImageObject',
      url: resolvedImageUrl.startsWith('http')
        ? resolvedImageUrl
        : `${SITE_URL}${resolvedImageUrl}`,
      name: `${artwork.title} - ${artwork.artist}`,
      alternateName: imageAlternateName,
    },
    description: schemaDescription.substring(0, 500),
    sku: `SAF2026-${artwork.id}`,
    mpn: `SAF2026-ART-${artwork.id}`,
    brand: {
      '@type': 'Brand',
      name: '씨앗페 2026',
      url: SITE_URL,
    },
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
    potentialAction: [
      {
        '@type': 'BuyAction',
        target: offerUrl,
        name: '작품 구매하기',
      },
      {
        '@type': 'DonateAction',
        name: '예술인 상호부조 기금 후원',
        description: '이 작품 구매 수익금의 일부가 예술인 상호부조 기금으로 사용됩니다',
        recipient: {
          '@type': 'Organization',
          name: '한국스마트협동조합',
          description: '예술인 상호부조 기금 운영 단체',
          url: SITE_URL,
        },
      },
    ],
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

export function generateExhibitionSchema(reviews: ExhibitionReview[] = []) {
  const hasReviews = reviews.length > 0;
  const startDate = '2026-01-14T10:00:00+09:00';
  const endDate = '2026-01-26T19:00:00+09:00';
  const now = Date.now();
  const startTimestamp = Date.parse(startDate);
  const endTimestamp = Date.parse(endDate);
  const eventStatus =
    now > endTimestamp
      ? 'https://schema.org/EventCompleted'
      : now >= startTimestamp
        ? 'https://schema.org/EventInProgress'
        : 'https://schema.org/EventScheduled';

  return {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: '씨앗페 2026 (Seed Art Festival 2026)',
    description:
      '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 50여 명의 작가가 참여한 회화, 조각, 사진 등 다양한 예술 작품을 만나보세요.',
    url: SITE_URL,
    image: [OG_IMAGE.url],
    startDate,
    endDate,
    eventStatus,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: EXHIBITION.LOCATION,
      address: {
        '@type': 'PostalAddress',
        streetAddress: EXHIBITION.ADDRESS,
        postalCode: EXHIBITION.POSTAL_CODE,
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
    ...(hasReviews && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: reviews.length.toString(),
        bestRating: '5',
        worstRating: '1',
      },
      review: reviews.map((rev) => ({
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
    }),
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
      postalCode: CONTACT.POSTAL_CODE,
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
      {
        '@type': 'Organization',
        name: CONTACT.ORGANIZATION_NAME,
        url: SITE_URL,
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: article.publisherName,
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'article h3', 'article p'],
    },
  };
}

export function generateSpeakableSchema(cssSelectors: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    cssSelector: cssSelectors,
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
      postalCode: EXHIBITION.POSTAL_CODE,
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

// Enhanced artist schema input for SEO optimization
export interface EnhancedArtistSchemaInput extends ArtistSchemaInput {
  history?: string;
  artworks?: Array<{ id: string; title: string; image: string }>;
}

// Helper: Extract expertise topics from artist history/profile
function extractKnowsAbout(history?: string, profile?: string): string[] {
  const text = `${history || ''} ${profile || ''}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string> = {
    유화: 'Oil Painting',
    oil: 'Oil Painting',
    아크릴: 'Acrylic Painting',
    acrylic: 'Acrylic Painting',
    목판화: 'Woodcut Printmaking',
    판화: 'Printmaking',
    사진: 'Photography',
    조각: 'Sculpture',
    설치: 'Installation Art',
    미디어: 'Media Art',
    수채화: 'Watercolor',
    동양화: 'East Asian Painting',
    서양화: 'Western Painting',
    옻칠: 'Lacquer Art',
    도자: 'Ceramics',
    캘리그래피: 'Calligraphy',
  };

  Object.entries(topicMap).forEach(([korean, english]) => {
    if (text.includes(korean)) {
      topics.push(english);
    }
  });

  return [...new Set(topics)].slice(0, 5);
}

// Helper: Extract credentials (education, awards) from artist history
interface Credential {
  type: 'degree' | 'award';
  name: string;
  institution?: string;
}

function parseArtistCredentials(history?: string): Credential[] {
  if (!history) return [];
  const credentials: Credential[] = [];

  // Parse education lines
  const eduPatterns = [
    /(.+대학교?.+(?:졸업|석사|박사|수료))/g,
    /(.+대학원.+(?:졸업|석사|박사|수료))/g,
  ];

  eduPatterns.forEach((pattern) => {
    const matches = history.matchAll(pattern);
    for (const match of matches) {
      const line = match[1].trim();
      if (line.length < 100) {
        credentials.push({
          type: 'degree',
          name: line,
          institution: line.match(/(.+대학)/)?.[1],
        });
      }
    }
  });

  // Parse awards
  const awardPatterns = [/(.+(?:상|대상|우수상|특선|입선).+)/g, /(.+수상.+)/g];

  awardPatterns.forEach((pattern) => {
    const matches = history.matchAll(pattern);
    for (const match of matches) {
      const line = match[1].trim();
      if (line.length < 100 && !credentials.some((c) => c.name === line)) {
        credentials.push({
          type: 'award',
          name: line,
        });
      }
    }
  });

  return credentials.slice(0, 8);
}

// Helper: Extract memberships/associations from artist history
function extractMemberships(history?: string): Array<{ '@type': string; name: string }> {
  if (!history) return [];
  const memberships: Array<{ '@type': string; name: string }> = [];

  const patterns = [/한국(\w+)(?:협회|회)/g, /(\w+)협회 회원/g, /(\w+)작가회/g];

  patterns.forEach((pattern) => {
    const matches = history.matchAll(pattern);
    for (const match of matches) {
      const name = match[0].replace(' 회원', '').trim();
      if (name.length < 30 && !memberships.some((m) => m.name === name)) {
        memberships.push({
          '@type': 'Organization',
          name,
        });
      }
    }
  });

  return memberships.slice(0, 5);
}

/**
 * Generate enhanced artist schema with credentials, expertise, and work samples
 */
export function generateEnhancedArtistSchema(artist: EnhancedArtistSchemaInput) {
  const knowsAbout = extractKnowsAbout(artist.history, artist.description);
  const credentials = parseArtistCredentials(artist.history);
  const memberships = extractMemberships(artist.history);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    description: artist.description,
    image: artist.image,
    url: artist.url,
    jobTitle: artist.jobTitle || 'Visual Artist',
    sameAs: [artist.url],
    mainEntityOfPage: {
      '@type': 'ProfilePage',
      '@id': artist.url,
    },
    // Expertise areas
    ...(knowsAbout.length > 0 && { knowsAbout }),
    // Education and awards
    ...(credentials.length > 0 && {
      hasCredential: credentials.map((cred) => ({
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: cred.type === 'degree' ? 'degree' : 'award',
        name: cred.name,
        ...(cred.institution && {
          recognizedBy: {
            '@type': 'Organization',
            name: cred.institution,
          },
        }),
      })),
    }),
    // Organization memberships
    ...(memberships.length > 0 && { memberOf: memberships }),
    // Work samples (representative artworks)
    ...(artist.artworks &&
      artist.artworks.length > 0 && {
        workSample: artist.artworks.slice(0, 5).map((work) => ({
          '@type': 'VisualArtwork',
          name: work.title,
          url: `${SITE_URL}/artworks/${work.id}`,
          image: work.image.startsWith('http')
            ? work.image
            : `${SITE_URL}/images/artworks/${work.image}`,
        })),
      }),
  };
}

// Helper: Parse price string to number
function parseArtworkPrice(price: string): number | null {
  if (!price || price === '문의' || price.includes('문의')) return null;
  const numericStr = price.replace(/[^\d]/g, '');
  const num = parseInt(numericStr, 10);
  return isNaN(num) ? null : num;
}

/**
 * Generate aggregate offer schema for gallery price range
 */
export function generateGalleryAggregateOffer(artworks: Artwork[]) {
  const prices = artworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p > 0);

  if (prices.length === 0) return null;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const availableCount = artworks.filter((a) => !a.sold).length;

  return {
    '@type': 'AggregateOffer',
    lowPrice: minPrice,
    highPrice: maxPrice,
    priceCurrency: 'KRW',
    offerCount: artworks.length,
    availability: availableCount > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
  };
}

export function generateArtworkListSchema(artworks: Artwork[]) {
  const aggregateOffer = generateGalleryAggregateOffer(artworks);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '씨앗페 2026 출품작',
    description: '씨앗페 2026에 출품된 예술가들의 작품 목록',
    numberOfItems: artworks.length,
    // Price range for art buyers
    ...(aggregateOffer && { offers: aggregateOffer }),
    itemListElement: artworks.map((artwork, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/artworks/${artwork.id}`,
      name: artwork.title,
      image: resolveArtworkImageUrl(artwork.images[0]).startsWith('http')
        ? resolveArtworkImageUrl(artwork.images[0])
        : `${SITE_URL}${resolveArtworkImageUrl(artwork.images[0])}`,
    })),
  };
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

/**
 * Generate campaign/funding scheme schema for SEO
 * Exposes the mutual aid fund mission to search engines
 */
export function generateCampaignSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FundingScheme',
    '@id': `${SITE_URL}#campaign`,
    name: '예술인 상호부조 기금 마련 캠페인',
    alternateName: 'SAF 2026 Artist Mutual Aid Fund',
    description:
      '한국 예술인들의 고리대금 문제 해결을 위한 상호부조 기금 마련 특별 캠페인. 작품 구매를 통해 예술인들의 금융 자립을 지원합니다.',
    url: SITE_URL,
    funder: {
      '@type': 'Organization',
      name: CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    duration: `${CAMPAIGN.START_DATE}/${CAMPAIGN.END_DATE}`,
    isAccessibleForFree: false,
    audience: {
      '@type': 'Audience',
      audienceType: '미술 컬렉터, 예술 후원자',
    },
  };
}
