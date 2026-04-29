import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import SectionTitle from '@/components/ui/SectionTitle';
import StatCard from '@/components/ui/StatCard';
import CTAButtonGroup from '@/components/common/CTAButtonGroup';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { SITE_URL, EXTERNAL_LINKS } from '@/lib/constants';
import { ARTIST_COUNT, ARTWORK_COUNT, LOAN_COUNT } from '@/lib/site-stats';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { Link } from '@/i18n/navigation';

export const revalidate = false;

const PAGE_URL = `${SITE_URL}/about`;
const PAGE_COPY = {
  ko: {
    title: `씨앗페 소개 · 예술인 상호부조 캠페인 | ${ARTIST_COUNT}명 작가, ${LOAN_COUNT}건 대출`,
    description: `씨앗페는 금융 차별에 맞서는 예술인 상호부조 캠페인입니다. ${ARTIST_COUNT}명의 연대 작가, ${LOAN_COUNT}건의 저금리 대출, 95%의 상환율 — 작품이 금융이 되는 구조를 소개합니다.`,
  },
  en: {
    title: 'About SAF · Mutual-Aid Campaign for Korean Artists',
    description: `SAF is a mutual-aid campaign against financial discrimination toward Korean artists. ${ARTIST_COUNT} solidarity artists, ${LOAN_COUNT} low-interest loans, 95% repayment — art becomes finance.`,
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const base = createStandardPageMetadata(copy.title, copy.description, PAGE_URL, '/about', locale);
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'website',
    },
  };
}

