import type { Metadata } from 'next';
import ExportedImage from 'next-image-export-optimizer';
import Button from '@/components/ui/Button';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtons from '@/components/common/ShareButtons';
import { EXHIBITION, EXTERNAL_LINKS, SITE_URL, OG_IMAGE } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { escapeJsonLdForScript } from '@/lib/seo-utils';

// Dynamically import KakaoMap (client-side only, reduces initial bundle)
import ExhibitionMapWrapper from '@/components/features/ExhibitionMapWrapper';

const PAGE_URL = `${SITE_URL}/exhibition`;

export const metadata: Metadata = createPageMetadata(
  '전시 안내',
  '100여명 예술가들의 작품이 전시되는 인사아트센터. 1월 14일부터 26일까지, 예술과 연대가 만나는 현장에 초대합니다.',
  '/exhibition'
);

export default function ExhibitionPage() {
  const canonicalUrl = PAGE_URL;
  const shareTitle = '전시 안내 | 씨앗페 2026';
  const shareDescription = '씨앗페 2026 전시 정보. 일시, 장소, 오시는 길, 공연 일정 안내.';

  // JSON-LD Schema for Event
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: '씨앗페 2026 - 예술인 금융 위기 해결 캠페인',
    isAccessibleForFree: true,
    description: '한국 예술인들의 금융 위기를 해결하기 위한 전시 및 공연 행사',
    startDate: '2026-01-14',
    endDate: '2026-01-26',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: '인사아트센터 3층 G&J 갤러리',
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
    image: OG_IMAGE.url,
    url: canonicalUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLdForScript(JSON.stringify(eventSchema)) }}
      />
      <PageHero title="전시 안내" description="씨앗페 2026을 직접 만나보세요">
        <ShareButtons url={canonicalUrl} title={shareTitle} description={shareDescription} />
      </PageHero>

      {/* Exhibition Info */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-8">전시 정보</SectionTitle>

          {/* Poster - Full Width */}
          <div className="mb-12">
            <ExportedImage
              src="/images/safposter.png"
              alt="씨앗페 2026 공식 포스터"
              width={1200}
              height={1700}
              className="w-full rounded-2xl shadow-xl"
              priority
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            {/* Info */}
            <div className="flex flex-col gap-8 h-full">
              <div>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-sans font-bold text-sm text-charcoal-muted mb-1">행사명</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.NAME}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-sans font-bold text-sm text-charcoal-muted mb-1">기간</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.DATE}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-sans font-bold text-sm text-charcoal-muted mb-1">장소</h3>
                    <p className="text-lg font-semibold">{EXHIBITION.LOCATION}</p>
                    <p className="text-charcoal-muted text-sm">{EXHIBITION.ADDRESS}</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-auto space-y-3">
                <h3 className="text-card-title mb-4">참여하기</h3>
                <div className="space-y-3">
                  <Button
                    href={EXTERNAL_LINKS.DONATE}
                    external
                    variant="accent"
                    className="w-full"
                    size="md"
                  >
                    ❤️ 후원하기
                  </Button>
                  <Button href="/artworks" variant="secondary" className="w-full" size="md">
                    🎨 작품 구매하기
                  </Button>
                  <div className="pt-4 text-sm text-charcoal-muted">
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
                        href="mailto:contact@kosmart.org"
                        className="underline hover:text-primary link-underline-offset"
                      >
                        contact@kosmart.org
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="h-full">
              <ExhibitionMapWrapper className="min-h-[400px]" />
            </div>
          </div>
        </div>
      </Section>

      {/* Access Information */}
      <Section variant="accent-soft" prevVariant="primary-surface">
        <div className="container-max">
          <SectionTitle className="mb-12">오시는 길</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-card-title mb-4">🚇 대중교통</h3>
              <div className="space-y-4 text-charcoal-muted">
                <div>
                  <p className="font-semibold text-charcoal">지하철</p>
                  <p>
                    3호선 안국역 1번 출구에서 도보 5분
                    <br />
                    5호선 광화문역 2번 출구에서 도보 10분
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-charcoal">버스</p>
                  <p>
                    효자로 정류소 하차
                    <br />
                    202, 703, 721, 910 등
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-card-title mb-4">🚗 자동차</h3>
              <div className="space-y-4 text-charcoal-muted">
                <div>
                  <p className="font-semibold text-charcoal">주소</p>
                  <p>서울시 종로구 인사동길 41-1</p>
                </div>
                <div>
                  <p className="font-semibold text-charcoal">주차</p>
                  <p>
                    인사동 주변 공영주차장 이용
                    <br />
                    (카카오맵에서 확인 가능)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <h3 className="text-card-title mb-3">♿ 접근성 정보</h3>
            <ul className="text-charcoal-muted space-y-2 text-sm">
              <li>✓ 장애인 휠체어 접근 가능</li>
              <li>✓ 엘리베이터 및 휠체어 화장실 보유</li>
              <li>✓ 휠체어 사용자 주차 공간 가능</li>
              <li>
                자세한 문의:{' '}
                <a
                  href="mailto:contact@kosmart.org"
                  className="underline hover:text-primary link-underline-offset"
                >
                  contact@kosmart.org
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Schedule Section */}
      <Section variant="gray" prevVariant="accent-soft">
        <div className="container-max">
          <SectionTitle className="mb-12">행사 일정</SectionTitle>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <h3 className="text-card-title mb-4">📅 주요 일정</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 font-bold text-primary">1월 14일</div>
                  <div className="flex-1">
                    <p className="font-semibold">개막식 & 오프닝 퍼포먼스</p>
                    <p className="text-charcoal-muted text-sm">
                      참여 예술인들의 개막 퍼포먼스와 캠페인 소개, 주요 후원자 라운드테이블
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 font-bold text-primary">1월 15-26일</div>
                  <div className="flex-1">
                    <p className="font-semibold">상설 전시</p>
                    <p className="text-charcoal-muted text-sm">매일 11:00-20:00 전시 운영</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t">
              <h3 className="text-card-title mb-4">📋 기본 정보</h3>
              <ul className="text-charcoal-muted space-y-2 text-sm">
                <li>✓ 입장료: 무료 (후원금은 자율)</li>
                <li>✓ 개별 방문 및 단체 관람 가능</li>
                <li>
                  ✓ 단체 관람 사전 예약:{' '}
                  <a
                    href="mailto:contact@kosmart.org"
                    className="underline hover:text-primary link-underline-offset"
                  >
                    contact@kosmart.org
                  </a>
                </li>
                <li>✓ 어린이/청소년 관람 환영</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Contact Section */}
      <Section variant="primary-soft" prevVariant="gray" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <SectionTitle className="mb-8">문의사항</SectionTitle>
          <div className="space-y-4">
            <p className="text-lg text-charcoal-muted">
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
                <a
                  href="mailto:contact@kosmart.org"
                  className="underline hover:text-primary link-underline-offset"
                >
                  contact@kosmart.org
                </a>
              </p>
              <p>
                📞{' '}
                <a
                  href="tel:027643114"
                  className="underline hover:text-primary link-underline-offset"
                >
                  02-764-3114
                </a>
              </p>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
