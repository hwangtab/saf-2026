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
import { formatArtistName, resolveOptimizedArtworkImageUrl } from '@/lib/utils';
import { getArtformForSchema, getMediumKeywords, classifyArtworkMedium } from '@/lib/art-taxonomy';
import { Artwork, BreadcrumbItem, ExhibitionReview } from '@/types';

function resolveSeoArtworkImageUrl(image: string): string {
  return resolveOptimizedArtworkImageUrl(image, {
    width: 1200,
    quality: 80,
    resize: 'contain',
  });
}

function containsHangul(value: string): boolean {
  return /[가-힣]/.test(value);
}

function sanitizeForLocale(
  value: string | null | undefined,
  locale: 'ko' | 'en',
  fallback = ''
): string {
  if (!value) return '';
  if (locale === 'en' && containsHangul(value)) {
    return fallback;
  }
  return value;
}

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

export function generateArtworkMetadata(artwork: Artwork, locale: 'ko' | 'en' = 'ko'): Metadata {
  const resolvedImageUrl = resolveSeoArtworkImageUrl(artwork.images[0]);
  const imageUrl = resolvedImageUrl.startsWith('http')
    ? resolvedImageUrl
    : `${SITE_URL}${resolvedImageUrl}`;

  const isEnglish = locale === 'en';
  const materialForLocale = sanitizeForLocale(
    artwork.material,
    locale,
    isEnglish ? 'Original details in Korean' : ''
  );
  const sizeForLocale = sanitizeForLocale(
    artwork.size,
    locale,
    isEnglish ? 'Original details in Korean' : ''
  );

  const summary = [
    isEnglish ? `Artist: ${artwork.artist}` : `작가: ${artwork.artist}`,
    isEnglish ? `Title: ${artwork.title}` : `작품명: ${artwork.title}`,
    artwork.year ? (isEnglish ? `Year: ${artwork.year}` : `제작년도: ${artwork.year}`) : '',
    materialForLocale
      ? isEnglish
        ? `Material: ${materialForLocale}`
        : `재료: ${materialForLocale}`
      : '',
    sizeForLocale ? (isEnglish ? `Size: ${sizeForLocale}` : `크기: ${sizeForLocale}`) : '',
  ]
    .filter(Boolean)
    .join(', ');

  const profileSnippet = sanitizeForLocale(
    artwork.profile,
    locale,
    isEnglish ? 'Original profile available in Korean.' : ''
  ).substring(0, 150);
  const descSnippet = sanitizeForLocale(
    artwork.description,
    locale,
    isEnglish ? 'Original artwork description available in Korean.' : ''
  ).substring(0, 150);

  const seoDescription =
    `${summary}. ` +
    (descSnippet ? `${isEnglish ? 'Artwork description' : '작품 설명'}: ${descSnippet}... ` : '') +
    (profileSnippet ? `${isEnglish ? 'Artist profile' : '작가 소개'}: ${profileSnippet}...` : '');

  const baseMetadata = createPageMetadata(
    `${artwork.title} - ${artwork.artist}`,
    seoDescription.substring(0, 300),
    `/artworks/${artwork.id}`,
    imageUrl,
    locale
  );

  // Get medium-specific keywords for better categorization
  const mediumKeywords = getMediumKeywords(materialForLocale || '');

  return {
    ...baseMetadata,
    keywords: [
      artwork.artist,
      artwork.title,
      ...mediumKeywords,
      ...(isEnglish ? ['SAF', 'artist solidarity', 'art purchase'] : ['씨앗페']),
      ...(isEnglish ? ['SAF 2026', 'Seed Art Festival 2026'] : ['씨앗페 2026', 'SAF 2026']),
      ...(isEnglish
        ? [
            'artist solidarity',
            'buy artwork',
            'mutual aid',
            'original artwork',
            'contemporary art collection',
          ]
        : [
            '예술인 연대',
            '미술품 구매',
            '상호부조',
            '원화 구매',
            '미술품 투자',
            '신진작가 원화',
            '현대미술 컬렉션',
            '예술인 상호부조',
          ]),
      ...(isEnglish ? ['Insa Art Center'] : ['인사아트센터']),
      materialForLocale.split(' ')?.[0] || (isEnglish ? 'artwork' : '미술품'),
      artwork.year ? (isEnglish ? `${artwork.year} artwork` : `${artwork.year}년 작품`) : null,
    ].filter(Boolean) as string[],
    openGraph: {
      ...baseMetadata.openGraph,
      type: 'website',
      locale: isEnglish ? 'en_US' : 'ko_KR',
      siteName: isEnglish ? 'SAF 2026' : '씨앗페 2026',
    },
    twitter: {
      ...baseMetadata.twitter,
      card: 'summary_large_image',
    },
  };
}

