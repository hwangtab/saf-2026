import type { Metadata } from 'next';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import KakaoMap from '@/components/features/KakaoMap';
import { EXHIBITION, EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';

const EXHIBITION_PAGE_URL = `${SITE_URL}/exhibition`;
const EXHIBITION_OG_IMAGE = `${SITE_URL}/images/saf2023/IMG_0340.png`;

export const metadata: Metadata = {
  title: '전시 안내 | 씨앗:페 2026',
  description:
    '씨앗:페 2026 전시 일정, 프로그램, 위치 정보를 확인하고 현장 후원과 작품 구매에 참여하세요.',
  alternates: {
    canonical: EXHIBITION_PAGE_URL,
  },
  openGraph: {
    title: '전시 안내 | 씨앗:페 2026',
    description:
      '씨앗:페 2026 전시 정보와 현장 프로그램을 확인하고 캠페인에 함께하세요.',
    url: EXHIBITION_PAGE_URL,
    images: [
      {
        url: EXHIBITION_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: '씨앗페 전시장에서 작품을 감상 중인 관람객들',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '씨앗:페 2026 전시 안내',
    description: '전시 일정과 프로그램, 참여 방법을 확인하세요.',
    images: [EXHIBITION_OG_IMAGE],
  },
};

export default function ExhibitionPage() {
  const canonicalUrl = EXHIBITION_PAGE_URL;
  const shareTitle = '전시 안내 | 씨앗:페 2026';
  const shareDescription = '씨앗:페 2026 전시 정보. 일시, 장소, 오시는 길, 공연 일정 안내.';

  // JSON-LD Schema for Event
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: '씨앗페 2026 - 예술인 금융 위기 해결 캠페인',
    description:
      '한국 예술인들의 금융 위기를 해결하기 위한 전시 및 공연 행사',
    startDate: '2026-01-14',
    endDate: '2026-01-27',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: '인사아트센터',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '서울시 종로구 인사동',
        addressLocality: '서울시',
        addressRegion: '종로구',
        postalCode: '03100',
        addressCountry: 'KR',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: '한국스마트협동조합',
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      price: '0',
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
    },
    image: EXHIBITION_OG_IMAGE,
    url: canonicalUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <PageHero
        title="전시 안내"
        description="씨앗:페 2026을 직접 만나보세요"
      >
        <ShareButtons url={canonicalUrl} title={shareTitle} description={shareDescription} />
      </PageHero>

      {/* Exhibition Info */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            {/* Info */}
            <div className="flex flex-col gap-8 h-full">
              <div>
                <h2 className="font-partial text-2xl mb-6">전시 정보</h2>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-watermelon text-sm text-gray-500 font-semibold mb-1">행사명</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.NAME}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-watermelon text-sm text-gray-500 font-semibold mb-1">기간</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.DATE}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-watermelon text-sm text-gray-500 font-semibold mb-1">장소</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.LOCATION}</p>
                    <p className="text-gray-600 text-sm">{EXHIBITION.ADDRESS}</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-auto space-y-3">
                <h3 className="font-watermelon text-lg font-bold mb-4">참여하기</h3>
              <div className="space-y-3">
                <a
                  href={EXTERNAL_LINKS.DONATE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-primary hover:bg-primary-strong text-charcoal font-bold px-6 py-3 rounded-lg transition-colors text-center"
                >
                  ❤️ 후원하기
                </a>
                <a
                  href={EXTERNAL_LINKS.ONLINE_GALLERY}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-lg transition-colors text-center"
                >
                  🎨 작품 구매하기
                </a>
                <div className="pt-4 text-sm text-gray-600">
                  <p>
                    문의:{' '}
                    <a
                      href="tel:027643114"
                      className="underline hover:text-primary link-underline-offset"
                    >
                      02-764-3114
                    </a>{' '}
                    /{' '}
                    <a
                      href="mailto:contact@kosmart.co.kr"
                      className="underline hover:text-primary link-underline-offset"
                    >
                      contact@kosmart.co.kr
                    </a>
                  </p>
                </div>
              </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="h-full">
              <KakaoMap className="min-h-[400px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Access Information */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-max">
          <h2 className="font-partial text-3xl mb-12">오시는 길</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="font-watermelon text-xl font-bold mb-4">🚇 대중교통</h3>
              <div className="space-y-4 text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900">지하철</p>
                  <p>
                    3호선 안국역 1번 출구에서 도보 5분<br />
                    5호선 광화문역 2번 출구에서 도보 10분
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">버스</p>
                  <p>
                    효자로 정류소 하차<br />
                    202, 703, 721, 910 등
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-watermelon text-xl font-bold mb-4">🚗 자동차</h3>
              <div className="space-y-4 text-gray-600">
                <div>
                  <p className="font-semibold text-gray-900">주소</p>
                  <p>서울시 종로구 인사동길 41-1</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">주차</p>
                  <p>
                    인사동 주변 공영주차장 이용<br />
                    (카카오맵에서 확인 가능)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <h3 className="font-watermelon font-bold mb-3">♿ 접근성 정보</h3>
            <ul className="text-gray-600 space-y-2 text-sm">
              <li>✓ 장애인 휠체어 접근 가능</li>
              <li>✓ 엘리베이터 및 휠체어 화장실 보유</li>
              <li>✓ 휠체어 사용자 주차 공간 가능</li>
              <li>
                자세한 문의:{' '}
                <a href="mailto:contact@kosmart.co.kr" className="underline hover:text-primary link-underline-offset">
                  contact@kosmart.co.kr
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <h2 className="font-partial text-3xl mb-12">행사 일정</h2>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h3 className="font-watermelon text-xl font-bold mb-4">📅 주요 일정</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 font-bold text-primary">
                    1월 14일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">개막식 & 오프닝 퍼포먼스</p>
                    <p className="text-gray-600 text-sm">
                      참여 예술인들의 개막 퍼포먼스와 캠페인 소개, 주요 후원자 라운드테이블
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 font-bold text-primary">
                    1월 15-26일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">상설 전시 & 야간 프로그램</p>
                    <p className="text-gray-600 text-sm">
                      매일 11:00-20:00 전시 운영, 저녁에는 음악/퍼포먼스 릴레이와 상호부조 상담 부스 운영
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 font-bold text-primary">
                    1월 20일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Meet the Artists 토크</p>
                    <p className="text-gray-600 text-sm">
                      참여 작가와 상호부조 대출 이용 예술인들의 라이브 토크 & 미니 콘서트
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 font-bold text-primary">
                    1월 27일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">폐막 & 모금 결산</p>
                    <p className="text-gray-600 text-sm">
                      모금 결과 공개, 후원자 감사 행사, 2026년 캠페인 계획 발표
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t">
              <h3 className="font-watermelon font-bold mb-4">📋 기본 정보</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>✓ 입장료: 무료 (후원금은 자율)</li>
                <li>✓ 개별 방문 및 단체 관람 가능</li>
                <li>
                  ✓ 단체 관람 사전 예약:{' '}
                  <a href="mailto:contact@kosmart.co.kr" className="underline hover:text-primary link-underline-offset">
                    contact@kosmart.co.kr
                  </a>
                </li>
                <li>✓ 어린이/청소년 관람 환영</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 md:py-20 bg-primary/20">
        <div className="container-max text-center">
          <h2 className="font-partial text-3xl mb-8">문의사항</h2>
          <div className="space-y-4">
            <p className="text-lg text-gray-600">
              행사와 관련하여 궁금한 점이 있으시면 아래로 연락주세요.
            </p>
            <div className="space-y-2">
              <p className="font-semibold">
                <a
                  href={EXTERNAL_LINKS.KOSMART_HOME}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  한국스마트협동조합
                </a>
              </p>
              <p>
                📧{' '}
                <a href="mailto:contact@kosmart.co.kr" className="underline hover:text-primary link-underline-offset">
                  contact@kosmart.co.kr
                </a>
              </p>
              <p>
                📞{' '}
                <a href="tel:027643114" className="underline hover:text-primary link-underline-offset">
                  02-764-3114
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
