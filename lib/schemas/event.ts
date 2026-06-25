import { SITE_URL, OG_IMAGE, EXHIBITION, CONTACT } from '@/lib/constants';
import { ARTIST_COUNT } from '@/lib/site-stats';
import {
  OH_YOON_MEMORIAL_DATE,
  OH_YOON_MEMORIAL_FEE,
  OH_YOON_MEMORIAL_PATH,
} from '@/content/events/oh-yoon-memorial';
import { ExhibitionReview } from '@/types';

export const EXHIBITION_START_DATE = '2026-01-14T10:00:00+09:00';
export const EXHIBITION_END_DATE = '2026-01-26T19:00:00+09:00';

type ExhibitionState = 'scheduled' | 'inProgress' | 'completed';

const resolveExhibitionState = (now: number = Date.now()): ExhibitionState => {
  const startTimestamp = Date.parse(EXHIBITION_START_DATE);
  const endTimestamp = Date.parse(EXHIBITION_END_DATE);

  if (now > endTimestamp) return 'completed';
  if (now >= startTimestamp) return 'inProgress';
  return 'scheduled';
};

const resolveEventStatus = (_state: ExhibitionState): string => {
  // schema.org EventStatusType enum 정식 값: EventScheduled / EventCancelled /
  // EventPostponed / EventRescheduled / EventMovedOnline. EventCompleted /
  // EventInProgress는 사양에 존재하지 않아 검사기가 "유효하지 않음" 보고.
  //
  // 우리 전시 의미 매핑: 모든 상태 → EventScheduled.
  // ⚠️ completed에 EventMovedOnline을 쓰지 말 것 (2026-06-12 감사) — 이 값은 "예정된
  // 오프라인 행사가 온라인으로 전환됨"이라는 사전 공지용 상태라, 정상 개최 후 종료된
  // 전시에 붙이면 의미 왜곡. Google 권장은 종료 행사도 EventScheduled + 과거 일자 유지.
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

export const getExhibitionSchemaState = (locale: 'ko' | 'en' = 'ko', now: number = Date.now()) => {
  const isEnglish = locale === 'en';
  const state = resolveExhibitionState(now);

  return {
    state,
    eventStatus: resolveEventStatus(state),
    eventAttendanceMode: resolveEventAttendanceMode(state),
    location: resolveEventLocation(state, isEnglish),
  };
};

export const isExhibitionCompleted = (): boolean => {
  return resolveExhibitionState() === 'completed';
};

export function generateExhibitionSchema(
  reviews: ExhibitionReview[] = [],
  locale: 'ko' | 'en' = 'ko',
  counts?: { artistCount?: number }
) {
  const isEnglish = locale === 'en';
  const hasReviews = reviews.length > 0;
  const { eventStatus, eventAttendanceMode, location } = getExhibitionSchemaState(locale);
  const artistCount = counts?.artistCount ?? ARTIST_COUNT;

  return {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    '@id': `${SITE_URL}#exhibition`,
    name: isEnglish
      ? 'SAF Online (Seed Art Festival Online)'
      : '씨앗페 온라인 (Seed Art Festival Online)',
    description: isEnglish
      ? `A special art exhibition in Seoul raising mutual-aid funds for Korean artists. Features paintings, sculptures, photography, and prints by ${artistCount} artists. Online gallery open year-round.`
      : `서울 인사동 전시회. 한국 예술인들의 상호부조 기금 마련을 위한 특별전. ${artistCount}명의 작가가 참여한 회화, 조각, 사진, 판화 등 다양한 예술 작품을 온라인에서 만나보세요.`,
    keywords: isEnglish
      ? 'Korean art exhibition, Seoul exhibition, contemporary art, exhibition catalog, art gallery Seoul'
      : '전시회, 서울 전시회, 전시회 서울, 현대미술 전시회, 전시 도록, 인사동 전시회, 전시회 일정',
    url: SITE_URL,
    image: [OG_IMAGE.url],
    startDate: EXHIBITION_START_DATE,
    endDate: EXHIBITION_END_DATE,
    eventStatus,
    eventAttendanceMode,
    location,
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
      name: isEnglish ? `${artistCount} participating artists` : `참여 예술가 ${artistCount}명`,
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

/**
 * 오윤 40주기 추도식(2026-07-05) Event 스키마.
 *
 * 씨앗페 전시(ExhibitionEvent)와 별개의 단발 오프라인 추도 행사다. Google Event rich
 * result + AI "오윤 추도식 언제/어디서/회비" 인용 대상. 페이지 자체는 좌석 실시간 조회로
 * force-dynamic이지만, 이 스키마는 정적 행사 정보(일시·집결지·회비)만 노출하므로 안전.
 * 행사 정보 단일 출처는 `content/events/oh-yoon-memorial.ts`.
 */
export function generateOhYoonMemorialEventSchema(locale: 'ko' | 'en' = 'ko') {
  const isEnglish = locale === 'en';
  const eventUrl = `${SITE_URL}${OH_YOON_MEMORIAL_PATH}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${eventUrl}#event`,
    name: isEnglish ? 'Oh Yoon 40th Anniversary Memorial' : '오윤 40주기 추도식',
    description: isEnglish
      ? 'A memorial for Oh Yoon (1946–1986), a master of Korean Minjung art, on July 5, 2026. A chartered bus departs from Insa-dong, Seoul. First-come registration.'
      : '2026년 7월 5일(일) 오윤 40주기 추도식. 인사동 출발 전세버스 동행, 선착순 참가 신청. 한국 민중미술의 거장 오윤을 기립니다.',
    // 집결 09:30 → 추도식 11:00~12:00 → 점심 13:30. 전체 종료를 14:30로 근사.
    startDate: `${OH_YOON_MEMORIAL_DATE}T09:30:00+09:00`,
    endDate: `${OH_YOON_MEMORIAL_DATE}T14:30:00+09:00`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: isEnglish
        ? 'Insa-dong (meeting & departure point)'
        : '인사동 수운회관 옆 (집결·출발지)',
      address: {
        '@type': 'PostalAddress',
        addressLocality: isEnglish ? 'Jongno-gu, Seoul' : '서울시 종로구 인사동',
        addressCountry: 'KR',
      },
    },
    image: [OG_IMAGE.url],
    url: eventUrl,
    organizer: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    about: {
      '@type': 'Person',
      name: isEnglish ? 'Oh Yoon' : '오윤',
      alternateName: isEnglish ? '오윤' : 'Oh Yoon',
      birthDate: '1946',
      deathDate: '1986',
      description: isEnglish
        ? 'A master of Korean Minjung (people’s) art, renowned for his woodcut prints.'
        : '한국 민중미술의 거장. 목판화로 시대를 기록했다.',
    },
    offers: {
      '@type': 'Offer',
      price: String(OH_YOON_MEMORIAL_FEE),
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
      url: eventUrl,
      category: isEnglish ? 'Participation fee (incl. lunch)' : '회비 (점심 포함)',
    },
    inLanguage: isEnglish ? 'en-US' : 'ko-KR',
    isAccessibleForFree: false,
  };
}
