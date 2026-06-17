import type { Metadata } from 'next';
import { SITE_URL, CAMPAIGN, CONTACT } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { createLocaleAlternates } from '@/lib/locale-alternates';
import { formatArtistName } from '@/lib/utils';
import { getArtformForSchema, classifyArtworkMedium } from '@/lib/art-taxonomy';
import { getCategoryLabel } from '@/lib/artwork-category';
import { Artwork } from '@/types';
import { resolveSeoArtworkImageUrl, sanitizeForLocale, parseArtworkPrice } from './utils';
import { getMaterialLabel, getSizeLabel, getEditionLabel } from '@/lib/artwork-material';
import { getMediumHubSlug, getMediumCommerceHubSlug } from '@/lib/artwork-medium-hub';
import { createBreadcrumbSchema } from './breadcrumb';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { getArtworkSeoOverride } from '@/lib/artwork-seo-overrides';
import {
  EXHIBITION_END_DATE,
  EXHIBITION_START_DATE,
  getExhibitionSchemaState,
} from '@/lib/schemas/event';
import { SHIPPING_THRESHOLD } from '@/lib/integrations/toss/config';

// 빌드/렌더 시점 기준 +1년 동적 계산 — 만료로 인한 Shopping 노출 중단 방지
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

// Merchant listing 권장 필드 — GSC "hasMerchantReturnPolicy 누락"(P2 WARNING) 해소 +
// 가격/재고 rich result 자격 강화. 실제 정책과 일치(단일 출처): 수령 후 7일 이내 단순변심
// 청약철회, 반품 배송비는 구매자 부담(손상 시 무상 교환·환불), 국내(KR) 배송.
const MERCHANT_RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'KR',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  // 단순변심 반품 배송비 구매자 부담 (refundItem3) — FreeReturn 아님.
  returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
};

// 무료 배송(국내) — OfferShippingDetails. 출고 배송비 0원, 배송지 KR.
const OFFER_SHIPPING_DETAILS = {
  '@type': 'OfferShippingDetails',
  shippingRate: {
    '@type': 'MonetaryAmount',
    value: 0,
    currency: 'KRW',
  },
  shippingDestination: {
    '@type': 'DefinedRegion',
    addressCountry: 'KR',
  },
  // 배송 소요 — 총 14영업일(Mon~Fri 기준). 작품은 검수·액자 제작·안전 포장(handling) 후
  // 국내 택배 배송(transit). handling 0~12영업일 + transit 1~2영업일 = 최대 14영업일.
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    businessDays: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'https://schema.org/Monday',
        'https://schema.org/Tuesday',
        'https://schema.org/Wednesday',
        'https://schema.org/Thursday',
        'https://schema.org/Friday',
      ],
    },
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 0,
      maxValue: 12,
      unitCode: 'DAY',
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 2,
      unitCode: 'DAY',
    },
  },
};

// 판매 상태 3분류 — JSON-LD offers·product:* 메타가 각자 매핑하면 다음 상태 추가 시
// 한쪽만 갱신되어 피드-페이지 불일치가 생긴다 (2026-06-12 리뷰: 단일 출처화).
type ArtworkAvailability = 'sold' | 'reserved' | 'available';

function resolveArtworkAvailability(artwork: Artwork): ArtworkAvailability {
  if (artwork.sold) return 'sold';
  if (artwork.reserved) return 'reserved';
  return 'available';
}

const SCHEMA_ORG_AVAILABILITY: Record<ArtworkAvailability, string> = {
  sold: 'https://schema.org/OutOfStock',
  reserved: 'https://schema.org/LimitedAvailability',
  available: 'https://schema.org/InStock',
};

// OG product:availability — Facebook/Pinterest 파서의 공통 enum에는 'reserved'에 정확히
// 대응하는 값이 없다 ('pending'은 일부 파서만 인식). 일시 보류 작품이 소셜 카탈로그에서
// 구매 가능으로 오인되지 않도록 보수적으로 out of stock 처리.
const OG_PRODUCT_AVAILABILITY: Record<ArtworkAvailability, string> = {
  sold: 'out of stock',
  reserved: 'out of stock',
  available: 'in stock',
};

