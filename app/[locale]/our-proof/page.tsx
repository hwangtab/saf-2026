import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import LinkButton from '@/components/ui/LinkButton';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import TestimonialCard from '@/components/ui/TestimonialCard';
import StatCard from '@/components/ui/StatCard';
import { CONTACT, EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { getOurProofFaqSchema } from '@/lib/schemas/our-proof-faq';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { Link } from '@/i18n/navigation';

export const revalidate = false;

const LAST_UPDATED = '2026-03-01';
const PAGE_URL = `${SITE_URL}/our-proof`;
const PAGE_COPY = {
  ko: {
    title: '예술인 상호부조 대출 354건, 상환율 95% | 씨앗페 증명',
    description:
      '354건·7억 원 대출, 상환율 95%, 연 5% 고정금리. 금융 배제율 84.9%의 현실에서 3년간 실증된 예술인 상호부조 모델의 운영 지표와 증언.',
  },
  en: {
    title: '354 mutual-aid loans to artists, 95% repayment | SAF Proof',
    description:
      '354 loans · KRW 700M deployed · 95% repayment rate · 5% fixed APR. Three years of evidence that the SAF artist mutual-aid model works against 84.9% banking exclusion.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const base = createStandardPageMetadata(
    copy.title,
    copy.description,
    PAGE_URL,
    '/our-proof',
    locale
  );
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
    },
    other: {
      'article:published_time': '2022-12-01',
      'article:modified_time': LAST_UPDATED,
      'article:section': locale === 'en' ? 'Data & Research' : '데이터 & 연구',
      'article:author': locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
  };
}