export function generateArtworkJsonLd(
  artwork: Artwork,
  numericPrice: string,
  isInquiry: boolean,
  locale: 'ko' | 'en' = 'ko'
) {
  const isEnglish = locale === 'en';
  const resolvedImageUrl = resolveSeoArtworkImageUrl(artwork.images[0]);
  const materialForLocale = sanitizeForLocale(
    artwork.material,
    locale,
    isEnglish ? 'Original details in Korean' : ''
  );
  const sizeForLocale = sanitizeForLocale(
    artwork.size,
    locale,
    isEnglish ? 'Original details in Korean' : ''
  );
  const profileForLocale = sanitizeForLocale(artwork.profile, locale);
  const descriptionForLocale = sanitizeForLocale(artwork.description, locale);
  const historyForLocale = sanitizeForLocale(artwork.history, locale);
  const editionForLocale = sanitizeForLocale(
    artwork.edition,
    locale,
    isEnglish ? 'Original details in Korean' : ''
  );

  const schemaDescription =
    descriptionForLocale ||
    profileForLocale ||
    (isEnglish
      ? `Artwork titled "${artwork.title}" by ${artwork.artist}`
      : `${artwork.artist}의 작품 "${artwork.title}"`);

  // Build alternateName for image SEO
  const imageAlternateName = [
    isEnglish
      ? `${artwork.title} by ${artwork.artist}`
      : `${formatArtistName(artwork.artist)}의 ${artwork.title}`,
    artwork.year,
    materialForLocale,
  ]
    .filter(Boolean)
    .join(', ');

  // Seller organization (reused in offers)
  const sellerOrg = {
    '@type': 'Organization',
    name: isEnglish ? 'Korea Smart Cooperative' : '한국스마트협동조합',
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
  const mediumCategory = classifyArtworkMedium(materialForLocale || '');

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    name: artwork.title,
    inLanguage: isEnglish ? 'en' : 'ko',
    artform: getArtformForSchema(materialForLocale || ''),
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
      name: isEnglish ? 'SAF 2026' : '씨앗페 2026',
      url: SITE_URL,
    },
    creator: {
      '@type': 'Person',
      name: artwork.artist,
      description: profileForLocale || undefined,
    },
    artMedium: materialForLocale || undefined,
    artworkSurface: materialForLocale || undefined,
    dateCreated: artwork.year || undefined,
    size: sizeForLocale
      ? { '@type': 'QuantitativeValue', value: sizeForLocale, unitText: 'dimensions' }
      : undefined,
    offers,
    isPartOf: {
      '@type': 'ExhibitionEvent',
      name: isEnglish
        ? 'SAF 2026 - Special Exhibition for Artist Mutual Aid'
        : '씨앗페 2026 - 예술인 상호부조 기금 마련 특별전',
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
      materialForLocale && {
        '@type': 'PropertyValue',
        name: isEnglish ? 'Material' : '재료',
        value: materialForLocale,
      },
      sizeForLocale && {
        '@type': 'PropertyValue',
        name: isEnglish ? 'Size' : '크기',
        value: sizeForLocale,
      },
      artwork.year && {
        '@type': 'PropertyValue',
        name: isEnglish ? 'Year' : '제작년도',
        value: artwork.year,
      },
      editionForLocale && {
        '@type': 'PropertyValue',
        name: isEnglish ? 'Edition' : '에디션',
        value: editionForLocale,
      },
      historyForLocale && {
        '@type': 'PropertyValue',
        name: isEnglish ? 'Artist history' : '작가이력',
        value: historyForLocale.substring(0, 200),
      },
    ].filter(Boolean),
    potentialAction: [
      {
        '@type': 'BuyAction',
        target: offerUrl,
        name: isEnglish ? 'Buy artwork' : '작품 구매하기',
      },
      {
        '@type': 'DonateAction',
        name: isEnglish ? 'Support artist mutual-aid fund' : '예술인 상호부조 기금 후원',
        description: isEnglish
          ? 'Part of this artwork purchase supports the artist mutual-aid fund.'
          : '이 작품 구매 수익금의 일부가 예술인 상호부조 기금으로 사용됩니다',
        recipient: {
          '@type': 'Organization',
          name: isEnglish ? 'Korea Smart Cooperative' : '한국스마트협동조합',
          description: isEnglish
            ? 'Organization operating the artist mutual-aid fund'
            : '예술인 상호부조 기금 운영 단체',
          url: SITE_URL,
        },
      },
    ],
  };

  const breadcrumbSchema = createBreadcrumbSchema(
    isEnglish
      ? [
          { name: 'Home', url: SITE_URL },
          { name: 'Artworks', url: `${SITE_URL}/artworks` },
          { name: artwork.title, url: `${SITE_URL}/artworks/${artwork.id}` },
        ]
      : [
          BREADCRUMB_HOME,
          BREADCRUMBS['/artworks'],
          { name: artwork.title, url: `${SITE_URL}/artworks/${artwork.id}` },
        ]
  );

  return {
    productSchema,
    breadcrumbSchema,
  };
}

