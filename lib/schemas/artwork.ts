import type { Metadata } from 'next';
import { SITE_URL, CAMPAIGN, EXHIBITION, MERCHANT_POLICIES } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { formatArtistName } from '@/lib/utils';
import { getArtformForSchema, classifyArtworkMedium } from '@/lib/art-taxonomy';
import { Artwork } from '@/types';
import { resolveSeoArtworkImageUrl, sanitizeForLocale, parseArtworkPrice } from './utils';
import { createBreadcrumbSchema } from './breadcrumb';
import { buildLocaleUrl } from '@/lib/locale-alternates';

export function generateArtworkMetadata(artwork: Artwork, locale: 'ko' | 'en' = 'ko'): Metadata {
  const resolvedImageUrl = resolveSeoArtworkImageUrl(artwork.images[0]);
  const imageUrl = resolvedImageUrl.startsWith('http')
    ? resolvedImageUrl
    : `${SITE_URL}${resolvedImageUrl}`;

  const isEnglish = locale === 'en';
  const titleForLocale = isEnglish && artwork.title_en ? artwork.title_en : artwork.title;
  const artistForLocale = isEnglish && artwork.artist_en ? artwork.artist_en : artwork.artist;
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
    isEnglish ? `Artist: ${artistForLocale}` : `작가: ${artwork.artist}`,
    isEnglish ? `Title: ${titleForLocale}` : `작품명: ${artwork.title}`,
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
    isEnglish ? artwork.profile_en || artwork.profile : artwork.profile,
    locale,
    isEnglish ? 'Original profile available in Korean.' : ''
  ).substring(0, 200);
  const descSnippet = sanitizeForLocale(
    artwork.description,
    locale,
    isEnglish ? 'Original artwork description available in Korean.' : ''
  ).substring(0, 200);

  const seoDescription =
    `${summary}. ` +
    (descSnippet ? `${descSnippet}... ` : '') +
    (profileSnippet ? `${profileSnippet}...` : '');

  const baseMetadata = createPageMetadata(
    `${titleForLocale} - ${artistForLocale}`,
    seoDescription.substring(0, 160),
    `/artworks/${artwork.id}`,
    imageUrl,
    locale
  );

  const keywordBase = isEnglish
    ? [
        artistForLocale,
        titleForLocale,
        materialForLocale,
        'Korean art',
        'original artwork',
        'SAF Online',
        'buy artwork',
      ]
    : [
        artwork.artist,
        artwork.title,
        materialForLocale,
        '원화 구매',
        '한국 현대미술',
        '씨앗페 온라인',
        '출품작',
      ];

  return {
    ...baseMetadata,
    keywords: keywordBase.filter(Boolean) as string[],
    openGraph: {
      ...baseMetadata.openGraph,
      type: 'website',
      locale: isEnglish ? 'en_US' : 'ko_KR',
      siteName: isEnglish ? 'SAF Online' : '씨앗페 온라인',
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
  locale: 'ko' | 'en' = 'ko',
  breadcrumbLabels?: { home: string; artworks: string }
) {
  const isEnglish = locale === 'en';
  const titleForLocale = isEnglish && artwork.title_en ? artwork.title_en : artwork.title;
  const artistForLocale = isEnglish && artwork.artist_en ? artwork.artist_en : artwork.artist;
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
  const profileForLocale = sanitizeForLocale(
    isEnglish ? artwork.profile_en || artwork.profile : artwork.profile,
    locale
  );
  const descriptionForLocale = sanitizeForLocale(artwork.description, locale);
  const historyForLocale = sanitizeForLocale(
    isEnglish ? artwork.history_en || artwork.history : artwork.history,
    locale
  );
  const editionForLocale = sanitizeForLocale(
    artwork.edition,
    locale,
    isEnglish ? 'Original details in Korean' : ''
  );

  const schemaDescription =
    descriptionForLocale ||
    profileForLocale ||
    (isEnglish
      ? `Artwork titled "${titleForLocale}" by ${artistForLocale}`
      : `${artwork.artist}의 작품 "${artwork.title}"`);

  // Build alternateName for image SEO
  const imageAlternateName = [
    isEnglish
      ? `${titleForLocale} by ${artistForLocale}`
      : `${formatArtistName(artwork.artist)}의 ${artwork.title}`,
    artwork.year,
    materialForLocale,
  ]
    .filter(Boolean)
    .join(', ');

  // Seller organization (reused in offers) — @id links to root Organization schema
  const sellerOrg = {
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
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

  // priceValidUntil: 1년 후 날짜 (Google Merchant Center 유효성 유지)
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Build offers based on whether price is inquiry or numeric
  const offers = isInquiry
    ? {
        '@type': 'Offer',
        url: offerUrl,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
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
        priceValidUntil,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: sellerOrg,
        hasMerchantReturnPolicy: returnPolicy,
        shippingDetails,
      };

  // Classify artwork medium for better SEO categorization
  const mediumCategory = classifyArtworkMedium(materialForLocale || '');

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    '@id': buildLocaleUrl(`/artworks/${artwork.id}`, locale),
    name: titleForLocale,
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
      name: `${titleForLocale} - ${artistForLocale}`,
      alternateName: imageAlternateName,
    },
    description: schemaDescription.substring(0, 500),
    sku: `SAF2026-${artwork.id}`,
    mpn: `SAF2026-ART-${artwork.id}`,
    brand: {
      '@type': 'Brand',
      name: isEnglish ? 'SAF Online' : '씨앗페 온라인',
      url: SITE_URL,
    },
    creator: {
      '@type': 'Person',
      '@id': `${SITE_URL}/artworks/artist/${encodeURIComponent(artwork.artist)}`,
      name: artistForLocale,
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
      '@id': `${SITE_URL}#exhibition`,
      name: isEnglish
        ? 'SAF Online - Special Exhibition for Artist Mutual Aid'
        : '씨앗페 온라인 - 예술인 상호부조 기금 마련 특별전',
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

  const homeLabel = breadcrumbLabels?.home ?? (isEnglish ? 'Home' : '홈');
  const artworksLabel = breadcrumbLabels?.artworks ?? (isEnglish ? 'Artworks' : '출품작');
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: homeLabel, url: buildLocaleUrl('/', locale) },
    { name: artworksLabel, url: buildLocaleUrl('/artworks', locale) },
    { name: titleForLocale, url: buildLocaleUrl(`/artworks/${artwork.id}`, locale) },
  ]);

  // ItemPage: explicitly links this WebPage to the VisualArtwork/Product entity
  const artworkPageUrl = buildLocaleUrl(`/artworks/${artwork.id}`, locale);
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': `${artworkPageUrl}#webpage`,
    url: artworkPageUrl,
    name: `${titleForLocale} - ${artistForLocale}`,
    isPartOf: { '@id': `${SITE_URL}#website` },
    mainEntity: { '@id': artworkPageUrl },
    datePublished: CAMPAIGN.START_DATE,
    dateModified: CAMPAIGN.END_DATE,
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
  };

  return {
    productSchema,
    breadcrumbSchema,
    webPageSchema,
  };
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
    name: isEnglish ? 'SAF Online Artworks' : '씨앗페 온라인 출품작',
    description: isEnglish
      ? 'Artwork list from SAF Online'
      : '씨앗페 온라인에 출품된 예술가들의 작품 목록',
    numberOfItems: artworks.length,
    // Price range for art buyers
    ...(aggregateOffer && { offers: aggregateOffer }),
    itemListElement: artworks.map((artwork, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/artworks/${artwork.id}`,
      name: isEnglish && artwork.title_en ? artwork.title_en : artwork.title,
      image: resolveSeoArtworkImageUrl(artwork.images[0]).startsWith('http')
        ? resolveSeoArtworkImageUrl(artwork.images[0])
        : `${SITE_URL}${resolveSeoArtworkImageUrl(artwork.images[0])}`,
    })),
  };
}