export default async function OurProof() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl('/our-proof', locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('ourProof'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const aboutPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name:
      locale === 'en'
        ? 'Our Proof — SAF Mutual Aid Results'
        : '우리의 증명 — 씨앗페 상호부조 대출 실적',
    isPartOf: { '@id': `${SITE_URL}#website` },
    about: {
      '@type': 'Thing',
      name: locale === 'en' ? 'Artist Mutual Aid Loan Program' : '예술인 상호부조 대출 프로그램',
    },
    datePublished: '2022-12-01',
    dateModified: LAST_UPDATED,
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
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#proof-hero-description', '#proof-stats-summary', '#proof-qa-section'],
    },
  };
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${pageUrl}#dataset`,
    name:
      locale === 'en'
        ? 'SAF Mutual Aid Loan Program Outcomes 2022–2026'
        : '씨앗페 상호부조 대출 프로그램 실적 2022–2026',
    description:
      locale === 'en'
        ? 'Operational data for the SAF artist mutual-aid loan program: total loans issued, total amount deployed, repayment rate, and interest savings compared to market rates.'
        : '씨앗페 예술인 상호부조 대출 운영 데이터: 총 실행 건수, 총 지원 금액, 상환율, 시중금리 대비 이자 절감액.',
    url: pageUrl,
    datePublished: '2022-12-01',
    dateModified: LAST_UPDATED,
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    creator: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/html',
      contentUrl: pageUrl,
    },
    variableMeasured: [
      {
        '@type': 'PropertyValue',
        name: locale === 'en' ? 'Total loans issued' : '총 대출 실행 건수',
        value: '354',
        unitText: locale === 'en' ? 'loans' : '건',
      },
      {
        '@type': 'PropertyValue',
        name: locale === 'en' ? 'Repayment rate' : '상환율',
        value: '95',
        unitText: '%',
      },
      {
        '@type': 'PropertyValue',
        name: locale === 'en' ? 'Subrogation (default) rate' : '대위변제율',
        value: '5.10',
        unitText: '%',
      },
    ],
    isPartOf: { '@id': `${SITE_URL}#website` },
  };
  const loanSchema = {
    '@context': 'https://schema.org',
    '@type': 'LoanOrCredit',
    '@id': `${pageUrl}#loan-product`,
    name: locale === 'en' ? 'SAF Artist Mutual Aid Loan' : '씨앗페 예술인 상호부조 대출',
    description:
      locale === 'en'
        ? 'Low-interest mutual aid loans for Korean artists. Fixed 5% annual rate, no credit screening, up to KRW 10 million per borrower. Operated by Korea Smart Cooperative since December 2022.'
        : '한국 예술인을 위한 저금리 상호부조 대출. 연 5% 고정금리, 신용등급 심사 없음, 1인당 최대 1,000만 원. 2022년 12월부터 한국스마트협동조합 운영.',
    url: pageUrl,
    provider: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    annualPercentageRate: 5,
    currency: 'KRW',
    areaServed: {
      '@type': 'Country',
      name: locale === 'en' ? 'South Korea' : '대한민국',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    audience: {
      '@type': 'Audience',
      audienceType: locale === 'en' ? 'Professional artists' : '전업·직업 예술인',
    },
  };
  const { items: proofFaqItems, schema: proofFaqSchema } = getOurProofFaqSchema(locale);

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript
          data={[breadcrumbSchema, aboutPageSchema, datasetSchema, loanSchema, proofFaqSchema]}
        />
        <PageHero
          title="Our Proof"
          description="Mutual-aid finance is not a theory. 354 loans and a 95% repayment rate prove that trust-based lending to artists works."
          descriptionId="proof-hero-description"
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={pageUrl}
            title="Our Proof - SAF Online"
            description="See the measurable outcomes of artist mutual-aid lending at SAF Online."
          />
        </PageHero>

        <div className="w-full bg-white">
          <div className="container-max pt-4 text-right">
            <p className="text-xs text-charcoal-soft">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
        <Section variant="primary-surface" prevVariant="white">
          <div className="container-max">
            <div id="proof-stats-summary" className="max-w-3xl mx-auto text-center mb-12">
              <SectionTitle className="mb-8">
                A <span className="text-primary font-bold">95%</span> repayment rate tells the story
              </SectionTitle>
              <p className="text-xl text-sky-strong">
                Out of 354 loans totaling nearly KRW 700 million, 95% were repaid on time. Even the
                5.10% subrogation level remains lower than many conventional low-credit loan
                markets.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StatCard value="354" label="Loans approved" variant="highlight" />
              <StatCard value="~KRW 700M" label="Total support deployed" variant="highlight" />
              <StatCard
                value="95%"
                label="Repayment rate (5.10% subrogation)"
                variant="highlight"
              />
            </div>

            <div className="mt-12 bg-white p-8 rounded-2xl max-w-3xl mx-auto border-l-4 border-primary">
              <p className="text-lg text-charcoal mb-2">
                The data is clear.{' '}
                <span className="text-primary font-semibold">Artists are bankable.</span>
              </p>
              <p className="text-base text-charcoal-muted mb-4">
                The real risk is a system that excludes artists from fair finance and pushes them
                toward predatory lending.
              </p>
              <p className="text-sm text-charcoal-muted mb-6">
                See the structural causes in{' '}
                <Link
                  href="/our-reality"
                  className="text-primary-strong hover:underline font-medium"
                >
                  Our Reality
                </Link>
                .
              </p>
              <p className="text-2xl font-bold text-charcoal">
                Trust-based finance can be both socially just and financially stable.
              </p>
            </div>
          </div>
        </Section>

        <Section variant="white" prevVariant="primary-surface">
          <div className="container-max">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <SectionTitle className="mb-6">What is mutual-aid lending?</SectionTitle>
                <div className="space-y-4 text-charcoal">
                  <p>
                    When the cooperative builds a shared fund, partner financial institutions can
                    lend up to about 7x that amount to artists at low fixed rates.
                  </p>
                  <p>
                    This is not just a product. It is relationship-based finance built on trust,
                    accountability, and solidarity.
                  </p>
                  <p className="font-semibold">
                    When traditional finance says, &ldquo;No regular income, no loan,&rdquo; we say,
                    &ldquo;We trust your work and your future.&rdquo;
                  </p>
                </div>
              </div>
              <div className="bg-primary/10 rounded-2xl p-8 border-2 border-primary text-center">
                <h3 className="text-card-title mb-6">Fund leverage</h3>
                <p className="text-sm text-charcoal-muted mb-3">Accumulated mutual-aid reserve</p>
                <p className="text-4xl font-bold text-primary">KRW 77,000,000</p>
                <p className="text-sm text-charcoal-muted mt-4">
                  Built through artwork sales, co-op membership, and special solidarity
                  contributions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <StatCard
                value="354"
                label="Cumulative loans"
                description="354 loans were executed between Dec 2022 and Sep 2025."
                variant="bordered"
              />
              <StatCard
                value="~KRW 700M"
                label="Cumulative support"
                description="Funds supported living costs, creation costs, and project operations."
                variant="bordered"
              />
              <StatCard
                value="5.10%"
                label="Subrogation rate"
                description="Subrogation remained at a controlled level versus total executed amount."
                variant="bordered"
              />
            </div>
          </div>
        </Section>

        <Section variant="sun-soft" prevVariant="white">
          <div className="container-max">
            <SectionTitle className="mb-12">Voices from artists</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <TestimonialCard
                quote="When I urgently needed hospital expenses, mutual-aid lending let me focus on recovery instead of debt pressure."
                author="Kim"
                context="Visual Artist"
                borderColor="border-primary"
                contextColor="text-sky-strong"
              />
              <TestimonialCard
                quote="I had been denied at every bank. Here, I was recognized as an artist with a viable future."
                author="Lee"
                context="Independent Film Director"
                borderColor="border-sun"
                contextColor="text-sun-strong"
              />
              <TestimonialCard
                quote="The program enabled my exhibition preparation when production costs were impossible to cover."
                author="Park"
                context="Installation Artist"
                borderColor="border-accent"
                contextColor="text-accent-strong"
              />
              <TestimonialCard
                quote="Knowing my repayments can support another artist makes me even more responsible."
                author="Choi"
                context="Musical Actor"
                borderColor="border-primary-strong"
                contextColor="text-primary-strong"
              />
            </div>
          </div>
        </Section>

        <Section variant="primary-surface" prevVariant="sun-soft">
          <div id="proof-qa-section" className="container-max">
            <SectionTitle className="mb-12">Traditional finance vs mutual-aid lending</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-sm overflow-hidden">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Category</th>
                    <th className="px-6 py-4 text-center font-bold">Traditional lenders</th>
                    <th className="px-6 py-4 text-center font-bold">Mutual-aid lending</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-6 py-4 font-semibold">Screening basis</td>
                    <td className="px-6 py-4 text-center">Regular income, credit score</td>
                    <td className="px-6 py-4 text-center text-primary font-semibold">
                      Artist identity
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-6 py-4 font-semibold">Interest rate</td>
                    <td className="px-6 py-4 text-center text-danger">15-30%</td>
                    <td className="px-6 py-4 text-center text-primary font-semibold">
                      Fixed 5% APR
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-6 py-4 font-semibold">Loan flexibility</td>
                    <td className="px-6 py-4 text-center">Limited</td>
                    <td className="px-6 py-4 text-center">Relatively flexible</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold">Core philosophy</td>
                    <td className="px-6 py-4 text-center">Profit-first</td>
                    <td className="px-6 py-4 text-center text-primary font-semibold">Mutual aid</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section variant="white" prevVariant="primary-surface">
          <div className="container-max max-w-4xl">
            <SectionTitle className="mb-8">Frequently asked questions</SectionTitle>
            <div className="space-y-6">
              {proofFaqItems.map((item) => (
                <article
                  key={item.question}
                  className="rounded-2xl border border-gray-200 bg-white p-6"
                >
                  <h3 className="mb-2 text-lg font-semibold text-charcoal">{item.question}</h3>
                  <p className="text-charcoal-muted leading-relaxed">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </Section>

        <Section variant="primary-soft" prevVariant="white" className="pb-24 md:pb-32">
          <div className="container-max text-center">
            <SectionTitle className="mb-8">You can join this trust network</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
              <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
                <h3 className="text-card-title mb-3">Join the cooperative</h3>
                <p className="text-charcoal-muted mb-4 flex-grow">
                  Become a member of Korea Smart Cooperative and help sustain artist mutual-aid
                  finance.
                </p>
                <LinkButton href={EXTERNAL_LINKS.JOIN_MEMBER} external variant="accent" size="md">
                  Join now
                </LinkButton>
              </div>
              <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
                <h3 className="text-card-title mb-3">Support artists through purchases</h3>
                <p className="text-charcoal-muted mb-4 flex-grow">
                  Sales proceeds return to the fund. Explore artworks in the online gallery.
                </p>
                <LinkButton href="/artworks" variant="secondary" size="md">
                  Browse artworks
                </LinkButton>
              </div>
            </div>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <JsonLdScript
        data={[breadcrumbSchema, aboutPageSchema, datasetSchema, loanSchema, proofFaqSchema]}
      />
      <PageHero
        title="우리의 증명"
        description="예술인 상호부조 대출의 실제 성과. 354건, 약 7억 원의 신뢰가 데이터로 증명되었습니다."
        descriptionId="proof-hero-description"
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={PAGE_URL}
          title="우리의 증명 - 씨앗페 온라인"
          description="예술인 상호부조 대출 354건, 누적 약 7억 원 지원. 데이터로 확인하세요."
        />
      </PageHero>

      <div className="w-full bg-white">
        <div className="container-max pt-4 text-right">
          <p className="text-xs text-charcoal-soft">마지막 업데이트: {LAST_UPDATED}</p>
        </div>
      </div>
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <div id="proof-stats-summary" className="max-w-3xl mx-auto text-center mb-12">
            <SectionTitle className="mb-8">
              <span className="text-primary font-bold">95%</span>의 상환율이 증명합니다
            </SectionTitle>
            <p className="text-xl text-sky-strong">
              신용점수에 상관없이 빌려준 354건, 약 7억 원 가운데 95%가 제때 돌아왔고 빚을 대신
              갚아야 했던 비율도 5.10%뿐이라 흔한 저신용 대출보다 오히려 안정적입니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StatCard value="354건" label="신용 무관 대출 건수" variant="highlight" />
            <StatCard value="약 7억 원" label="총 대출 규모" variant="highlight" />
            <StatCard value="95%" label="상환율 (대위변제율 5.10%)" variant="highlight" />
          </div>

          <div className="mt-12 bg-white p-8 rounded-2xl max-w-3xl mx-auto border-l-4 border-primary">
            <p className="text-lg text-charcoal mb-2">
              이 데이터는 명백한 사실을 증명합니다.{' '}
              <span className="text-primary font-semibold">
                예술인은 빚을 떼먹는 사람이 아닙니다.
              </span>
            </p>
            <p className="text-base text-charcoal-muted mb-4">
              354건 중 95%가 제때 갚혔고 대위변제율도 5.10%에 머물러 뉴스아트(2025.05.22)가 소개한
              것처럼 일반 금융기관 저신용 대출 연체율보다 낮은 수준이 유지되고 있습니다.
            </p>
            <p className="text-sm text-charcoal-muted mb-6">
              예술인이 처한 금융 배제의 구조적 원인은{' '}
              <Link href="/our-reality" className="text-primary-strong hover:underline font-medium">
                우리의 현실
              </Link>
              에서 확인하세요.
            </p>
            <p className="text-2xl font-bold text-charcoal">
              위험한 것은 이들을 약탈하도록 방치하는 현재의 금융 시스템입니다.
            </p>
          </div>
        </div>
      </Section>

      {/* Proof Section */}
      <Section variant="white" prevVariant="primary-surface">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <SectionTitle className="mb-6">상호부조 대출이란?</SectionTitle>
              <div className="space-y-4 text-charcoal">
                <p>
                  <a
                    href={EXTERNAL_LINKS.KOSMART_HOME}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    한국스마트협동조합
                  </a>
                  이 일정한 기금을 조성하면, 협약금융기관이 그 기금의 약 7배까지 예술인들에게{' '}
                  <strong>저금리</strong>로 대출하는 시스템입니다.
                </p>
                <p>
                  이는 단순한 금융상품이 아닙니다. 예술인들을 신뢰하고, 그들의 성실함에 베팅하는
                  &lsquo;상호부조&rsquo;의 정신이 담겨있습니다.
                </p>
                <p className="font-semibold">
                  기존 금융이 &ldquo;정기 소득을 증명할 수 없으니 불가능&rdquo;이라고 말할 때,
                  우리는 &ldquo;당신을 믿습니다&rdquo;라고 말합니다.
                </p>
              </div>
            </div>
            <div className="bg-primary/10 rounded-2xl p-8 border-2 border-primary text-center">
              <h3 className="text-card-title mb-6">기금의 힘</h3>
              <p className="text-sm text-charcoal-muted mb-3">누적 조성된 상호부조 기금</p>
              <p className="text-4xl font-bold text-primary">77,000,000원</p>
              <p className="text-sm text-charcoal-muted mt-4">
                작품 판매와 조합원 가입, 특별조합비로 함께 채워온 신뢰의 안전망입니다.
              </p>
            </div>
          </div>

          {/* Success Stories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <StatCard
              value="354건"
              label="누적 대출 실행"
              description="2022년 12월부터 2025년 9월말까지 354건의 상호부조 대출이 실행되었습니다."
              variant="bordered"
            />
            <StatCard
              value="약 7억 원"
              label="누적 지원 금액"
              description="생활비·창작비·프로젝트 자금 등으로 총 약 7억 원이 투입되었습니다."
              variant="bordered"
            />
            <StatCard
              value="5.10%"
              label="대위변제율"
              description="총 20건, 31,080,986원이 대위변제 처리되어 전체 실행액 대비 5.10% 수준입니다."
              variant="bordered"
            />
          </div>

          {/* Why It Works */}
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 max-w-3xl mx-auto mb-16">
            <SectionTitle className="mb-8">왜 상호부조 금융이 작동할까?</SectionTitle>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">기금과 특별조합비</h3>
                  <p className="text-charcoal-muted text-balance">
                    조합이 조성한 7,700만원의 기금과 대출자 특별조합비로 안정기금 잔액
                    35,608,224원을 유지하며 리스크를 공동으로 감당합니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">연 5% 고정금리</h3>
                  <p className="text-charcoal-muted text-balance">
                    프로젝트형·긴급생활형 상품 모두 연 5% 고정금리로 설계되어 고리대금 대출 대비
                    평균 14%p 이상 이자 부담을 덜어줍니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">용도별 맞춤 상품</h3>
                  <p className="text-charcoal-muted text-balance">
                    긴급·익일·특별·프로젝트 대출 등 네 가지 상품으로 생활비부터 창작비까지 필요한
                    시점에 자금을 공급합니다.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <div>
                  <h3 className="text-card-title mb-2">투명한 리스크 관리</h3>
                  <p className="text-charcoal-muted text-balance">
                    대위변제 20건(6.56%) 중 11,396,305원을 회수했고, 실시간 모니터링과 회수 계획으로
                    상호부조 신뢰를 지켜가고 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Testimonials Section */}
      <Section variant="sun-soft" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">예술인들의 증언</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TestimonialCard
              quote="급하게 병원비가 필요했는데, 어디서도 돈을 빌릴 수 없었어요. 상호부조 대출 덕분에 치료에만 집중할 수 있었습니다."
              author="김OO"
              context="시각 예술가"
              borderColor="border-primary"
              contextColor="text-sky-strong"
            />
            <TestimonialCard
              quote="은행 문턱이 너무 높았는데, 여기서는 저를 '예술인'으로 인정해주더군요. 단순한 대출이 아니라 큰 위로와 응원이었습니다."
              author="이OO"
              context="독립 영화감독"
              borderColor="border-sun"
              contextColor="text-sun-strong"
            />
            <TestimonialCard
              quote="다음 전시 준비 자금이 막막했는데, 덕분에 무사히 작품을 완성하고 전시를 열 수 있었습니다. 이 제도가 없었다면 불가능했을 거예요."
              author="박OO"
              context="설치 미술가"
              borderColor="border-accent"
              contextColor="text-accent-strong"
            />
            <TestimonialCard
              quote="내 상환금이 다른 동료 예술가에게 희망이 된다는 사실이 저를 더 책임감 있게 만듭니다. 우리는 서로의 안전망입니다."
              author="최OO"
              context="뮤지컬 배우"
              borderColor="border-primary-strong"
              contextColor="text-primary-strong"
            />
          </div>
        </div>
      </Section>

      {/* Statistics Comparison */}
      <Section variant="primary-surface" prevVariant="sun-soft">
        <div id="proof-qa-section" className="container-max">
          <SectionTitle className="mb-12">기존 금융 vs 상호부조 대출</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-sm overflow-hidden">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">항목</th>
                  <th className="px-6 py-4 text-center font-bold">기존 금융기관</th>
                  <th className="px-6 py-4 text-center font-bold">상호부조 대출</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">심사 기준</td>
                  <td className="px-6 py-4 text-center">정기 소득, 신용등급</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">예술인임</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">금리</td>
                  <td className="px-6 py-4 text-center text-danger">15~30%</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">연 5% 고정</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">대출 한도</td>
                  <td className="px-6 py-4 text-center">제한적</td>
                  <td className="px-6 py-4 text-center">상대적으로 유연</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">상담 지원</td>
                  <td className="px-6 py-4 text-center">최소한</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">맞춤형 상담</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold">철학</td>
                  <td className="px-6 py-4 text-center">영리 추구</td>
                  <td className="px-6 py-4 text-center text-primary font-semibold">상호부조</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section variant="white" prevVariant="primary-surface">
        <div className="container-max max-w-4xl">
          <SectionTitle className="mb-8">자주 묻는 질문</SectionTitle>
          <div className="space-y-6">
            {proofFaqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-gray-200 bg-white p-6"
              >
                <h3 className="mb-2 text-lg font-semibold text-charcoal">{item.question}</h3>
                <p className="text-charcoal-muted leading-relaxed">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* Call to Action */}
      <Section variant="primary-soft" prevVariant="white" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <SectionTitle className="mb-8">당신도 이 신뢰의 체계에 참여할 수 있습니다</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">조합원이 되어 연대해주세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                한국스마트협동조합의 조합원이 되어 예술인 상호부조 대출 기금 조성과 운영에 함께하실
                수 있습니다.
              </p>
              <LinkButton href={EXTERNAL_LINKS.JOIN_MEMBER} external variant="accent" size="md">
                조합원 가입하기
              </LinkButton>
            </div>
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">작품을 구매해 예술인을 응원하세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                판매 수익은 전액 기금으로 귀속됩니다. 온라인 갤러리에서 작품을 만나보세요.
              </p>
              <LinkButton href="/artworks" variant="secondary" size="md">
                작품 구매하기
              </LinkButton>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