export function generateArtworkMetadata(artwork: Artwork, locale: 'ko' | 'en' = 'ko'): Metadata {
  const resolvedImageUrl = resolveSeoArtworkImageUrl(artwork.images[0] ?? '');
  const imageUrl = resolvedImageUrl.startsWith('http')
    ? resolvedImageUrl
    : `${SITE_URL}${resolvedImageUrl}`;

  const isEnglish = locale === 'en';
  const titleForLocale = isEnglish && artwork.title_en ? artwork.title_en : artwork.title;
  const artistForLocale = isEnglish && artwork.artist_en ? artwork.artist_en : artwork.artist;
  // material·size는 코드 매핑(MATERIAL_EN_MAP·SIZE_EN_MAP)으로 영문화 — 미매핑 시 원본 KO 유지.
  // 이전 'Original details in Korean' fallback은 사용자에 "번역 미완료" 인상 + 정보 손실 → 제거.
  const materialForLocale = getMaterialLabel(artwork.material, locale);
  const sizeForLocale = getSizeLabel(artwork.size, locale);

  const profileSnippet = sanitizeForLocale(
    isEnglish ? artwork.profile_en || artwork.profile : artwork.profile,
    locale,
    isEnglish ? 'Original profile available in Korean.' : ''
  ).substring(0, 200);
  const descSnippet = sanitizeForLocale(
    isEnglish ? artwork.description_en || artwork.description : artwork.description,
    locale,
    isEnglish ? 'Original artwork description available in Korean.' : ''
  ).substring(0, 200);

  // 자연어 description — key:value dump 대신 사람이 읽기 좋은 문장으로 SERP CTR 개선.
  // e.g. KO: "오윤 작가의 '안는다' (목판화, 2024). {descSnippet}... · ₩XXX · 무료 배송."
  const metaDetails = [materialForLocale, artwork.year, sizeForLocale].filter(Boolean).join(', ');
  const seoDescriptionBase = isEnglish
    ? `'${titleForLocale}' by ${artistForLocale}` +
      (metaDetails ? ` (${metaDetails})` : '') +
      '.' +
      (descSnippet ? ` ${descSnippet}...` : '') +
      (!descSnippet && profileSnippet ? ` ${profileSnippet}...` : '')
    : `${artwork.artist} 작가의 '${artwork.title}'` +
      (metaDetails ? ` (${metaDetails})` : '') +
      '.' +
      (descSnippet ? ` ${descSnippet}...` : '') +
      (!descSnippet && profileSnippet ? ` ${profileSnippet}...` : '');

  // /en keywords·meta에 KO category(회화·판화 등)가 그대로 들어가던 누락 — locale별 라벨 매핑
  const categoryForLocale = artwork.category ? getCategoryLabel(artwork.category, locale) : null;

  const keywordBase = isEnglish
    ? [
        artistForLocale,
        titleForLocale,
        materialForLocale,
        'Korean art',
        'original artwork',
        categoryForLocale,
        categoryForLocale ? `buy ${categoryForLocale}` : null,
        'SAF Online',
        'buy artwork',
        // 연도 + 작가명 조합 long-tail (예: "Oh Yoon 1985 print")
        artwork.year && artistForLocale ? `${artistForLocale} ${artwork.year}` : null,
        // 매체 + 'for sale' commerce intent
        categoryForLocale ? `${categoryForLocale} for sale` : null,
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
        // 연도 + 작가명 long-tail
        artwork.year ? `${artwork.artist} ${artwork.year}` : null,
        // 작품명 단독 (navigational)
        artwork.title ? `${artwork.title} 원본` : null,
      ];

  const numericPriceValue = parseArtworkPrice(artwork.price);
  const isSold = artwork.sold === true;
  // 가격을 메타 description에 포함 — 구매 의도 검색 CTR 향상.
  // '무료 배송'은 SHIPPING_THRESHOLD(20만원) 이상에만 표기 — 미만 작품은 결제 단계에서
  // 배송비 4,000원이 부과되므로 검색 스니펫/공유 카드의 허위 약속이 된다 (2026-06-12 리뷰,
  // CTA의 PurchaseConfidenceStrip 분기와 동일 정책).
  const freeShippingSnippet =
    numericPriceValue !== null && numericPriceValue >= SHIPPING_THRESHOLD
      ? isEnglish
        ? ' · Free shipping.'
        : ' · 무료 배송.'
      : '';
  const priceSnippet = isSold
    ? isEnglish
      ? ' · Sold.'
      : ' · 판매 완료.'
    : numericPriceValue !== null
      ? ` · ₩${numericPriceValue.toLocaleString('ko-KR')}${freeShippingSnippet}`
      : isEnglish
        ? ' · Inquiry for price.'
        : ' · 가격 문의.';

  // 접미부(가격·배송)는 항상 온전히 보존하고 본문만 단어 경계로 절단 (2026-06-12 감사:
  // 전체 문자열 이중 substring이 '…무료 배'처럼 단어 중간 하드컷되어 카카오/소셜 카드에
  // 그대로 노출되던 회귀).
  const DESC_LIMIT = 160;
  const bodyLimit = Math.max(40, DESC_LIMIT - priceSnippet.length);
  let descBody = seoDescriptionBase;
  if (descBody.length > bodyLimit) {
    const lastSpace = descBody.lastIndexOf(' ', bodyLimit - 1);
    // 단어 경계가 너무 앞이면(공백 없는 긴 문자열) 한도에서 절단
    const cutAt = lastSpace > bodyLimit - 30 ? lastSpace : bodyLimit - 1;
    descBody = `${descBody.slice(0, cutAt).trimEnd()}…`;
  }
  const seoDescription = descBody + priceSnippet;

  // Title에 가격/판매상태를 포함해 CTR 개선 — GSC 실측상 작품 상세가 8,883노출/1.8% CTR로 가장 큰 개선 레버.
  // SOLD 작품은 'Sold'/'판매 완료'가 SERP에서 desperate 인상으로 click 떨어뜨림 — '원본' positive 워딩으로 교체.
  // (사용자는 'Sold'를 보고 "구매 불가" 인지 → 클릭 회피. '원본 1점 한정'은 작품 unique 가치 강조.)
  const titleStatusSuffix = isSold
    ? isEnglish
      ? ' · Original (1 of 1)'
      : ' · 원본 1점'
    : numericPriceValue !== null
      ? ` · ₩${numericPriceValue.toLocaleString('ko-KR')}`
      : isEnglish
        ? ' · Inquiry'
        : ' · 가격 문의';
  const seoOverride = getArtworkSeoOverride(artwork.id);
  const overrideTitle = isEnglish ? seoOverride?.titleEn : seoOverride?.titleKo;
  // 같은 작가의 동일 제목 연작(예: 이호철 'Encore' 11점)은 가격까지 같으면 title이 완전 동일해져
  // 네이버 "동일 제목 웹문서 다수" 진단에 걸린다. 크기를 덧붙여 <title>을 고유화한다.
  // ⚠️ size는 가격(titleStatusSuffix) "뒤"에 둔다 — 가격은 CTR 핵심 레버(위 주석)이므로 SERP
  // 표시 길이(모바일 ~30자) 안에 반드시 들어가야 하고, size는 잘려도 무방한 부가 정보. size
  // 미상('확인 중')이면 생략. (네이버 동일-title 진단은 표시분이 아닌 전체 <title> 기준이라 끝에
  // 붙여도 중복 구별 효과는 동일.)
  const hasValidSize = Boolean(artwork.size) && !artwork.size.includes('확인');
  const sizeForTitle = hasValidSize && sizeForLocale ? ` · ${sizeForLocale}` : '';
  const pageTitle =
    overrideTitle ?? `${titleForLocale} · ${artistForLocale}${titleStatusSuffix}${sizeForTitle}`;

  const baseMetadata = createPageMetadata(
    pageTitle,
    seoDescription,
    `/artworks/${artwork.id}`,
    imageUrl,
    locale
  );

  // ⚠️ images 키는 destructure로 "키 자체를 제거"해야 한다. `images: undefined` 명시는
  // Next.js 16 mergeStaticMetadata가 hasOwnProperty('images')로 판정해 컨벤션 파일
  // (opengraph-image.tsx) 주입을 스킵시키고, 값마저 undefined라 og:image가 0개가 되는
  // 회귀를 만든다 (Sprint 69 59cdbaf5 → 라이브 전 작품 og:image 소실, 2026-06-12 감사 확인).
  // createPageMetadata가 채운 generic 이미지도 함께 제외해야 컨벤션 카드가 발행된다.
  const { images: _omitOgImages, ...baseOpenGraph } = baseMetadata.openGraph ?? {};
  const { images: _omitTwitterImages, ...baseTwitter } = baseMetadata.twitter ?? {};

  // og:image를 동적 opengraph-image.tsx로 명시 지정. 컨벤션 자동 생성은 기본 locale(ko)에서
  // `/ko/...` URL이 되어 next-intl 미들웨어가 308 리다이렉트 → 카카오톡 등 OG 크롤러가
  // 리다이렉트를 안 따라가 썸네일 누락(2026-06-17). buildLocaleUrl은 비-리다이렉트(ko=무접두,
  // en=/en)라 그 뒤에 /opengraph-image만 붙이면 안전.
  const ogImageUrl = `${buildLocaleUrl(`/artworks/${artwork.id}`, locale).replace(/\/$/, '')}/opengraph-image`;
  const ogImages = [
    { url: ogImageUrl, width: 1200, height: 630, alt: `${titleForLocale} — ${artistForLocale}` },
  ];

  return {
    ...baseMetadata,
    // koOnly=true: KO canonical 통합 — EN 작품 페이지(noindex)가 en-US hreflang으로
    // 잘못 발행되는 문제 수정. KO 페이지에서 무효 hreflang 클러스터 제거.
    alternates: createLocaleAlternates(`/artworks/${artwork.id}`, locale, true),
    keywords: keywordBase.filter((k): k is string => Boolean(k)),
    // 영문 작품 detail은 noindex — 348개 × en/ko = thin/duplicate content risk.
    // 작품 description_en이 충실치 않은 경우 Google "Crawled, not indexed" 판정 자주 발생.
    // 한국어 작품 detail은 index 유지 (검색 트래픽 핵심).
    ...(isEnglish ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      ...baseOpenGraph,
      type: 'website',
      locale: isEnglish ? 'en_US' : 'ko_KR',
      siteName: isEnglish ? 'SAF Online' : '씨앗페 온라인',
      // 가격+SOLD 배지+SAF 브랜딩 디자인 카드(opengraph-image.tsx)를 비-리다이렉트 URL로 명시.
      images: ogImages,
    },
    twitter: {
      ...baseTwitter,
      card: 'summary_large_image',
      images: ogImages,
    },
    // ⚠️ product:* OG 확장 태그를 metadata.other에 넣지 말 것 — Next.js Metadata API는
    // other 항목을 전부 name= 속성으로 렌더하는데 product:*는 RDFa property= 속성 기준이라
    // Facebook Merchant Catalog·Pinterest Rich Pin 파서가 읽지 못한다 (2026-06-12 감사 실측).
    // → components/common/ProductMetaTags.tsx가 페이지 JSX에서 property=로 직접 렌더
    //   (React 19 head hoisting). twitter:*·author는 name=이 올바른 규격이라 여기 유지.
    other: {
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

export interface ProductMetaEntry {
  property: string;
  content: string;
}

/**
 * product:* Open Graph 확장 태그 데이터 — RDFa property= 속성으로 렌더해야
 * Facebook Merchant Catalog·Pinterest Rich Pin 파서가 인식한다.
 * metadata.other(name= 렌더)에 넣으면 송출은 되지만 파서가 전부 무시 — 반드시
 * components/common/ProductMetaTags.tsx를 페이지 JSX에 렌더해 소비할 것.
 */
export function buildArtworkProductMeta(
  artwork: Artwork,
  locale: 'ko' | 'en' = 'ko'
): ProductMetaEntry[] {
  const numericPriceValue = parseArtworkPrice(artwork.price);
  if (numericPriceValue === null) return [];
  const isEnglish = locale === 'en';
  const categoryForLocale = artwork.category ? getCategoryLabel(artwork.category, locale) : null;
  return [
    { property: 'product:price:amount', content: String(numericPriceValue) },
    { property: 'product:price:currency', content: 'KRW' },
    {
      property: 'product:availability',
      content: OG_PRODUCT_AVAILABILITY[resolveArtworkAvailability(artwork)],
    },
    { property: 'product:condition', content: 'new' },
    { property: 'product:retailer_item_id', content: `SAF2026-${artwork.id}` },
    // Facebook Merchant Catalog 추가 필드 — 카탈로그 매칭 정확도 강화
    { property: 'product:brand', content: isEnglish ? 'SAF Online' : '씨앗페 온라인' },
    ...(categoryForLocale ? [{ property: 'product:category', content: categoryForLocale }] : []),
  ];
}

export function generateArtworkJsonLd(
  artwork: Artwork,
  numericPrice: string,
  isInquiry: boolean,
  locale: 'ko' | 'en' = 'ko',
  breadcrumbLabels?: { home: string; artworks: string; category?: { name: string; path: string } },
  options?: {
    // 이 작품을 본문/주제로 다룬 매거진. VisualArtwork.subjectOf로 송출해 매거진→작품
    // mentions와 양방향 그래프를 닫는다. 호출처에서 slice(0, 3)된 동일 목록을 전달.
    mentionedInStories?: Array<{ slug: string; title: string; titleEn?: string | null }>;
  }
) {
  const isEnglish = locale === 'en';
  const titleForLocale = isEnglish && artwork.title_en ? artwork.title_en : artwork.title;
  const artistForLocale = isEnglish && artwork.artist_en ? artwork.artist_en : artwork.artist;
  const resolvedImageUrl = resolveSeoArtworkImageUrl(artwork.images[0] ?? '');
  const materialForLocale = getMaterialLabel(artwork.material, locale);
  const sizeForLocale = getSizeLabel(artwork.size, locale);
  const profileForLocale = sanitizeForLocale(
    isEnglish ? artwork.profile_en || artwork.profile : artwork.profile,
    locale
  );
  const descriptionForLocale = sanitizeForLocale(
    isEnglish ? artwork.description_en || artwork.description : artwork.description,
    locale
  );
  const historyForLocale = sanitizeForLocale(
    isEnglish ? artwork.history_en || artwork.history : artwork.history,
    locale
  );
  const editionForLocale = getEditionLabel(artwork.edition, locale);

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

  // Seller organization — @id links to root Organization schema
  const sellerOrg = {
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    url: SITE_URL,
  };

  // Offer URL: 모든 결제는 내부 Toss 체크아웃 경유. shopUrl(legacy Cafe24) 우선순위 제거.
  const offerUrl = `${SITE_URL}/artworks/${artwork.id}`;

  // Classify artwork medium for better SEO categorization.
  // raw artwork.material(KO 원본)로 분류 — taxonomy keywords가 KO/EN 양쪽 인지. 분류 결과의
  // name/alternateName은 locale별 swap. materialForLocale은 사용자 표시용 변환된 값이라
  // 분류 입력으로는 부적합.
  const mediumCategory = classifyArtworkMedium(artwork.material || '');
  const exhibitionSchemaState = getExhibitionSchemaState(locale);

  const productSchema = {
    '@context': 'https://schema.org',
    // Product + VisualArtwork dual-type (2026-06-12 감사에서 복원).
    // 한때 GSC "review/aggregateRating 누락" 경고(P2 WARNING)를 이유로 Product/offers를
    // 제거했으나, 이는 organic SERP의 가격·재고 rich result 자격과 Merchant Center
    // 랜딩페이지 검증(피드-페이지 가격 일치)까지 포기하는 과잉 대응이었음.
    // 작품은 일회성 원본/한정 에디션이라 가짜 리뷰·평점은 넣지 않는다 — 경고는 무시 가능.
    '@type': ['Product', 'VisualArtwork'],
    '@id': `${SITE_URL}/artworks/${artwork.id}`,
    name: titleForLocale,
    // BCP 47 형식 (en-US, ko-KR) — ItemPage 노드(line ~555)와 일관성 통일.
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
    // GSC가 PeopleAudience 고정값을 "audience 개체 유형이 잘못됨"으로 16건 보고함.
    // 모든 작품에 동일 적용되는 의류 카탈로그성 필드라 SEO 가치도 없어 제거.
    artform: getArtformForSchema(materialForLocale || ''),
    // Category for faceted navigation SEO — name/alternateName은 locale별로 swap
    ...(mediumCategory && {
      category: {
        '@type': 'Thing',
        '@id': `${SITE_URL}/artworks?medium=${mediumCategory.id}`,
        name: isEnglish ? mediumCategory.nameEn : mediumCategory.name,
        alternateName: isEnglish ? mediumCategory.name : mediumCategory.nameEn,
      },
    }),
    // 매체 hub guide entity — 작품과 매체 hub story의 schema-level 강한 association.
    // Google Knowledge Graph가 작품을 매체 hub의 instance로 인식 → 매체 hub authority 강화.
    ...(() => {
      const hubSlug = getMediumHubSlug(artwork.category);
      if (!hubSlug) return {};
      const catLabel = artwork.category ? getCategoryLabel(artwork.category, locale) : null;
      return {
        about: [
          {
            '@type': 'CreativeWork',
            '@id': `${SITE_URL}/stories/${hubSlug}#about`,
            url: `${SITE_URL}/stories/${hubSlug}`,
            name: catLabel
              ? isEnglish
                ? `${catLabel} guide`
                : `${catLabel} 가이드`
              : isEnglish
                ? 'Medium guide'
                : '매체 가이드',
          },
        ],
      };
    })(),
    image: {
      '@type': 'ImageObject',
      url: resolvedImageUrl.startsWith('http')
        ? resolvedImageUrl
        : `${SITE_URL}${resolvedImageUrl}`,
      contentUrl: resolvedImageUrl.startsWith('http')
        ? resolvedImageUrl
        : `${SITE_URL}${resolvedImageUrl}`,
      // encodingFormat — webp/jpeg 자동 변환되므로 명시 image/* 발행 (Google Images metadata)
      encodingFormat: /\.webp(\?|$)/i.test(resolvedImageUrl) ? 'image/webp' : 'image/jpeg',
      name: `${titleForLocale} - ${artistForLocale}`,
      alternateName: imageAlternateName,
      caption: isEnglish
        ? `${titleForLocale} by ${artistForLocale}`
        : `${artistForLocale} 작가의 ${titleForLocale}`,
      creditText: `${artistForLocale} / ${isEnglish ? 'SAF Online' : '씨앗페 온라인'}`,
      copyrightNotice: `© ${artistForLocale}`,
      // width/height 미발행 — 실제 이미지는 resize='contain'으로 종횡비가 보존되는
      // 비정방형이 대부분이라 1200×1200 하드코딩은 허위 메타데이터였음 (파서가 실측).
      acquireLicensePage: `${SITE_URL}/artworks/${artwork.id}`,
      representativeOfPage: true,
      // creator + copyrightHolder — Google Images, AI 학습 시 작가 entity 귀속 시그널.
      creator: {
        '@type': 'Person',
        '@id': buildLocaleUrl(`/artworks/artist/${encodeURIComponent(artwork.artist)}`, locale),
        name: artistForLocale,
      },
      copyrightHolder: {
        '@type': 'Person',
        '@id': buildLocaleUrl(`/artworks/artist/${encodeURIComponent(artwork.artist)}`, locale),
        name: artistForLocale,
      },
      // 작가 본인이 SAF에 저작권 보유. CC BY-NC-ND 4.0 — Non-Commercial/No-Derivative
      // 학술·언론 인용은 가능하나 상업·변형 금지 (작가 권리 보호).
      license: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    },
    description: schemaDescription.substring(0, 500),
    // Offer 발행 — 가격·재고·판매자 구조화 데이터. 가격 미정(문의) 작품은 offers 생략.
    ...(!isInquiry && numericPrice
      ? {
          offers: {
            '@type': 'Offer',
            price: numericPrice,
            priceCurrency: 'KRW',
            availability: SCHEMA_ORG_AVAILABILITY[resolveArtworkAvailability(artwork)],
            url: offerUrl,
            priceValidUntil: PRICE_VALID_UNTIL,
            itemCondition: 'https://schema.org/NewCondition',
            seller: sellerOrg,
            // Merchant listing 권장 필드 (GSC WARNING 해소) — 실제 정책과 일치.
            hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY,
            shippingDetails: OFFER_SHIPPING_DETAILS,
          },
        }
      : {}),
    // brand는 Product 타입에서 유효 (dual-type 복원으로 schema.org range 충족)
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
    // copyrightHolder — VisualArtwork 본체 저작권은 작가 본인 (Person creator와 동일 reference).
    // copyrightYear — 작품 제작년도. artwork.year null이면 필드 생략.
    copyrightHolder: {
      '@id': buildLocaleUrl(`/artworks/artist/${encodeURIComponent(artwork.artist)}`, locale),
    },
    // 접근성 시그널 — Google E-A-T / GEO 신호 + WAI-ARIA 호환성
    isFamilyFriendly: true,
    accessibilityFeature: ['alternativeText', 'highContrastDisplay'],
    accessibilityHazard: 'none',
    ...(artwork.year && /^\d{4}$/.test(artwork.year)
      ? { copyrightYear: Number(artwork.year) }
      : {}),
    artMedium: materialForLocale || undefined,
    dateCreated: artwork.year || undefined,
    // size는 additionalProperty에 PropertyValue로만 노출한다.
    // Product/Merchant 전용 직속 필드는 GSC rich result 경고를 유발하므로 발행하지 않는다.
    // 임베디드 ExhibitionEvent — 전시 스키마가 독립 주입되지 않으므로 @id 참조 대신 인라인 객체로 표현
    // (dangling @id 참조 방지).
    // ⚠️ isPartOf(range: CreativeWork)에 Event를 넣으면 schema.org range 위반 —
    // subjectOf(range: CreativeWork | Event)로 발행하고 매거진 Article과 배열 병합 (2026-06-12 감사).
    subjectOf: [
      {
        '@type': 'ExhibitionEvent',
        name: isEnglish
          ? 'SAF Online - Special Exhibition for Artist Mutual Aid'
          : '씨앗페 온라인 - 예술인 상호부조 기금 마련 특별전',
        startDate: EXHIBITION_START_DATE,
        endDate: EXHIBITION_END_DATE,
        eventStatus: exhibitionSchemaState.eventStatus,
        eventAttendanceMode: exhibitionSchemaState.eventAttendanceMode,
        location: exhibitionSchemaState.location,
        organizer: sellerOrg,
        // superEvent — SAF 캠페인(3년 누적, 2023부터) EventSeries 상위로 연결.
        // Knowledge Graph가 작품 → 2026 전시 → SAF 시리즈 전체 entity cluster 인식.
        superEvent: {
          '@type': 'EventSeries',
          name: isEnglish
            ? 'Seed Art Festival (SAF) — Artist Mutual Aid Series'
            : '씨앗페(SAF) — 예술인 상호부조 시리즈',
          startDate: '2023-03-21',
          url: SITE_URL,
          organizer: sellerOrg,
        },
      },
      ...(options?.mentionedInStories ?? []).map((s) => {
        const storyUrl = buildLocaleUrl(`/stories/${s.slug}`, locale);
        return {
          '@type': 'Article',
          '@id': storyUrl,
          headline: isEnglish && s.titleEn ? s.titleEn : s.title,
          url: storyUrl,
        };
      }),
    ],
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
      // Country of Origin — Google Shopping/이미지 검색 entity 매칭 강화 + 'Korean art' query 정합성.
      {
        '@type': 'PropertyValue',
        name: isEnglish ? 'Country of origin' : '원산지',
        value: isEnglish ? 'Republic of Korea' : '대한민국',
      },
    ].filter(Boolean),
    ...(options?.mentionedInStories?.length && {
      // mentions — schema.org CreativeWork 표준 필드, 작품이 매거진에서 언급된 관계.
      // subjectOf(작품이 매거진의 주제 — 위 배열에 병합됨)와 분리해 양방향 entity 시그널 강화.
      // AI Overview/KG 매칭 두 슬롯 모두 cite 가능.
      mentions: options.mentionedInStories.map((s) => {
        const storyUrl = buildLocaleUrl(`/stories/${s.slug}`, locale);
        return {
          '@type': 'CreativeWork',
          '@id': `${storyUrl}#mention`,
          name: isEnglish && s.titleEn ? s.titleEn : s.title,
          url: storyUrl,
        };
      }),
    }),
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
  // 매체 hub about entity — ItemPage(WebPage subtype)가 매체 매거진 hub와 schema-level 연결.
  // VisualArtwork.about(Sprint 30)과 별개로 WebPage 레벨에서도 동일 시그널 발행 → 양쪽 schema 모두 KG entity.
  const itemPageAboutHubs = (() => {
    const hubSlug = getMediumHubSlug(artwork.category);
    const commerceSlug = getMediumCommerceHubSlug(artwork.category);
    if (!hubSlug && !commerceSlug) return null;
    const catLabel = artwork.category ? getCategoryLabel(artwork.category, locale) : null;
    const entries: Array<{
      '@type': 'CreativeWork';
      '@id': string;
      url: string;
      name: string;
    }> = [];
    if (hubSlug) {
      entries.push({
        '@type': 'CreativeWork',
        '@id': `${SITE_URL}/stories/${hubSlug}#about`,
        url: `${SITE_URL}/stories/${hubSlug}`,
        name: catLabel
          ? isEnglish
            ? `${catLabel} guide`
            : `${catLabel} 가이드`
          : isEnglish
            ? 'Medium guide'
            : '매체 가이드',
      });
    }
    if (commerceSlug && commerceSlug !== hubSlug) {
      entries.push({
        '@type': 'CreativeWork',
        '@id': `${SITE_URL}/stories/${commerceSlug}#about`,
        url: `${SITE_URL}/stories/${commerceSlug}`,
        name: catLabel
          ? isEnglish
            ? `${catLabel} pricing & buying`
            : `${catLabel} 가격·구매 가이드`
          : isEnglish
            ? 'Pricing guide'
            : '가격 가이드',
      });
    }
    return entries;
  })();
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': `${artworkPageUrl}#webpage`,
    url: artworkPageUrl,
    name: `${titleForLocale} - ${artistForLocale}`,
    isPartOf: { '@id': `${SITE_URL}#website` },
    mainEntity: { '@id': artworkPageUrl },
    ...(itemPageAboutHubs && { about: itemPageAboutHubs }),
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
  // 하한 1만원 — 결제 테스트용 더미 작품(₩100 등)이 갤러리 AggregateOffer의 lowPrice를
  // 오염시켜 LocalBusiness priceRange와 모순되던 회귀 방지 (2026-06-12 감사).
  // 실 판매 작품 최저가는 ₩50,000 — 정상 데이터에는 영향 없음.
  const MIN_PLAUSIBLE_PRICE = 10_000;
  const availablePrices = availableArtworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p >= MIN_PLAUSIBLE_PRICE);

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
  pageUrl?: string,
  options?: {
    /** ItemList의 name 오버라이드 — 매거진 큐레이션·작가 페이지 등 컨텍스트별 명명 */
    name?: string;
    /** ItemList의 description 오버라이드 */
    description?: string;
  }
) {
  const isEnglish = locale === 'en';

  const listUrl = pageUrl ?? buildLocaleUrl('/artworks', locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${listUrl}#item-list`,
    name: options?.name ?? (isEnglish ? 'SAF Online Artworks' : '씨앗페 온라인 출품작'),
    description:
      options?.description ??
      (isEnglish ? 'Artwork list from SAF Online' : '씨앗페 온라인에 출품된 예술가들의 작품 목록'),
    numberOfItems: Math.min(artworks.length, limit),
    itemListOrder: 'https://schema.org/ItemListUnordered',
    // ItemList는 schema.org 사양상 offers 속성을 갖지 않음 — GSC가 "offers 속성은
    // ItemList 유형의 객체로 인정되지 않는 속성" 경고 (2026-05-07). AggregateOffer는
    // /artworks 등 갤러리 페이지에서 generateGalleryAggregateOffer()로 별도 JsonLdScript
    // 발행 중이므로 embedding 자체를 제거 — SEO 손실 없음.
    // /artworks 페이지 HTML 페이로드 절감 — ItemList의 각 항목에서 Offers 객체(Offer+seller) 제거.
    // 작품 detail의 Product/VisualArtwork schema에 이미 가격·재고·판매자 마크업이 풍부하므로
    // ItemList는 url+name+image만 남겨 Google Carousel rich result 자격은 유지하면서 페이로드 ~50% 절감.
    // (이전: 카드당 ~827B × 30 = 24KB → 변경 후 추정 ~12KB)
    itemListElement: artworks.slice(0, limit).map((artwork, index) => {
      const rawImg = artwork.images[0] ? resolveSeoArtworkImageUrl(artwork.images[0]) : null;
      const absImg = rawImg ? (rawImg.startsWith('http') ? rawImg : `${SITE_URL}${rawImg}`) : null;
      const artworkLocalePath = buildLocaleUrl(`/artworks/${artwork.id}`, locale);
      const artworkUrl = artworkLocalePath.startsWith('http')
        ? artworkLocalePath
        : `${SITE_URL}${artworkLocalePath}`;
      const artworkName = isEnglish && artwork.title_en ? artwork.title_en : artwork.title;
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'VisualArtwork',
          '@id': artworkUrl,
          url: artworkUrl,
          name: artworkName,
          ...(absImg && { image: absImg }),
        },
      };
    }),
  };
}
