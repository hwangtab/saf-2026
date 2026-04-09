import type { Metadata } from 'next';
import { SITE_URL, CAMPAIGN, MERCHANT_POLICIES, CONTACT } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { formatArtistName } from '@/lib/utils';
import { getArtformForSchema, classifyArtworkMedium } from '@/lib/art-taxonomy';
import { Artwork } from '@/types';
import { resolveSeoArtworkImageUrl, sanitizeForLocale, parseArtworkPrice } from './utils';
import { createBreadcrumbSchema } from './breadcrumb';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { isExhibitionCompleted } from '@/lib/schemas/event';

// 빌드/렌더 시점 기준 +1년 동적 계산 — 만료로 인한 Shopping 노출 중단 방지
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

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

  const seoDescriptionBase =
    `${summary}. ` +
    (descSnippet ? `${descSnippet}... ` : '') +
    (profileSnippet ? `${profileSnippet}...` : '');

  const keywordBase = isEnglish
    ? [
        artistForLocale,
        titleForLocale,
        materialForLocale,
        'Korean art',
        'original artwork',
        artwork.category || null,
        artwork.category ? `buy ${artwork.category}` : null,
        'SAF Online',
        'buy artwork',
      ]
    : [
        artwork.artist,
        artwork.title,
        materialForLocale,
        '작품 구매',
        artwork.category || null,
        artwork.category ? `${artwork.category} 구매` : null,
        '한국 현대미술',
        '씨앗페 온라인',
        '출품작',
      ];

  const numericPriceValue = parseArtworkPrice(artwork.price);
  const isSold = artwork.sold === true;
  // 가격을 메타 description에 포함 — 구매 의도 검색 CTR 향상
  const priceSnippet = isSold
    ? isEnglish
      ? ' · Sold.'
      : ' · 판매 완료.'
    : numericPriceValue !== null
      ? ` · ₩${numericPriceValue.toLocaleString('ko-KR')}${isEnglish ? ' · Free shipping.' : ' · 무료 배송.'}`
      : isEnglish
        ? ' · Inquiry for price.'
        : ' · 가격 문의.';

  const seoDescription = (seoDescriptionBase.substring(0, 140) + priceSnippet).substring(0, 160);

  const baseMetadata = createPageMetadata(
    `${titleForLocale} - ${artistForLocale}`,
    seoDescription,
    `/artworks/${artwork.id}`,
    imageUrl,
    locale
  );

  return {
    ...baseMetadata,
    keywords: keywordBase.filter((k): k is string => Boolean(k)),
    openGraph: {
      ...baseMetadata.openGraph,
      locale: isEnglish ? 'en_US' : 'ko_KR',
      siteName: isEnglish ? 'SAF Online' : '씨앗페 온라인',
      // 작품별 alt로 덮어씀 — createPageMetadata의 제네릭 alt 대신 작품명 사용
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl.startsWith('https') ? imageUrl : undefined,
          width: 1200,
          height: 630,
          alt: isEnglish
            ? `${titleForLocale} by ${artistForLocale} — SAF Online`
            : `${artwork.artist} 작가의 작품 "${artwork.title}" — 씨앗페 온라인`,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      ...baseMetadata.twitter,
      card: 'summary_large_image',
      // 작품별 alt로 덮어씀 — baseMetadata.twitter의 제네릭 alt 대신 작품명 사용
      images: [
        {
          url: imageUrl,
          alt: isEnglish
            ? `${titleForLocale} by ${artistForLocale} — SAF Online`
            : `${artwork.artist} 작가의 작품 "${artwork.title}" — 씨앗페 온라인`,
        },
      ],
    },
    // Facebook/Instagram 제품 메타 태그 — 소셜 공유 시 가격 정보 노출
    other: {
      // og:type 'product' — Next.js 타입 제약으로 openGraph.type에 직접 설정 불가, other로 override
      'og:type': 'product',
      ...(numericPriceValue !== null && {
        'product:price:amount': String(numericPriceValue),
        'product:price:currency': 'KRW',
      }),
      'product:availability': isSold ? 'out of stock' : 'in stock',
      'product:condition': 'new',
      'product:retailer_item_id': `SAF2026-${artwork.id}`,
      // 작가 크레딧 메타 — 이미지 검색·Pinterest에서 작가 귀속 지원
      author: artistForLocale,
      // Twitter/X Product Card 라벨 — 카드에 가격·상태 직접 표시
      'twitter:label1': isEnglish ? 'Price' : '가격',
      'twitter:data1':
        numericPriceValue !== null
          ? `₩${numericPriceValue.toLocaleString('ko-KR')}`
          : isEnglish
            ? 'Inquiry'
            : '문의',
      'twitter:label2': isEnglish ? 'Status' : '판매 상태',
      'twitter:data2': isSold
        ? isEnglish
          ? 'Sold'
          : '판매 완료'
        : isEnglish
          ? 'Available'
          : '판매 중',
    },
  };
}

