import {
  SITE_URL,
  OG_IMAGE,
  CONTACT,
  EXHIBITION,
  CAMPAIGN,
  SOCIAL_LINKS,
  EXTERNAL_LINKS,
} from '@/lib/constants';
import { ARTIST_COUNT, ARTWORK_COUNT } from '@/lib/site-stats';
import { isExhibitionCompleted } from '@/lib/schemas/event';
import { getMediumHubSlug } from '@/lib/artwork-medium-hub';

export function generateOrganizationSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    legalName: CONTACT.ORGANIZATION_NAME,
    alternateName: isEnglish ? CONTACT.ORGANIZATION_NAME : CONTACT.ORGANIZATION_NAME_EN,
    url: SITE_URL,
    foundingDate: '2020',
    taxID: CONTACT.BUSINESS_REGISTRATION_NUMBER,
    // 정사각형 512×512 — Google Organization logo 가이드라인(112px+ 정사각 권장).
    // 과거 og-image2.png(800×400 가로 배너)는 가이드 미충족 (2026-06-12 감사).
    logo: `${SITE_URL}/images/icons/icon-512.png`,
    description: isEnglish
      ? 'Korea Smart Cooperative is a social cooperative providing mutual-aid financial services and cultural programs for Korean artists.'
      : '한국스마트협동조합은 예술인을 위한 상호부조 금융 서비스와 문화 프로그램을 제공하는 사회적 협동조합입니다.',
    sameAs: [
      SOCIAL_LINKS.INSTAGRAM,
      SOCIAL_LINKS.FACEBOOK,
      SOCIAL_LINKS.TWITTER,
      SOCIAL_LINKS.YOUTUBE,
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: isEnglish ? CONTACT.ADDRESS_EN : CONTACT.ADDRESS,
      postalCode: CONTACT.POSTAL_CODE,
      addressLocality: isEnglish ? 'Seoul' : '서울시',
      addressCountry: 'KR',
    },
    areaServed: {
      '@type': 'Country',
      name: isEnglish ? 'South Korea' : '대한민국',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    knowsAbout: isEnglish
      ? [
          'contemporary art',
          'Korean art',
          'art exhibition',
          'Seoul art exhibition',
          'exhibition catalog',
          'artist financial aid',
          'mutual aid fund',
          'art market',
        ]
      : [
          '현대미술',
          '한국미술',
          '전시회',
          '서울 전시회',
          '전시 도록',
          '예술인 금융지원',
          '상호부조 기금',
          '미술 시장',
        ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      telephone: CONTACT.PHONE,
      email: CONTACT.EMAIL,
    },
    // slogan — Knowledge Panel에 노출되는 한 줄 미션
    slogan: isEnglish
      ? 'Mutual-aid finance and cultural programs for Korean artists'
      : '한국 예술인을 위한 상호부조 금융과 문화 프로그램',
    // ethicsPolicy — 운영 보고서 페이지를 가리켜 KOSMART 투명성 검증 가능 시그널
    ethicsPolicy: `${SITE_URL}/transparency`,
    // foundingLocation — 협동조합 설립 도시 entity
    foundingLocation: {
      '@type': 'Place',
      name: isEnglish ? 'Seoul, Republic of Korea' : '대한민국 서울',
      address: {
        '@type': 'PostalAddress',
        addressLocality: isEnglish ? 'Seoul' : '서울시',
        addressCountry: 'KR',
      },
    },
    // 비영리/공익 활동 명시 — Google이 '협동조합' entity로 인식하도록 가이드
    nonprofitStatus: 'NonprofitTypeKR',
  };
}

