import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import ExportedImage from 'next-image-export-optimizer';
import LinkButton from '@/components/ui/LinkButton';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { CONTACT, EXHIBITION, EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import { getSupabaseReviews } from '@/lib/supabase-data';
import {
  generateExhibitionSchema,
  createBreadcrumbSchema,
  generateExhibitionEnjoyHowTo,
} from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';

// Dynamically import KakaoMap (client-side only, reduces initial bundle)
import ExhibitionMapWrapper from '@/components/features/ExhibitionMapWrapper';

export const revalidate = 3600;

const PAGE_URL = `${SITE_URL}/archive/2026`;
const PAGE_COPY = {
  ko: {
    title: '2026 오프라인 전시 기록',
    description:
      '서울 인사동 전시회 기록. 2026년 1월 14일~26일 인사아트센터에서 열린 씨앗페 전시 일정·포스터·도록을 확인하세요. 127명 작가의 127점 작품, 12일간의 전시 현장과 관람객 후기.',
  },
  en: {
    title: '2026 Offline Exhibition Archive',
    description:
      'SAF 2026 Seoul exhibition records: January 14–26 at Insa Art Center. Browse the exhibition poster, catalog, and visitor reviews for 127 artworks by 127 artists.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  return {
    ...createStandardPageMetadata(title, copy.description, PAGE_URL, '/archive/2026', locale),
    keywords:
      locale === 'en'
        ? 'SAF 2026 exhibition, Seoul exhibition, Insa Art Center, Korean art exhibition, exhibition catalog, exhibition poster, exhibition schedule, artist mutual aid, SAF Online'
        : '전시회 서울, 서울 전시회, 전시회 일정, 인사동 전시회, 전시회 포스터, 전시회 도록, 씨앗페 2026, 인사아트센터, 씨앗페 오프라인 전시, 서울 미술 전시',
  };
}

export default async function Archive2026Page() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl('/archive/2026', locale);
  const archiveUrl = buildLocaleUrl('/archive', locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const exhibitionReviews = await getSupabaseReviews();
  const canonicalUrl = pageUrl;
  const shareTitle =
    locale === 'en'
      ? '2026 Offline Exhibition Archive | SAF 2026'
      : '2026 오프라인 전시 기록 | 씨앗페 2026';
  const shareDescription =
    locale === 'en'
      ? 'Records from the SAF 2026 offline exhibition at Insa Art Center.'
      : '씨앗페 2026 오프라인 전시의 기록. 인사아트센터에서의 뜨거웠던 연대의 현장.';
  const exhibitionSummary =
    locale === 'en'
      ? {
          name: 'SAF 2026',
          date: 'January 14, 2026 - January 26, 2026',
          venue: 'Insa Art Center, 3F G&J Gallery',
          address: '41-1, Insadong-gil, Jongno-gu, Seoul',
        }
      : {
          name: EXHIBITION.NAME,
          date: EXHIBITION.DATE,
          venue: EXHIBITION.LOCATION,
          address: EXHIBITION.ADDRESS,
        };

  // JSON-LD Schema for Event
  const eventSchema = generateExhibitionSchema(exhibitionReviews, locale);
  const howToSchema = generateExhibitionEnjoyHowTo(locale);
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('archive'), url: archiveUrl },
    { name: tBreadcrumbs('archive2026'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name:
      locale === 'en'
        ? '2026 Offline Exhibition Archive | SAF 2026'
        : '2026 오프라인 전시 기록 | 씨앗페 2026',
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: { '@id': `${SITE_URL}#exhibition` },
    datePublished: '2026-01-26',
    dateModified: '2026-03-15',
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
  };

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={[eventSchema, breadcrumbSchema, webPageSchema, howToSchema]} />
        <PageHero
          title="2026 Offline Exhibition"
          description="A 12-day exhibition record at Insa Art Center"
          dividerColor="text-red-50"
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={canonicalUrl}
            title={shareTitle}
            description={shareDescription}
          />
        </PageHero>

        <Section variant="red">
          <div className="container-max text-center">
            <p className="text-lg font-bold text-primary">
              🚫 This offline exhibition ended on January 26, 2026.
            </p>
            <p className="text-charcoal-muted mt-2">
              Online exhibition and artwork purchase are currently available.
            </p>
          </div>
        </Section>

        <Section variant="primary-surface" prevVariant="red">
          <div className="container-max">
            <SectionTitle className="mb-8">Exhibition overview</SectionTitle>
            <div className="mb-12">
              <ExportedImage
                src="/images/safposter.png"
                alt="SAF 2026 official poster"
                width={1200}
                height={1700}
                className="w-full rounded-2xl shadow-xl"
                priority
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
              <div className="flex flex-col gap-8 h-full">
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-sans font-bold text-sm text-charcoal-muted mb-1">Event</h3>
                    <p className="text-lg font-semibold">{exhibitionSummary.name}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-sans font-bold text-sm text-charcoal-muted mb-1">Date</h3>
                    <p className="text-lg font-semibold">{exhibitionSummary.date}</p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h3 className="font-sans font-bold text-sm text-charcoal-muted mb-1">Venue</h3>
                    <p className="text-lg font-semibold">{exhibitionSummary.venue}</p>
                    <p className="text-charcoal-muted text-sm">{exhibitionSummary.address}</p>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  <h3 className="text-card-title mb-4">Participate</h3>
                  <LinkButton
                    href={EXTERNAL_LINKS.JOIN_MEMBER}
                    external
                    variant="accent"
                    className="w-full"
                    size="md"
                    leadingIcon="🤝"
                    iconLayout="fixed-left"
                  >
                    Join as a member
                  </LinkButton>
                  <LinkButton
                    href="/artworks"
                    variant="secondary"
                    className="w-full"
                    size="md"
                    leadingIcon="🎨"
                    iconLayout="fixed-left"
                  >
                    Buy artworks
                  </LinkButton>
                </div>
              </div>

              <div className="h-full">
                <ExhibitionMapWrapper className="min-h-[400px]" />
              </div>
            </div>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <JsonLdScript data={[eventSchema, breadcrumbSchema, howToSchema]} />
      <PageHero
        title="2026 오프라인 전시"
        description="인사아트센터에서 진행된 12일간의 기록"
        dividerColor="text-red-50"
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper url={canonicalUrl} title={shareTitle} description={shareDescription} />
      </PageHero>

      <Section variant="red">
        <div className="container-max text-center">
          <p className="text-lg font-bold text-primary">
            🚫 본 오프라인 전시는 2026년 1월 26일에 종료되었습니다.
          </p>
          <p className="text-charcoal-muted mt-2">현재는 온라인 전시 및 작품 구매만 가능합니다.</p>
        </div>
      </Section>

      {/* Exhibition Info */}
      <Section variant="primary-surface" prevVariant="red">
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
                  <LinkButton
                    href={EXTERNAL_LINKS.JOIN_MEMBER}
                    external
                    variant="accent"
                    className="w-full"
                    size="md"
                    leadingIcon="🤝"
                    iconLayout="fixed-left"
                  >
                    조합원 가입하기
                  </LinkButton>
                  <LinkButton
                    href="/artworks"
                    variant="secondary"
                    className="w-full"
                    size="md"
                    leadingIcon="🎨"
                    iconLayout="fixed-left"
                  >
                    작품 구매하기
                  </LinkButton>
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
      <Section variant="primary-soft" prevVariant="white" className="pb-24 md:pb-32">
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