export default async function AboutPage() {
  const locale = resolveLocale(await getLocale());
  const pageCopy = PAGE_COPY[locale];
  const pageUrl = buildLocaleUrl('/about', locale);

  const breadcrumbItems = [
    { name: locale === 'en' ? 'Home' : '홈', url: buildLocaleUrl('/', locale) },
    { name: pageCopy.title, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const aboutPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: pageCopy.title,
    description: pageCopy.description,
    url: pageUrl,
    mainEntity: {
      '@type': 'Organization',
      name: locale === 'en' ? 'Korea Smart Cooperative' : '한국스마트협동조합',
    },
  };

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={[breadcrumbSchema, aboutPageSchema]} />
        <PageHero
          title="About SAF"
          description="Art that funds. A campaign that proves trust-based finance works for artists."
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={PAGE_URL}
            title="About SAF — SAF Online"
            description="Learn how SAF turns art sales into low-interest loans for Korean artists facing financial exclusion."
          />
        </PageHero>

        {/* Problem statement */}
        <Section variant="white">
          <div className="container-max">
            <div className="max-w-3xl mx-auto text-balance">
              <SectionTitle className="mb-8">The problem we solve</SectionTitle>
              <div className="space-y-6 text-lg text-charcoal">
                <p>
                  Korean artists live on irregular, project-based income. Between exhibitions and
                  commissions, there are <strong>&ldquo;income gaps&rdquo;</strong> — months where
                  rent, food, and material costs keep running but revenue stops.
                </p>
                <p>
                  Banks see &ldquo;no steady paycheck&rdquo; and close the door.{' '}
                  <strong className="text-primary-strong">84.9%</strong> of artists are excluded
                  from mainstream banking. <strong className="text-primary-strong">48.6%</strong>{' '}
                  are pushed into predatory lending at 15%+ annual interest.
                </p>
                <p>
                  This is not a personal failure. It is a <strong>structural crisis</strong> — and
                  SAF exists to break it.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Key stats */}
        <Section variant="primary-surface" prevVariant="white">
          <div className="container-max">
            <SectionTitle className="mb-12">SAF by the numbers</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <StatCard value="127" label="Solidarity artists" variant="highlight" />
              <StatCard value="354" label="Loans funded" variant="highlight" />
              <StatCard value="~₩700M" label="Total deployed" variant="highlight" />
              <StatCard value="95%" label="Repayment rate" variant="highlight" />
            </div>
          </div>
        </Section>

        {/* How it works */}
        <Section variant="white" prevVariant="primary-surface">
          <div className="container-max">
            <SectionTitle className="mb-12">How SAF works</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: '01',
                  icon: '🤝',
                  label: 'Artists unite',
                  desc: `${ARTIST_COUNT} artists voluntarily contribute works to the exhibition — not as victims, but as allies standing with peers.`,
                },
                {
                  step: '02',
                  icon: '🖼️',
                  label: 'Art is sold',
                  desc: 'Works are sold through the SAF online gallery. Every purchase directly funds the mutual-aid reserve.',
                },
                {
                  step: '03',
                  icon: '🏦',
                  label: 'Fund grows',
                  desc: 'Sales revenue joins cooperative membership fees and solidarity contributions to build a shared reserve.',
                },
                {
                  step: '04',
                  icon: '💰',
                  label: 'Loans reach artists',
                  desc: 'Partner banks lend up to 7× the fund amount at a fixed 5% APR to artists excluded from mainstream finance.',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="text-4xl mb-4" aria-hidden="true">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold text-primary-strong uppercase tracking-widest">
                    Step {item.step}
                  </span>
                  <h3 className="text-lg font-bold text-charcoal-deep mt-2 mb-3">{item.label}</h3>
                  <p className="text-sm text-charcoal-muted leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Why it matters */}
        <Section variant="canvas" prevVariant="white">
          <div className="container-max">
            <SectionTitle className="mb-8">Why it matters</SectionTitle>
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: '⏱️',
                    title: 'Protecting creative time',
                    desc: 'Low-interest loans bridge income gaps so artists can keep creating instead of taking survival jobs.',
                  },
                  {
                    icon: '🛡️',
                    title: 'Restoring dignity',
                    desc: 'Artists are evaluated on their work and potential — not rejected for lacking a monthly paycheck.',
                  },
                  {
                    icon: '🌱',
                    title: 'Sustaining the ecosystem',
                    desc: 'Repayments flow back into the fund. Each cycle supports more artists, growing a self-sustaining safety net.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-white p-6 rounded-2xl border-t-4 border-primary"
                  >
                    <div className="text-3xl mb-3" aria-hidden="true">
                      {item.icon}
                    </div>
                    <h3 className="text-base font-bold text-charcoal-deep mb-2">{item.title}</h3>
                    <p className="text-sm text-charcoal-muted leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Exhibition archive */}
        <Section variant="white" prevVariant="canvas">
          <div className="container-max">
            <SectionTitle className="mb-12">Exhibition history</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Link
                href="/archive/2026"
                className="group relative overflow-hidden rounded-2xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
              >
                <div className="bg-charcoal p-8 text-white">
                  <span className="text-xs font-bold tracking-widest uppercase text-white/60">
                    Latest
                  </span>
                  <h3 className="text-2xl font-bold mt-2 mb-3 group-hover:text-primary transition-colors">
                    SAF 2026
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed">
                    Jan 14–26, Insa Art Center, Seoul. {ARTIST_COUNT} artists, {ARTWORK_COUNT}{' '}
                    works. The largest SAF exhibition to date.
                  </p>
                  <span className="inline-block mt-4 text-sm font-semibold text-primary group-hover:underline">
                    View archive →
                  </span>
                </div>
              </Link>
              <Link
                href="/archive/2023"
                className="group relative overflow-hidden rounded-2xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
              >
                <div className="bg-canvas p-8">
                  <span className="text-xs font-bold tracking-widest uppercase text-charcoal-muted">
                    Origin
                  </span>
                  <h3 className="text-2xl font-bold text-charcoal-deep mt-2 mb-3 group-hover:text-primary transition-colors">
                    SAF 2023
                  </h3>
                  <p className="text-sm text-charcoal-muted leading-relaxed">
                    The first exhibition in Insadong. 50+ artists, 7 days of solidarity — raising
                    KRW 34M for the mutual-aid fund.
                  </p>
                  <span className="inline-block mt-4 text-sm font-semibold text-primary group-hover:underline">
                    View archive →
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </Section>

        {/* Explore deeper */}
        <Section variant="gray" prevVariant="white">
          <div className="container-max">
            <SectionTitle className="mb-12">Go deeper</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  href: '/our-reality',
                  icon: '📊',
                  title: 'Our Reality',
                  desc: 'The data behind 84.9% banking exclusion — six charts showing why the system fails artists.',
                },
                {
                  href: '/our-proof',
                  icon: '✅',
                  title: 'Our Proof',
                  desc: `${LOAN_COUNT} loans, 95% repayment, 0% default rate. The numbers that prove mutual-aid lending works.`,
                },
                {
                  href: '/transparency',
                  icon: '📋',
                  title: 'Transparency Reports',
                  desc: 'Annual reports published openly since December 2022. Full operational transparency.',
                },
                {
                  href: '/news',
                  icon: '📰',
                  title: 'Press',
                  desc: 'Media coverage spotlighting the issue of artist financial discrimination in Korea.',
                },
              ].map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="group flex items-start gap-5 p-6 rounded-2xl border border-gray-200 bg-white hover:border-primary hover:shadow-md transition-all duration-200"
                >
                  <span className="text-3xl shrink-0" aria-hidden="true">
                    {page.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-charcoal-deep mb-1 group-hover:text-primary transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-sm text-charcoal-muted leading-relaxed">{page.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section variant="primary-soft" prevVariant="gray">
          <div className="container-max max-w-3xl text-center">
            <SectionTitle className="mb-4">Join the movement</SectionTitle>
            <p className="text-lg text-charcoal mb-8 text-balance">
              Every artwork purchase builds the mutual-aid fund. Every co-op membership strengthens
              the safety net. Your support directly reaches artists who need it most.
            </p>
            <CTAButtonGroup
              donateText="🤝 Become a member"
              purchaseText="🎨 Browse artworks"
              donateHref={EXTERNAL_LINKS.JOIN_MEMBER}
              purchaseHref="/artworks"
              variant="large"
              className="justify-center"
            />
          </div>
        </Section>
      </>
    );
  }

  // ── Korean version ──────────────────────────────────────────────
  return (
    <>
      <JsonLdScript data={[breadcrumbSchema, aboutPageSchema]} />
      <PageHero
        title="씨앗페 소개"
        description={`작품이 금융이 됩니다. 예술인 금융 차별에 맞서는 ${ARTIST_COUNT}명의 연대, ${LOAN_COUNT}건의 저금리 대출, 95%의 상환율 — 씨앗페의 구조를 소개합니다.`}
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={PAGE_URL}
          title="씨앗페 소개 — 씨앗페 온라인"
          description="작품 판매가 예술인 저금리 대출로 이어지는 상호부조 캠페인, 씨앗페를 소개합니다."
        />
      </PageHero>

      {/* 문제 제기 */}
      <Section variant="white">
        <div className="container-max">
          <div className="max-w-3xl mx-auto text-balance">
            <SectionTitle className="mb-8">우리가 해결하려는 문제</SectionTitle>
            <div className="space-y-6 text-lg text-charcoal">
              <p>
                예술인들은 정기적인 급여가 아닌, 프로젝트 기반의 불규칙한 소득을 얻습니다. 공연과
                공연 사이, 전시와 전시 사이 발생하는 <strong>&ldquo;소득 공백기&rdquo;</strong>에도
                월세와 식비, 창작 재료비는 계속 발생합니다.
              </p>
              <p>
                은행은 &ldquo;고정 소득 없음&rdquo;이라는 이유로 문을 닫습니다.{' '}
                <strong className="text-primary-strong">84.9%</strong>의 예술인이 제1금융권에서
                배제되고, <strong className="text-primary-strong">48.6%</strong>가 연 15% 이상의
                고금리 대출에 내몰립니다.
              </p>
              <p>
                이것은 개인의 실패가 아닙니다.{' '}
                <strong>
                  시스템이 만든 <span className="text-charcoal-deep">구조적 위기</span>
                </strong>
                이며, 씨앗페는 이 악순환을 끊기 위해 존재합니다.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 핵심 수치 */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-4">숫자로 보는 씨앗페</SectionTitle>
          <p className="text-center text-charcoal-muted mb-12 text-balance">
            2022년 12월 첫 대출부터 2025년 9월까지의 누적 성과
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <StatCard value={String(ARTIST_COUNT)} label="연대 작가" variant="highlight" />
            <StatCard value={`${LOAN_COUNT}건`} label="대출 실행" variant="highlight" />
            <StatCard value="~7억 원" label="누적 지원" variant="highlight" />
            <StatCard value="95%" label="상환율" variant="highlight" />
          </div>
        </div>
      </Section>

      {/* 작동 원리 */}
      <Section variant="white" prevVariant="primary-surface">
        <div className="container-max">
          <SectionTitle className="mb-12">작품이 대출이 되기까지</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                icon: '🤝',
                label: '작가 연대',
                desc: `${ARTIST_COUNT}명의 작가가 동료 예술인의 금융 차별에 맞서 자발적으로 작품을 출품합니다. 피해 당사자가 아닌, 연대자로서.`,
              },
              {
                step: '02',
                icon: '🖼️',
                label: '작품 판매',
                desc: '씨앗페 온라인 갤러리에서 작품이 판매됩니다. 모든 수익이 상호부조 기금으로 직접 연결됩니다.',
              },
              {
                step: '03',
                icon: '🏦',
                label: '기금 적립',
                desc: '작품 판매 수익 + 조합원 회비 + 특별 연대 기여금이 합쳐져 공동 기금이 쌓입니다. 현재 약 7,700만 원.',
              },
              {
                step: '04',
                icon: '💰',
                label: '저금리 대출',
                desc: '협력 금융기관이 기금의 최대 7배를 연 5% 고정금리로 예술인에게 대출합니다.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-4xl mb-4" aria-hidden="true">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-primary-strong uppercase tracking-widest">
                  STEP {item.step}
                </span>
                <h3 className="text-lg font-bold text-charcoal-deep mt-2 mb-3">{item.label}</h3>
                <p className="text-sm text-charcoal-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* 기금 레버리지 callout */}
          <div className="mt-16 max-w-3xl mx-auto bg-primary/10 rounded-2xl p-8 border-2 border-primary text-center">
            <h3 className="text-card-title mb-2">상호부조 기금 레버리지</h3>
            <p className="text-sm text-charcoal-muted mb-4">
              적립된 기금의 최대 7배가 예술인 대출로 전환됩니다
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div>
                <p className="text-sm text-charcoal-muted">기금</p>
                <p className="text-2xl font-bold text-primary">7,700만 원</p>
              </div>
              <span className="text-2xl text-charcoal-muted" aria-hidden="true">
                →
              </span>
              <div>
                <p className="text-sm text-charcoal-muted">대출 가용액</p>
                <p className="text-2xl font-bold text-primary">~5.4억 원</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 왜 중요한가 */}
      <Section variant="canvas" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-8">왜 이것이 중요한가</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: '⏱️',
                title: '창작 시간을 살려내고',
                desc: '소득 공백기 동안 저금리 대출이 생존형 아르바이트 대신 창작에 집중할 시간을 돌려줍니다.',
              },
              {
                icon: '🛡️',
                title: '예술적 존엄성을 지키며',
                desc: '정기 급여가 아닌 작품과 잠재력으로 평가받습니다. 금융에서도 예술인으로 존중받는 구조.',
              },
              {
                icon: '🌱',
                title: '생태계를 지속가능하게',
                desc: '상환금이 다시 기금으로 돌아와 새로운 예술인을 지원합니다. 순환하는 상호부조의 선순환.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white p-8 rounded-2xl border-t-4 border-primary shadow-sm"
              >
                <div className="text-3xl mb-4" aria-hidden="true">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-charcoal-deep mb-3">{item.title}</h3>
                <p className="text-sm text-charcoal-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 기존 금융 vs 상호부조 */}
      <Section variant="white" prevVariant="canvas">
        <div className="container-max">
          <SectionTitle className="mb-12">기존 금융 vs 상호부조 대출</SectionTitle>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-charcoal">
                  <th className="py-4 pr-4 text-sm font-bold text-charcoal-deep">항목</th>
                  <th className="py-4 px-4 text-sm font-bold text-danger-a11y">기존 금융</th>
                  <th className="py-4 pl-4 text-sm font-bold text-primary-strong">상호부조 대출</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ['심사 기준', '고정 소득·신용등급 중심', '작품 활동·동료 신뢰 기반'],
                  ['금리', '연 15~20%+ (대부업)', '연 5% 고정'],
                  ['대출 유연성', '획일적 상환 조건', '소득 주기에 맞춘 탄력 상환'],
                  ['상담 지원', '없음 (자동 심사)', '1:1 상담 + 동료 네트워크'],
                  ['철학', '이윤 극대화', '상호부조 + 연대'],
                ].map(([label, old, mutual], i) => (
                  <tr key={label} className={i < 4 ? 'border-b border-gray-200' : ''}>
                    <td className="py-4 pr-4 font-medium text-charcoal-deep">{label}</td>
                    <td className="py-4 px-4 text-danger-a11y/80">{old}</td>
                    <td className="py-4 pl-4 text-primary-strong font-medium">{mutual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 전시 아카이브 */}
      <Section variant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">전시 기록</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/archive/2026"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
            >
              <div className="bg-charcoal p-8 text-white">
                <span className="text-xs font-bold tracking-widest uppercase text-white/60">
                  최신 전시
                </span>
                <h3 className="text-2xl font-bold mt-2 mb-3 group-hover:text-primary transition-colors">
                  씨앗페 2026
                </h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  2026년 1월 14~26일, 인사아트센터. {ARTIST_COUNT}명 작가, {ARTWORK_COUNT}점 작품.
                  역대 최대 규모의 씨앗페 전시.
                </p>
                <span className="inline-block mt-4 text-sm font-semibold text-primary group-hover:underline">
                  전시 기록 보기 →
                </span>
              </div>
            </Link>
            <Link
              href="/archive/2023"
              className="group relative overflow-hidden rounded-2xl border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
            >
              <div className="bg-canvas p-8">
                <span className="text-xs font-bold tracking-widest uppercase text-charcoal-muted">
                  시작
                </span>
                <h3 className="text-2xl font-bold text-charcoal-deep mt-2 mb-3 group-hover:text-primary transition-colors">
                  씨앗페 2023
                </h3>
                <p className="text-sm text-charcoal-muted leading-relaxed">
                  인사동에서 열린 첫 번째 전시. 50여 명의 예술인, 7일간의 연대로 3,400만 원의
                  상호부조 기금을 조성했습니다.
                </p>
                <span className="inline-block mt-4 text-sm font-semibold text-primary group-hover:underline">
                  전시 기록 보기 →
                </span>
              </div>
            </Link>
          </div>
        </div>
      </Section>

      {/* 더 알아보기 */}
      <Section variant="gray" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">더 알아보기</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                href: '/our-reality',
                icon: '📊',
                title: '우리의 현실',
                desc: '84.9% 배제율의 근거 — 6개 차트로 확인하는 예술인 금융 차별의 구조적 실태와 데이터.',
              },
              {
                href: '/our-proof',
                icon: '✅',
                title: '우리의 증명',
                desc: `${LOAN_COUNT}건 대출, 95% 상환율, 연체율 0%. 상호부조 대출이 실제로 작동한다는 수치 증명.`,
              },
              {
                href: '/transparency',
                icon: '📋',
                title: '운용 보고서',
                desc: '2022년 12월부터의 운영 현황. 연간 보고서와 함께 투명하게 공개합니다.',
              },
              {
                href: '/news',
                icon: '📰',
                title: '언론 보도',
                desc: '씨앗페와 예술인 금융 차별 문제를 조명한 언론의 기록.',
              },
            ].map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group flex items-start gap-5 p-6 rounded-2xl border border-gray-200 bg-white hover:border-primary hover:shadow-md transition-all duration-200"
              >
                <span className="text-3xl shrink-0" aria-hidden="true">
                  {page.icon}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-charcoal-deep mb-1 group-hover:text-primary transition-colors">
                    {page.title}
                  </h3>
                  <p className="text-sm text-charcoal-muted leading-relaxed">{page.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section variant="primary-soft" prevVariant="gray">
        <div className="container-max max-w-3xl text-center">
          <SectionTitle className="mb-4">지금, 연대에 동참하세요</SectionTitle>
          <p className="text-lg text-charcoal mb-8 text-balance">
            작품 한 점의 구매가 상호부조 기금이 됩니다. 조합원 가입이 안전망을 강화합니다. 당신의
            선택이 금융 차별에 맞서는 가장 구체적인 행동이 됩니다.
          </p>
          <CTAButtonGroup
            donateText="🤝 조합원 가입"
            purchaseText="🎨 작품 보러 가기"
            donateHref={EXTERNAL_LINKS.JOIN_MEMBER}
            purchaseHref="/artworks"
            variant="large"
            className="justify-center"
          />

          {/* 출처 */}
          <div className="mt-16 pt-8 border-t border-charcoal/10 text-left max-w-2xl mx-auto">
            <h3 className="text-sm font-bold text-charcoal-muted mb-3">출처 및 참고</h3>
            <ul className="text-xs text-charcoal-muted space-y-1">
              <li>
                • 금융 배제율·고금리 노출률: 2025 예술인 금융 재난 보고서 (한국스마트협동조합)
              </li>
              <li>• 대출 실적·상환율: 상호부조 대출 운용 보고서 2022.12–2025.09</li>
              <li>
                •{' '}
                <Link
                  href="/our-reality"
                  className="text-primary-strong hover:underline font-medium"
                >
                  데이터 상세 →
                </Link>{' '}
                /{' '}
                <Link href="/our-proof" className="text-primary-strong hover:underline font-medium">
                  성과 상세 →
                </Link>{' '}
                /{' '}
                <Link
                  href="/transparency"
                  className="text-primary-strong hover:underline font-medium"
                >
                  연간 보고서 →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