export function generateWebsiteSchema(
  locale: 'ko' | 'en' = 'ko',
  counts?: { artistCount?: number; artworkCount?: number }
) {
  const isEnglish = locale === 'en';
  const artistCount = counts?.artistCount ?? ARTIST_COUNT;
  const artworkCount = counts?.artworkCount ?? ARTWORK_COUNT;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    name: isEnglish ? 'SAF Online' : '씨앗페 온라인',
    alternateName: 'SAF Online',
    url: SITE_URL,
    description: isEnglish
      ? `A Seoul Korean art exhibition and online gallery raising mutual-aid funds for artists. Browse and purchase ${artworkCount} contemporary artworks — paintings, prints, photography, and sculpture.`
      : `서울 한국 현대미술 전시회 온라인 갤러리. ${artistCount}명 작가의 회화·판화·사진·조각 작품을 구매하고 예술인 상호부조 기금을 함께 만들어가세요.`,
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    // 운영 주체 = publisher = 한국스마트협동조합. 별도 author 명시로 'who runs this site' 시그널 강화.
    author: {
      '@id': `${SITE_URL}#organization`,
    },
    // 사이트 audience — 한국 미술 관심층 + 잠재 컬렉터 + 예술 정책 관심층.
    audience: {
      '@type': 'PeopleAudience',
      audienceType: isEnglish
        ? 'art collectors, gallerygoers, cultural policy researchers'
        : '미술 컬렉터, 갤러리 관람객, 문화 정책 연구자',
      geographicArea: {
        '@type': 'AdministrativeArea',
        name: isEnglish ? 'Republic of Korea' : '대한민국',
        '@id': 'https://www.wikidata.org/wiki/Q884',
      },
    },
    // 사이트 copyright — 한국스마트협동조합 단체 저작권 / CC BY 4.0 데이터 부분
    copyrightHolder: { '@id': `${SITE_URL}#organization` },
    copyrightYear: 2020,
    // hasPart — 주요 sub-collection. Knowledge Graph에서 site → /artworks·/stories·/news 구조 인지.
    hasPart: [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/artworks#webpage`,
        url: `${SITE_URL}/artworks`,
        name: isEnglish ? 'Artworks Gallery' : '작품 갤러리',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/stories#webpage`,
        url: `${SITE_URL}/stories`,
        name: isEnglish ? 'SAF Magazine' : '씨앗페 매거진',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/news#collection`,
        url: `${SITE_URL}/news`,
        name: isEnglish ? 'Press' : '언론 보도',
      },
      {
        '@type': 'AboutPage',
        '@id': `${SITE_URL}/about#webpage`,
        url: `${SITE_URL}/about`,
        name: isEnglish ? 'About SAF' : '씨앗페 소개',
      },
      {
        '@type': 'AboutPage',
        '@id': `${SITE_URL}/our-reality#webpage`,
        url: `${SITE_URL}/our-reality`,
        name: isEnglish ? 'Our Reality' : '우리의 현실',
      },
      {
        '@type': 'AboutPage',
        '@id': `${SITE_URL}/our-proof#webpage`,
        url: `${SITE_URL}/our-proof`,
        name: isEnglish ? 'Our Proof' : '우리의 증명',
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/transparency#webpage`,
        url: `${SITE_URL}/transparency`,
        name: isEnglish ? 'Transparency Reports' : '운용 보고서',
      },
    ],
    // publishingPrinciples — 운영 보고서 페이지가 사이트의 editorial/data publication principles 노출.
    publishingPrinciples: `${SITE_URL}/transparency`,
    // disambiguatingDescription — SAF Online vs SAF (Singapore Art Fair 등) Knowledge Graph entity 식별
    disambiguatingDescription: isEnglish
      ? 'A Seoul-based online art exhibition platform raising mutual-aid funds for Korean artists. Operated by Korea Smart Cooperative (한국스마트협동조합).'
      : '한국스마트협동조합이 운영하는 서울 기반 한국 예술인 상호부조 기금 마련 온라인 전시 플랫폼.',
    // Accessibility metadata for AEO/GEO
    accessibilityFeature: [
      'alternativeText',
      'highContrastDisplay',
      'largePrint',
      'readingOrder',
      'structuralNavigation',
      'tableOfContents',
    ],
    accessibilityHazard: 'none',
    accessMode: ['textual', 'visual'],
    accessModeSufficient: [{ '@type': 'ItemList', itemListElement: ['textual'] }],
    // Sitelinks Searchbox: 브랜드 검색 결과에서 직접 작품/작가 검색 가능
    // 2종: 작품(/artworks?q=)과 매거진(/stories?q=) — Google이 컨텍스트별 매칭 선택
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/artworks?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      {
        '@type': 'ViewAction',
        name: isEnglish ? 'Browse all artists' : '참여 작가 전체 보기',
        target: `${SITE_URL}/artworks/artist`,
      },
    ],
    // mainEntity — 매체 매거진 hub 4편. WebSite 전체와 매체 hub의 schema-level entity 연결.
    // Sprint 38(Homepage WebPage.about)이 root page 1개에만 적용된다면 이 필드는 모든
    // WebSite 발행 페이지에서 노출되므로 KG entity 시그널 site-wide 영향.
    mainEntity: (() => {
      const items: Array<{
        '@type': 'CreativeWork';
        '@id': string;
        url: string;
        name: string;
      }> = [];
      const mapping: Array<[string, string]> = [
        ['회화', isEnglish ? 'Painting guide' : '회화 가이드'],
        ['판화', isEnglish ? 'Printmaking guide' : '판화 가이드'],
        ['사진', isEnglish ? 'Photography guide' : '사진 가이드'],
        ['조각', isEnglish ? 'Sculpture guide' : '조각 가이드'],
      ];
      for (const [cat, name] of mapping) {
        const slug = getMediumHubSlug(cat);
        if (!slug) continue;
        items.push({
          '@type': 'CreativeWork',
          '@id': `${SITE_URL}/stories/${slug}#about`,
          url: `${SITE_URL}/stories/${slug}`,
          name,
        });
      }
      return items;
    })(),
  };
}

