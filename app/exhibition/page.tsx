import type { Metadata } from 'next';
import PageHero from '@/components/ui/PageHero';
import KakaoMap from '@/components/features/KakaoMap';
import { EXHIBITION, EXTERNAL_LINKS } from '@/lib/constants';

export const metadata: Metadata = {
  title: '전시 안내 | 씨앗:페 2026',
  description:
    '씨앗:페 2026 전시 정보. 일시, 장소, 오시는 길, 공연 일정 안내.',
  openGraph: {
    title: '전시 안내 | 씨앗:페 2026',
    description:
      '씨앗:페 2026 전시 정보. 일시, 장소, 오시는 길, 공연 일정 안내.',
    url: 'https://saf2026.org/exhibition',
    images: ['/images/og-image.png'],
  },
};

export default function ExhibitionPage() {
  // JSON-LD Schema for Event
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: '씨앗페 2026 - 예술인 금융 위기 해결 캠페인',
    description:
      '한국 예술인들의 금융 위기를 해결하기 위한 전시 및 공연 행사',
    startDate: '2026-11-15',
    endDate: '2026-12-30',
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
      url: 'https://saf2026.org',
    },
    offers: {
      '@type': 'Offer',
      url: 'https://saf2026.org/exhibition',
      price: '0',
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
    },
    image: 'https://saf2026.org/images/og-image.png',
    url: 'https://saf2026.org/exhibition',
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
      />

      {/* Exhibition Info */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">전시 정보</h2>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="text-sm text-gray-500 font-semibold mb-1">행사명</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.NAME}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="text-sm text-gray-500 font-semibold mb-1">기간</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.DATE}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="text-sm text-gray-500 font-semibold mb-1">장소</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.LOCATION}</p>
                    <p className="text-gray-600 text-sm">{EXHIBITION.ADDRESS}</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-lg font-bold mb-4">참여하기</h3>
                <div className="space-y-3">
                  <a
                    href={EXTERNAL_LINKS.DONATE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-primary hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors text-center"
                  >
                    ❤️ 후원하기
                  </a>
                  <a
                    href={EXTERNAL_LINKS.ONLINE_GALLERY}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-lg transition-colors text-center"
                  >
                    🎨 온라인 갤러리
                  </a>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div>
              <KakaoMap />
              <a
                href={EXTERNAL_LINKS.INSA_GALLERY_KAKAO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-6 py-3 rounded-lg transition-colors"
              >
                카카오맵에서 보기
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Access Information */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12">오시는 길</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-xl font-bold mb-4">🚇 대중교통</h3>
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
              <h3 className="text-xl font-bold mb-4">🚗 자동차</h3>
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
            <h3 className="font-bold mb-3">♿ 접근성 정보</h3>
            <ul className="text-gray-600 space-y-2 text-sm">
              <li>✓ 장애인 휠체어 접근 가능</li>
              <li>✓ 엘리베이터 및 휠체어 화장실 보유</li>
              <li>✓ 휠체어 사용자 주차 공간 가능</li>
              <li>자세한 문의: contact@kosmart.co.kr</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12">행사 일정</h2>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">📅 주요 일정</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 font-bold text-primary">
                    11월 15일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">개막식 & 오픈닝 공연</p>
                    <p className="text-gray-600 text-sm">
                      참여 예술인들의 축하 공연
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 font-bold text-primary">
                    11월 15-30일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">전시 및 공연</p>
                    <p className="text-gray-600 text-sm">
                      참여 예술가의 작품 전시와 정기 공연
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 font-bold text-primary">
                    12월 1일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">고도화 프로젝트 시작</p>
                    <p className="text-gray-600 text-sm">
                      영상 아카이브, 추가 공연 등
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 font-bold text-primary">
                    12월 30일
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">폐막</p>
                    <p className="text-gray-600 text-sm">
                      마지막 행사 및 감사 메시지
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t">
              <h3 className="font-bold mb-4">📋 기본 정보</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>✓ 입장료: 무료 (후원금은 자율)</li>
                <li>✓ 개별 방문 및 단체 관람 가능</li>
                <li>✓ 단체 관람 사전 예약: contact@kosmart.co.kr</li>
                <li>✓ 어린이/청소년 관람 환영</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 md:py-20 bg-primary/20">
        <div className="container-max text-center">
          <h2 className="text-3xl font-bold mb-8">문의사항</h2>
          <div className="space-y-4">
            <p className="text-lg text-gray-600">
              행사와 관련하여 궁금한 점이 있으시면 아래로 연락주세요.
            </p>
            <div className="space-y-2">
              <p className="font-semibold">한국스마트협동조합</p>
              <p>📧 contact@kosmart.co.kr</p>
              <p>📞 02-764-3114</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
