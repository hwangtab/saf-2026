import { SITE_URL, OG_IMAGE, EXHIBITION, CONTACT } from '@/lib/constants';
import { ExhibitionReview } from '@/types';

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
    name: isEnglish
      ? 'SAF Online (Seed Art Festival Online)'
      : '씨앗페 온라인 (Seed Art Festival Online)',
    description: isEnglish
      ? 'A special exhibition raising mutual-aid funds for Korean artists, featuring paintings, sculptures, photography, and other works by over 110 artists.'
      : '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 110여 명의 작가가 참여한 회화, 조각, 사진 등 다양한 예술 작품을 만나보세요.',
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
      name: isEnglish ? 'Over 110 participating artists' : '참여 예술가 110여 명',
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
