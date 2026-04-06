import { SITE_URL, OG_IMAGE, CONTACT, EXHIBITION, CAMPAIGN, SOCIAL_LINKS } from '@/lib/constants';
import { isExhibitionCompleted } from '@/lib/schemas/event';

export function generateOrganizationSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: CONTACT.ORGANIZATION_NAME,
    legalName: CONTACT.ORGANIZATION_NAME,
    alternateName: CONTACT.ORGANIZATION_NAME_EN,
    url: SITE_URL,
    foundingDate: '2020',
    taxID: CONTACT.BUSINESS_REGISTRATION_NUMBER,
    logo: `${SITE_URL}/images/og-image2.png`,
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
      streetAddress: CONTACT.ADDRESS,
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
      ? ['contemporary art', 'Korean art', 'artist financial aid', 'mutual aid fund', 'art market']
      : ['현대미술', '한국미술', '예술인 금융지원', '상호부조 기금', '미술 시장'],
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
    '@id': `${SITE_URL}#website`,
    name: isEnglish ? 'SAF Online' : '씨앗페 온라인',
    alternateName: 'SAF Online',
    url: SITE_URL,
    description: isEnglish
      ? 'A special exhibition raising mutual-aid funds for Korean artists'
      : '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: CONTACT.ORGANIZATION_NAME,
    },
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
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/artworks?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateLocalBusinessSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'ArtGallery',
    name: isEnglish ? 'SAF Online (Seed Art Festival)' : '씨앗페 온라인 (Seed Art Festival)',
    image: OG_IMAGE.url,
    '@id': `${SITE_URL}#art-gallery`,
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
