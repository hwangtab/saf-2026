import { SITE_URL, OG_IMAGE, EXHIBITION, CONTACT } from '@/lib/constants';
import { ExhibitionReview } from '@/types';

const EXHIBITION_START_DATE = '2026-01-14T10:00:00+09:00';
const EXHIBITION_END_DATE = '2026-01-26T19:00:00+09:00';

type ExhibitionState = 'scheduled' | 'inProgress' | 'completed';

const resolveExhibitionState = (now: number = Date.now()): ExhibitionState => {
  const startTimestamp = Date.parse(EXHIBITION_START_DATE);
  const endTimestamp = Date.parse(EXHIBITION_END_DATE);

  if (now > endTimestamp) return 'completed';
  if (now >= startTimestamp) return 'inProgress';
  return 'scheduled';
};

const resolveEventStatus = (state: ExhibitionState): string => {
  if (state === 'completed') return 'https://schema.org/EventCompleted';
  if (state === 'inProgress') return 'https://schema.org/EventInProgress';
  return 'https://schema.org/EventScheduled';
};

const resolveEventAttendanceMode = (state: ExhibitionState): string => {
  return state === 'completed'
    ? 'https://schema.org/OnlineEventAttendanceMode'
    : 'https://schema.org/MixedEventAttendanceMode';
};

const resolveEventLocation = (state: ExhibitionState, isEnglish: boolean) => {
  if (state === 'completed') {
    return { '@type': 'VirtualLocation', url: SITE_URL };
  }

  return {
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
  };
};

export const isExhibitionCompleted = (): boolean => {
  return resolveExhibitionState() === 'completed';
};

export function generateExhibitionSchema(
  reviews: ExhibitionReview[] = [],
  locale: 'ko' | 'en' = 'ko'
) {
  const isEnglish = locale === 'en';
  const hasReviews = reviews.length > 0;
  const eventState = resolveExhibitionState();
  const eventStatus = resolveEventStatus(eventState);

  return {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    '@id': `${SITE_URL}#exhibition`,
    name: isEnglish
      ? 'SAF Online (Seed Art Festival Online)'
      : '씨앗페 온라인 (Seed Art Festival Online)',
    description: isEnglish
      ? 'A special art exhibition in Seoul raising mutual-aid funds for Korean artists. Features paintings, sculptures, photography, and prints by over 110 artists. Online gallery open year-round.'
      : '서울 인사동 전시회. 한국 예술인들의 상호부조 기금 마련을 위한 특별전. 110여 명의 작가가 참여한 회화, 조각, 사진, 판화 등 다양한 예술 작품을 온라인에서 만나보세요.',
    keywords: isEnglish
      ? 'Korean art exhibition, Seoul exhibition, contemporary art, exhibition catalog, art gallery Seoul'
      : '전시회, 서울 전시회, 전시회 서울, 현대미술 전시회, 전시 도록, 인사동 전시회, 전시회 일정',
    url: SITE_URL,
    image: [OG_IMAGE.url],
    startDate: EXHIBITION_START_DATE,
    endDate: EXHIBITION_END_DATE,
    eventStatus,
    eventAttendanceMode: resolveEventAttendanceMode(eventState),
    location: resolveEventLocation(eventState, isEnglish),
    organizer: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
      validFrom: EXHIBITION_START_DATE,
      url: SITE_URL,
    },
    performer: {
      '@type': 'Organization',
      name: isEnglish ? 'Over 110 participating artists' : '참여 예술가 110여 명',
    },
    isAccessibleForFree: true,
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
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