export function generateArtworkJsonLd(
  artwork: Artwork,
  numericPrice: string,
  isInquiry: boolean,
  locale: 'ko' | 'en' = 'ko',
  breadcrumbLabels?: { home: string; artworks: string; category?: { name: string; path: string } }
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
    name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
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
    '@id': `${SITE_URL}#shipping-domestic`,
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

  const priceValidUntil = PRICE_VALID_UNTIL;

  // 결제 수단 — Cafe24 쇼핑몰 기준 (신용카드·체크카드·계좌이체)
  const acceptedPaymentMethod = [
    'https://schema.org/CreditCard',
    'https://schema.org/DebitCard',
    'http://purl.org/goodrelations/v1#PayByBankTransferInAdvance',
  ];

  // 에디션 유형별 eligible quantity
  const eligibleQuantity =
    artwork.edition_type === 'unique'
      ? { '@type': 'QuantitativeValue', value: 1 }
      : artwork.edition_type === 'limited' && artwork.edition_limit
        ? { '@type': 'QuantitativeValue', value: artwork.edition_limit }
        : undefined;

  // Build offers based on whether price is inquiry or numeric
  const offers = isInquiry
    ? {
        '@type': 'Offer',
        url: offerUrl,
        validFrom: CAMPAIGN.START_DATE,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        priceSpecification: {
          '@type': 'PriceSpecification',
          valueAddedTaxIncluded: true,
        },
        acceptedPaymentMethod,
        ...(eligibleQuantity && { eligibleQuantity }),
        seller: sellerOrg,
        hasMerchantReturnPolicy: returnPolicy,
        shippingDetails,
      }
    : {
        '@type': 'Offer',
        url: offerUrl,
        validFrom: CAMPAIGN.START_DATE,
        priceCurrency: 'KRW',
        price: parseFloat(numericPrice) || 0,
        priceValidUntil,
        availability: artwork.sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        acceptedPaymentMethod,
        ...(eligibleQuantity && { eligibleQuantity }),
        seller: sellerOrg,
        hasMerchantReturnPolicy: returnPolicy,
        shippingDetails,
      };

  // Classify artwork medium for better SEO categorization
  const mediumCategory = classifyArtworkMedium(materialForLocale || '');

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': ['VisualArtwork', 'Product'],
    '@id': `${SITE_URL}/artworks/${artwork.id}`,
    name: titleForLocale,
    inLanguage: isEnglish ? 'en' : 'ko',
    audience: {
      '@type': 'PeopleAudience',
      suggestedGender: 'unisex',
      suggestedMinAge: 18,
    },
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
      caption: isEnglish
        ? `${titleForLocale} by ${artistForLocale}`
        : `${artistForLocale} 작가의 ${titleForLocale}`,
      width: 1200,
      height: 1200,
      acquireLicensePage: `${SITE_URL}/artworks/${artwork.id}`,
      representativeOfPage: true,
    },
    description: schemaDescription.substring(0, 500),
    sku: `SAF2026-${artwork.id}`,
    mpn: `SAF2026-ART-${artwork.id}`,
    countryOfOrigin: {
      '@type': 'Country',
      name: isEnglish ? 'South Korea' : '대한민국',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    brand: {
      '@type': 'Brand',
      name: isEnglish ? 'SAF Online' : '씨앗페 온라인',
      url: SITE_URL,
    },
    creator: {
      '@type': 'Person',
      '@id': buildLocaleUrl(`/artworks/artist/${encodeURIComponent(artwork.artist)}`, locale),
      name: artistForLocale,
      description: profileForLocale || undefined,
      nationality: {
        '@type': 'Country',
        name: 'South Korea',
        '@id': 'https://www.wikidata.org/wiki/Q884',
      },
    },
    artMedium: materialForLocale || undefined,
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
      eventStatus: isExhibitionCompleted()
        ? 'https://schema.org/EventCompleted'
        : 'https://schema.org/EventInProgress',
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      location: { '@type': 'VirtualLocation', url: SITE_URL },
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
    // sameAs: 동일 제품의 외부 판매 URL — 검색엔진이 Cafe24 상품과 동일 엔티티로 인식
    ...(artwork.shopUrl && { sameAs: artwork.shopUrl }),
    potentialAction: [
      {
        '@type': 'BuyAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: offerUrl,
          actionPlatform: [
            'https://schema.org/DesktopWebPlatform',
            'https://schema.org/MobileWebPlatform',
          ],
        },
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
          name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
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
  const categoryBreadcrumb = breadcrumbLabels?.category;
  const breadcrumbItems = [
    { name: homeLabel, url: buildLocaleUrl('/', locale) },
    { name: artworksLabel, url: buildLocaleUrl('/artworks', locale) },
    ...(categoryBreadcrumb
      ? [{ name: categoryBreadcrumb.name, url: buildLocaleUrl(categoryBreadcrumb.path, locale) }]
      : []),
    { name: titleForLocale, url: buildLocaleUrl(`/artworks/${artwork.id}`, locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

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
    dateModified: artwork.sold_at
      ? new Date(artwork.sold_at).toISOString().slice(0, 10)
      : CAMPAIGN.END_DATE,
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
    author: sellerOrg,
    publisher: sellerOrg,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#artwork-title', '#artist-name', '#artist-profile', '#artist-note'],
    },
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
export function generateGalleryAggregateOffer(
  artworks: Artwork[],
  locale: 'ko' | 'en' = 'ko',
  pageUrl?: string
) {
  const isEnglish = locale === 'en';
  const availableArtworks = artworks.filter((a) => !a.sold);
  const availablePrices = availableArtworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p > 0);

  // 판매 중인 작품이 없으면 가격 범위 없음 — null 반환
  if (availablePrices.length === 0) return null;

  const minPrice = Math.min(...availablePrices);
  const maxPrice = Math.max(...availablePrices);
  const availableCount = availableArtworks.length;

  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateOffer',
    lowPrice: minPrice,
    highPrice: maxPrice,
    priceCurrency: 'KRW',
    offerCount: availableCount,
    availability: availableCount > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    itemCondition: 'https://schema.org/NewCondition',
    validFrom: CAMPAIGN.START_DATE,
    priceValidUntil: PRICE_VALID_UNTIL,
    url: pageUrl ?? buildLocaleUrl('/artworks', locale),
    seller: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
  };
}

export function generateArtworkListSchema(
  artworks: Artwork[],
  locale: 'ko' | 'en' = 'ko',
  limit = 30,
  pageUrl?: string
) {
  const isEnglish = locale === 'en';
  const aggregateOffer = generateGalleryAggregateOffer(artworks, locale, pageUrl);
  // Strip @context when embedding — @context is only needed at the top level of a standalone script
  const embeddedOffer = aggregateOffer
    ? (({ '@context': _ctx, ...rest }) => rest)(aggregateOffer as Record<string, unknown>)
    : null;

  const listUrl = pageUrl ?? buildLocaleUrl('/artworks', locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${listUrl}#item-list`,
    name: isEnglish ? 'SAF Online Artworks' : '씨앗페 온라인 출품작',
    description: isEnglish
      ? 'Artwork list from SAF Online'
      : '씨앗페 온라인에 출품된 예술가들의 작품 목록',
    numberOfItems: Math.min(artworks.length, limit),
    itemListOrder: 'https://schema.org/ItemListUnordered',
    // Price range for art buyers
    ...(embeddedOffer && { offers: embeddedOffer }),
    itemListElement: artworks.slice(0, limit).map((artwork, index) => {
      const rawImg = artwork.images[0] ? resolveSeoArtworkImageUrl(artwork.images[0]) : null;
      const absImg = rawImg ? (rawImg.startsWith('http') ? rawImg : `${SITE_URL}${rawImg}`) : null;
      const artworkLocalePath = buildLocaleUrl(`/artworks/${artwork.id}`, locale);
      const artworkUrl = artworkLocalePath.startsWith('http')
        ? artworkLocalePath
        : `${SITE_URL}${artworkLocalePath}`;
      const artworkName = isEnglish && artwork.title_en ? artwork.title_en : artwork.title;
      const numericPrice = parseArtworkPrice(artwork.price);
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'VisualArtwork',
          '@id': artworkUrl,
          url: artworkUrl,
          name: artworkName,
          ...(absImg && { image: absImg }),
          ...(numericPrice !== null && {
            offers: {
              '@type': 'Offer',
              price: numericPrice,
              priceCurrency: 'KRW',
              priceValidUntil: PRICE_VALID_UNTIL,
              availability: artwork.sold
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              seller: { '@type': 'Organization', '@id': `${SITE_URL}#organization` },
            },
          }),
        },
      };
    }),
  };
}