export function generateExhibitionSchema(
  reviews: ExhibitionReview[] = [],
  locale: 'ko' | 'en' = 'ko'
) {
  const isEnglish = locale === 'en';
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
    name: isEnglish ? 'SAF 2026 (Seed Art Festival 2026)' : '씨앗페 2026 (Seed Art Festival 2026)',
    description: isEnglish
      ? 'A special exhibition raising mutual-aid funds for Korean artists, featuring paintings, sculptures, photography, and other works by over 50 artists.'
      : '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 50여 명의 작가가 참여한 회화, 조각, 사진 등 다양한 예술 작품을 만나보세요.',
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
        addressLocality: isEnglish ? 'Seoul' : '서울시',
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
      name: isEnglish ? 'Over 50 participating artists' : '참여 예술가 50여 명',
    },
    isAccessibleForFree: true,
    ...(hasReviews && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        ),
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
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

export function generateOrganizationSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: CONTACT.ORGANIZATION_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/og-image2.png`,
    description: isEnglish
      ? 'A special exhibition raising mutual-aid funds for Korean artists'
      : '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
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
      addressLocality: isEnglish ? 'Seoul' : '서울시',
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

export function generateWebsiteSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: isEnglish ? 'SAF 2026' : '씨앗페 2026',
    alternateName: 'SAF 2026',
    url: SITE_URL,
    description: isEnglish
      ? 'A special exhibition raising mutual-aid funds for Korean artists'
      : '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
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
      name: article.publisherName,
      url: article.url,
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

export function generateLocalBusinessSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'ArtGallery',
    name: isEnglish ? 'SAF 2026 (Seed Art Festival)' : '씨앗페 2026 (Seed Art Festival)',
    image: OG_IMAGE.url,
    '@id': SITE_URL,
    url: SITE_URL,
    telephone: CONTACT.PHONE,
    email: CONTACT.EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: EXHIBITION.ADDRESS,
      postalCode: EXHIBITION.POSTAL_CODE,
      addressLocality: isEnglish ? 'Seoul' : '서울시',
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

export function generateArtworkListSchema(artworks: Artwork[], locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  const aggregateOffer = generateGalleryAggregateOffer(artworks);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isEnglish ? 'SAF 2026 Artworks' : '씨앗페 2026 출품작',
    description: isEnglish
      ? 'Artwork list from SAF 2026'
      : '씨앗페 2026에 출품된 예술가들의 작품 목록',
    numberOfItems: artworks.length,
    // Price range for art buyers
    ...(aggregateOffer && { offers: aggregateOffer }),
    itemListElement: artworks.map((artwork, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/artworks/${artwork.id}`,
      name: artwork.title,
      image: resolveSeoArtworkImageUrl(artwork.images[0]).startsWith('http')
        ? resolveSeoArtworkImageUrl(artwork.images[0])
        : `${SITE_URL}${resolveSeoArtworkImageUrl(artwork.images[0])}`,
    })),
  };
}

export function generateArtistSchema(artist: ArtistSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    description: artist.description,
    image: artist.image
      ? (() => {
          const resolved = resolveSeoArtworkImageUrl(artist.image!);
          return resolved.startsWith('http') ? resolved : `${SITE_URL}${resolved}`;
        })()
      : undefined,
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
export function generateCampaignSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'FundingScheme',
    '@id': `${SITE_URL}#campaign`,
    name: isEnglish ? 'Artist Mutual Aid Fund Campaign' : '예술인 상호부조 기금 마련 캠페인',
    alternateName: 'SAF 2026 Artist Mutual Aid Fund',
    description: isEnglish
      ? 'A special campaign raising mutual-aid funds to help Korean artists avoid predatory lending and build financial stability through artwork purchases.'
      : '한국 예술인들의 고리대금 문제 해결을 위한 상호부조 기금 마련 특별 캠페인. 작품 구매를 통해 예술인들의 금융 자립을 지원합니다.',
    url: SITE_URL,
    funder: {
      '@type': 'Organization',
      name: CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    isAccessibleForFree: false,
    audience: {
      '@type': 'Audience',
      audienceType: isEnglish ? 'Art collectors and supporters' : '미술 컬렉터, 예술 후원자',
    },
  };
}
