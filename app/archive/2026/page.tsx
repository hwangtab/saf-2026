import type { Metadata } from 'next';
import ExportedImage from 'next-image-export-optimizer';
import Button from '@/components/ui/Button';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import dynamic from 'next/dynamic';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { BREADCRUMB_HOME, EXHIBITION, EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import { getSupabaseReviews } from '@/lib/supabase-data';
import { createPageMetadata } from '@/lib/seo';
import {
  escapeJsonLdForScript,
  generateExhibitionSchema,
  createBreadcrumbSchema,
} from '@/lib/seo-utils';

// Dynamically import KakaoMap (client-side only, reduces initial bundle)
import ExhibitionMapWrapper from '@/components/features/ExhibitionMapWrapper';

const ShareButtons = dynamic(() => import('@/components/common/ShareButtons'));

const PAGE_URL = `${SITE_URL}/archive/2026`;

export const metadata: Metadata = createPageMetadata(
  '2026 오프라인 전시 기록',
  '인사아트센터에서 진행된 씨앗페 2026 오프라인 전시의 기록입니다.',
  '/archive/2026'
);

export default async function Archive2026Page() {
  const exhibitionReviews = await getSupabaseReviews();
  const canonicalUrl = PAGE_URL;
  const shareTitle = '2026 오프라인 전시 기록 | 씨앗페 2026';
  const shareDescription =
    '씨앗페 2026 오프라인 전시의 기록. 인사아트센터에서의 뜨거웠던 연대의 현장.';

  // JSON-LD Schema for Event
  const eventSchema = generateExhibitionSchema(exhibitionReviews);
  const breadcrumbSchema = createBreadcrumbSchema([
    BREADCRUMB_HOME,
    { name: '2026 오프라인 전시', url: '/archive/2026' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonLdForScript(JSON.stringify(eventSchema)) }}
      />
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="2026 오프라인 전시"
        description="인사아트센터에서 진행된 12일간의 기록"
        dividerColor="text-red-50"
      >
        <ShareButtons url={canonicalUrl} title={shareTitle} description={shareDescription} />
      </PageHero>

      <Section variant="white" className="bg-red-50">
        <div className="container-max text-center">
          <p className="text-lg font-bold text-primary">
            🚫 본 오프라인 전시는 2026년 1월 26일에 종료되었습니다.
          </p>
          <p className="text-charcoal-muted mt-2">현재는 온라인 전시 및 작품 구매만 가능합니다.</p>
        </div>
      </Section>

      {/* Exhibition Info */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-8">지난 전시 정보</SectionTitle>

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
                    href={EXTERNAL_LINKS.JOIN_MEMBER}
                    external
                    variant="accent"
                    className="w-full relative"
                    size="md"
                  >
                    <span aria-hidden="true" className="absolute left-8">
                      🤝
                    </span>
                    <span className="text-center">조합원 가입하기</span>
                  </Button>
                  <Button
                    href="/artworks"
                    variant="secondary"
                    className="w-full relative"
                    size="md"
                  >
                    <span aria-hidden="true" className="absolute left-8">
                      🎨
                    </span>
                    <span className="text-center">작품 구매하기</span>
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
              <h3 className="text-card-title mb-4">
                <span aria-hidden="true">🚇</span> 대중교통
              </h3>
              <div className="space-y-4 text-charcoal-muted">
                <div>
                  <p className="font-semibold text-charcoal">지하철</p>
                  <p>
                    {EXHIBITION.ACCESS.SUBWAY.map((s, i) => (
                      <span key={s.line}>
                        {s.line} {s.exit}에서 {s.walk}
                        {i < EXHIBITION.ACCESS.SUBWAY.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-charcoal">버스</p>
                  <p>
                    {EXHIBITION.ACCESS.BUS.stop} 하차
                    <br />
                    {EXHIBITION.ACCESS.BUS.lines}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-card-title mb-4">
                <span aria-hidden="true">🚗</span> 자동차
              </h3>
              <div className="space-y-4 text-charcoal-muted">
                <div>
                  <p className="font-semibold text-charcoal">주소</p>
                  <p>{EXHIBITION.ADDRESS}</p>
                </div>
                <div>
                  <p className="font-semibold text-charcoal">주차</p>
                  <p>{EXHIBITION.ACCESS.PARKING}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <h3 className="text-card-title mb-3">
              <span aria-hidden="true">♿</span> 접근성 정보
            </h3>
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
                    <p className="text-charcoal-muted text-sm">매일 11:00-19:00 전시 운영</p>
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

      {/* Guestbook / Review Section for SEO & Social Proof */}
      <Section variant="white" prevVariant="gray">
        <div className="container-max">
          <SectionTitle className="mb-12">관람객 응원 메시지</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exhibitionReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-canvas-soft p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={i < Math.floor(rev.rating) ? 'text-sun' : 'text-gray-300'}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  ))}
                  <span className="sr-only">평점 {rev.rating}점</span>
                </div>
                <blockquote className="flex-1">
                  <p className="text-charcoal leading-relaxed mb-6 italic before:content-['“'] after:content-['”']">
                    {rev.comment}
                  </p>
                </blockquote>
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div>
                    <span className="font-bold text-gray-900 block">{rev.author}</span>
                    <span className="text-xs text-charcoal-muted">{rev.role}</span>
                  </div>
                  <time className="text-xs text-gray-400" dateTime={rev.date}>
                    {rev.date}
                  </time>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-charcoal-muted">
              현장에 비치된 방명록에서 더 많은 응원의 목소리를 확인하실 수 있습니다.
            </p>
          </div>
        </div>
      </Section>
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