export function generateLocalBusinessSchema(
  locale: 'ko' | 'en' = 'ko',
  counts?: { artistCount?: number; artworkCount?: number }
) {
  const isEnglish = locale === 'en';
  const artistCount = counts?.artistCount ?? ARTIST_COUNT;
  const artworkCount = counts?.artworkCount ?? ARTWORK_COUNT;
  return {
    '@context': 'https://schema.org',
    // OnlineStore 추가: Google Shopping 호환성 + 온라인 판매 명시
    '@type': ['ArtGallery', 'OnlineStore'],
    name: isEnglish ? 'SAF Online (Seed Art Festival)' : '씨앗페 온라인 (Seed Art Festival)',
    image: OG_IMAGE.url,
    '@id': `${SITE_URL}#art-gallery`,
    url: SITE_URL,
    telephone: CONTACT.PHONE,
    email: CONTACT.EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: isEnglish ? EXHIBITION.ADDRESS_EN : EXHIBITION.ADDRESS,
      postalCode: EXHIBITION.POSTAL_CODE,
      addressLocality: isEnglish ? 'Seoul' : '서울시',
      addressCountry: 'KR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: EXHIBITION.LAT,
      longitude: EXHIBITION.LNG,
    },
    ...(isExhibitionCompleted()
      ? {}
      : {
          openingHoursSpecification: [
            {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday',
              ],
              opens: '10:00',
              closes: '19:00',
              validFrom: CAMPAIGN.START_DATE,
              validThrough: CAMPAIGN.END_DATE,
            },
          ],
        }),
    priceRange: '₩50,000 ~ ₩20,000,000',
    currenciesAccepted: 'KRW',
    paymentAccepted: isEnglish
      ? 'Cash, Credit Card, Debit Card, Bank Transfer'
      : '현금, 신용카드, 체크카드, 계좌이체',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: isEnglish ? 'SAF Online Exhibition Catalog' : '씨앗페 온라인 전시 도록',
      description: isEnglish
        ? `${artworkCount} original artworks by ${artistCount} Korean artists — the official digital exhibition catalog`
        : `${artistCount}명 작가의 ${artworkCount}점 작품 — 씨앗페 온라인 공식 전시 도록`,
      url: `${SITE_URL}/artworks`,
    },
    hasMap: EXTERNAL_LINKS.KOSMART_OFFICE_MAP,
    // entity graph: #art-gallery is operated by #organization
    parentOrganization: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
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
    alternateName: 'SAF Online Artist Mutual Aid Fund',
    description: isEnglish
      ? 'A special campaign raising mutual-aid funds to help Korean artists avoid predatory lending and build financial stability through artwork purchases.'
      : '한국 예술인들의 고리대금 문제 해결을 위한 상호부조 기금 마련 특별 캠페인. 작품 구매를 통해 예술인들의 금융 자립을 지원합니다.',
    url: SITE_URL,
    funder: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    // schema.org FundingScheme은 Intangible 계열이라 isAccessibleForFree
    // (CreativeWork 전용)와 audience(CreativeWork/Service 전용) 속성을 인정하지
    // 않음. GSC schema 검사기가 두 속성 모두 경고로 보고. 단순 제거가 정답.
    // FundingScheme의 의도(audience: 미술 컬렉터·예술 후원자)는 description의
    // "작품 구매를 통해 예술인들의 금융 자립을 지원" 자체에 이미 함의됨.
  };
}
