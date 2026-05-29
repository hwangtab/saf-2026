import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import LinkButton from '@/components/ui/LinkButton';
import TrackedDonateButton from '@/components/common/TrackedDonateButton';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import { getHeroOverride } from '@/lib/hero-curation';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import StatCard from '@/components/ui/StatCard';
import { CONTACT, EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import { LOAN_COUNT } from '@/lib/site-stats';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { getOurProofFaqSchema } from '@/lib/schemas/our-proof-faq';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { Link } from '@/i18n/navigation';
import RelatedStoriesGrid from '@/components/features/RelatedStoriesGrid';

export const dynamic = 'force-static';
export const revalidate = false;

const LAST_UPDATED = '2026-03-01';
const PAGE_URL = `${SITE_URL}/our-proof`;
const PAGE_COPY = {
  ko: {
    title: `예술인 상호부조 대출 ${LOAN_COUNT}건, 상환율 95% | 씨앗페 증명`,
    description: `${LOAN_COUNT}건·7억 원 대출, 상환율 95%, 연 5% 고정금리. 금융 배제율 84.9%의 현실에서 3년간 실증된 예술인 상호부조 모델의 운영 지표와 증언.`,
  },
  en: {
    title: `${LOAN_COUNT} mutual-aid loans to artists, 95% repayment | SAF Proof`,
    description: `${LOAN_COUNT} loans · KRW 700M deployed · 95% repayment rate · 5% fixed APR. Three years of evidence that the SAF artist mutual-aid model works against 84.9% banking exclusion.`,
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
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

export default async function OurProof({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const pageUrl = buildLocaleUrl('/our-proof', locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
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
    // Thing(프로그램 명) + 운영 hub 4편 entity cluster — Sprint 41~43 정책 일관.
    about: [
      {
        '@type': 'Thing' as const,
        name: locale === 'en' ? 'Artist Mutual Aid Loan Program' : '예술인 상호부조 대출 프로그램',
      },
      ...(
        [
          ['how-mutual-aid-fund-works', '상호부조 기금 작동 원리', 'How the Mutual Aid Fund Works'],
          [
            'what-95-percent-repayment-rate-means',
            '95% 상환율의 의미',
            'What 95% Repayment Rate Means',
          ],
          [
            'bank-vs-mutual-aid-comparison',
            '은행 vs 상호부조 비교',
            'Bank vs Mutual Aid Comparison',
          ],
          ['saf-three-year-journey', 'SAF 3년 여정', "SAF's Three-Year Journey"],
        ] as const
      ).map(([slug, ko, en]) => ({
        '@type': 'CreativeWork' as const,
        '@id': `${SITE_URL}/stories/${slug}#about`,
        url: `${SITE_URL}/stories/${slug}`,
        name: locale === 'en' ? en : ko,
      })),
    ],
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
        value: String(LOAN_COUNT),
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
    // schema.org Dataset.isPartOf는 Dataset/DataCatalog만 허용 — WebSite를 가리키면
    // GSC가 "isPartOf 입력란의 개체 유형이 잘못되었습니다" 보고. 이 운영 데이터는 더 큰
    // 데이터 컬렉션의 일부가 아니므로 isPartOf 자체를 제거. (our-reality와 동일 패턴)

    // license — Google Dataset 가이드라인 권장. our-reality와 동일하게 CC-BY 4.0:
    // 운동 목적상 학술·언론 인용이 자유롭게 가능해야 함.
    license: 'https://creativecommons.org/licenses/by/4.0/',
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
          description={`Mutual-aid finance is not a theory. ${LOAN_COUNT} loans and a 95% repayment rate prove that trust-based lending to artists works.`}
          descriptionId="proof-hero-description"
          breadcrumbItems={breadcrumbItems}
          customBackgroundImage={getHeroOverride('our-proof')}
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
                A <span className="text-primary-strong font-bold">95%</span> repayment rate tells
                the story
              </SectionTitle>
              <p className="text-xl text-charcoal">
                Out of {LOAN_COUNT} loans totaling nearly KRW 700 million, 95% were repaid on time.
                Even the 5.10% subrogation level remains lower than many conventional low-credit
                loan markets.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StatCard value={String(LOAN_COUNT)} label="Loans approved" variant="highlight" />
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
                <span className="text-primary-strong font-semibold">Artists are bankable.</span>
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
              <div className="bg-primary-surface rounded-2xl p-8 border-2 border-primary text-center">
                <h3 className="text-card-title mb-6">Fund leverage</h3>
                <p className="text-sm text-charcoal-muted mb-3">Accumulated mutual-aid reserve</p>
                <p className="text-4xl font-black text-primary">KRW 77,000,000</p>
                <p className="text-sm text-charcoal-muted mt-4">
                  Built through artwork sales, co-op membership, and special solidarity
                  contributions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <StatCard
                value={String(LOAN_COUNT)}
                label="Cumulative loans"
                description={`${LOAN_COUNT} loans were executed between Dec 2022 and Sep 2025.`}
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

            <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 max-w-3xl mx-auto mb-16">
              <SectionTitle className="mb-8">Why does mutual-aid finance work?</SectionTitle>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="text-card-title mb-2">Reserve fund and special contributions</h3>
                    <p className="text-charcoal-muted text-balance">
                      The cooperative&rsquo;s KRW 77 million reserve, combined with borrowers&rsquo;
                      special contributions, maintains a KRW 35,608,224 stabilization balance — risk
                      is shared collectively.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="text-card-title mb-2">Fixed 5% annual rate</h3>
                    <p className="text-charcoal-muted text-balance">
                      Both project-based and emergency-living products are designed at a fixed 5%
                      APR, cutting interest burden by an average of 14 percentage points or more
                      compared to predatory lending.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="text-card-title mb-2">Purpose-tailored products</h3>
                    <p className="text-charcoal-muted text-balance">
                      Four products — emergency, next-day, special, and project loans — deliver
                      capital exactly when artists need it, from living expenses to creative
                      production.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-2xl font-bold text-primary">4</span>
                  </div>
                  <div>
                    <h3 className="text-card-title mb-2">Transparent risk management</h3>
                    <p className="text-charcoal-muted text-balance">
                      Of the 20 subrogation cases (6.56%), KRW 11,396,305 has been recovered.
                      Real-time monitoring and recovery planning sustain the trust mutual aid
                      depends on.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Recovery testimonials moved to /our-reality (manual 4.6 A1.5). */}

        <Section variant="primary-surface" prevVariant="white">
          <div id="proof-qa-section" className="container-max">
            <SectionTitle className="mb-12">Traditional finance vs mutual-aid lending</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-sm overflow-hidden">
                <thead className="bg-canvas-strong border-b-2 border-gray-300">
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
                    <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                      Artist identity
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-6 py-4 font-semibold">Interest rate</td>
                    <td className="px-6 py-4 text-center text-danger">15-30%</td>
                    <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                      Fixed 5% APR
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-6 py-4 font-semibold">Loan flexibility</td>
                    <td className="px-6 py-4 text-center">Limited</td>
                    <td className="px-6 py-4 text-center">Relatively flexible</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-6 py-4 font-semibold">Advisory support</td>
                    <td className="px-6 py-4 text-center">Minimal</td>
                    <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                      Tailored consultation
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold">Core philosophy</td>
                    <td className="px-6 py-4 text-center">Profit-first</td>
                    <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                      Mutual aid
                    </td>
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

        {/* 매뉴얼 6.4 [F] / 8.4 — 메인 메커니즘 CTA("더 알아보기") 랜딩 섹션.
            /our-proof의 "왜 상호부조 금융이 작동할까?" 4단계와 다른 차원(매입→레버리지→대출 흐름)을 별도 요약. */}
        <Section variant="canvas" prevVariant="white">
          <div className="container-max max-w-4xl">
            <SectionTitle className="mb-8">How your purchase becomes an artist loan</SectionTitle>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-3 mb-6">
              {[
                { step: '1', label: 'Buy Artwork', note: '100% of price' },
                { step: '2', label: 'Fund Forms', note: '10% of price' },
                { step: '3', label: 'Finance Partner', note: '10× leverage' },
                { step: '4', label: 'Artist Loan', note: '100% credit line', highlight: true },
              ].map((s, i, arr) => (
                <div key={s.step} className="flex md:flex-row flex-col items-center gap-2">
                  <div
                    className={`flex flex-col items-center rounded-2xl px-6 py-4 shadow-sm w-44 md:w-auto ${
                      s.highlight
                        ? 'bg-primary-surface border-2 border-primary'
                        : 'bg-white border border-gray-100'
                    }`}
                  >
                    <span className="text-xs font-semibold tracking-wider uppercase mb-1 text-primary-strong">
                      {s.note}
                    </span>
                    <span
                      className={`text-sm font-bold ${s.highlight ? 'text-primary-strong' : 'text-charcoal-deep'}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <span aria-hidden="true" className="hidden md:block text-charcoal-soft text-lg">
                      ›
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-charcoal-muted">
              {LOAN_COUNT} loans funded this way · 95% repayment rate
            </p>
          </div>
        </Section>

        {/* 관련 매거진 — 상호부조 기금 심화 읽기 (EN) */}
        <RelatedStoriesGrid
          locale={locale}
          eyebrow={{ ko: '기금 이야기 더 읽기', en: 'More on the Fund' }}
          title={{ ko: '상호부조는 어떻게 작동하나', en: 'How Mutual Aid Works' }}
          slugs={[
            'bank-vs-mutual-aid-comparison',
            'what-95-percent-repayment-rate-means',
            'how-mutual-aid-fund-works',
          ]}
        />

        <Section variant="primary-soft" prevVariant="canvas" className="pb-24 md:pb-32">
          <div className="container-max text-center">
            <SectionTitle className="mb-8">You can join this trust network</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
              <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
                <h3 className="text-card-title mb-3">Join the cooperative</h3>
                <p className="text-charcoal-muted mb-4 flex-grow">
                  Become a member of Korea Smart Cooperative and help sustain artist mutual-aid
                  finance.
                </p>
                <TrackedDonateButton position="our-proof-en" variant="primary" size="md">
                  Join now
                </TrackedDonateButton>
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
        description={`예술인 상호부조 대출의 실제 성과. ${LOAN_COUNT}건, 약 7억 원의 신뢰가 데이터로 증명되었습니다.`}
        descriptionId="proof-hero-description"
        breadcrumbItems={breadcrumbItems}
        customBackgroundImage={getHeroOverride('our-proof')}
      >
        <ShareButtonsWrapper
          url={PAGE_URL}
          title="우리의 증명 - 씨앗페 온라인"
          description={`예술인 상호부조 대출 ${LOAN_COUNT}건, 누적 약 7억 원 지원. 데이터로 확인하세요.`}
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
              <span className="text-primary-strong font-bold">95%</span>의 상환율이 증명합니다
            </SectionTitle>
            <p className="text-xl text-charcoal">
              신용점수에 상관없이 빌려준 {LOAN_COUNT}건, 약 7억 원 가운데 95%가 제때 돌아왔고 빚을
              대신 갚아야 했던 비율도 5.10%뿐이라 흔한 저신용 대출보다 오히려 안정적입니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StatCard value={`${LOAN_COUNT}건`} label="신용 무관 대출 건수" variant="highlight" />
            <StatCard value="약 7억 원" label="총 대출 규모" variant="highlight" />
            <StatCard value="95%" label="상환율 (대위변제율 5.10%)" variant="highlight" />
          </div>

          <div className="mt-12 bg-white p-8 rounded-2xl max-w-3xl mx-auto border-l-4 border-primary">
            <p className="text-lg text-charcoal mb-2">
              이 데이터는 명백한 사실을 증명합니다.{' '}
              <span className="text-primary-strong font-semibold">
                예술인은 빚을 떼먹는 사람이 아닙니다.
              </span>
            </p>
            <p className="text-base text-charcoal-muted mb-4">
              {LOAN_COUNT}건 중 95%가 제때 갚혔고 대위변제율도 5.10%에 머물러 뉴스아트(2025.05.22)가
              소개한 것처럼 일반 금융기관 저신용 대출 연체율보다 낮은 수준이 유지되고 있습니다.
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
            <div className="bg-primary-surface rounded-2xl p-8 border-2 border-primary text-center">
              <h3 className="text-card-title mb-6">기금의 힘</h3>
              <p className="text-sm text-charcoal-muted mb-3">누적 조성된 상호부조 기금</p>
              <p className="text-4xl font-black text-primary">77,000,000원</p>
              <p className="text-sm text-charcoal-muted mt-4">
                작품 판매와 조합원 가입, 특별조합비로 함께 채워온 신뢰의 안전망입니다.
              </p>
            </div>
          </div>

          {/* Success Stories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <StatCard
              value={`${LOAN_COUNT}건`}
              label="누적 대출 실행"
              description={`2022년 12월부터 2025년 9월말까지 ${LOAN_COUNT}건의 상호부조 대출이 실행되었습니다.`}
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
                    프로젝트형·긴급생활형 상품 모두 연 5% 고정금리로 설계되어 고금리 대출 대비 평균
                    14%p 이상 이자 부담을 덜어줍니다.
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

      {/* Recovery testimonials moved to /our-reality (manual 4.6 A1.5). */}

      {/* Statistics Comparison */}
      <Section variant="primary-surface" prevVariant="white">
        <div id="proof-qa-section" className="container-max">
          <SectionTitle className="mb-12">기존 금융 vs 상호부조 대출</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-sm overflow-hidden">
              <thead className="bg-canvas-strong border-b-2 border-gray-300">
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
                  <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                    예술인임
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">금리</td>
                  <td className="px-6 py-4 text-center text-danger">15~30%</td>
                  <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                    연 5% 고정
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">대출 한도</td>
                  <td className="px-6 py-4 text-center">제한적</td>
                  <td className="px-6 py-4 text-center">상대적으로 유연</td>
                </tr>
                <tr className="border-b">
                  <td className="px-6 py-4 font-semibold">상담 지원</td>
                  <td className="px-6 py-4 text-center">최소한</td>
                  <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                    맞춤형 상담
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold">철학</td>
                  <td className="px-6 py-4 text-center">영리 추구</td>
                  <td className="px-6 py-4 text-center text-primary-strong font-semibold">
                    상호부조
                  </td>
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

      {/* 매뉴얼 6.4 [F] / 8.4 — 메인 메커니즘 "더 알아보기" 랜딩 — 구매→기금→레버리지→대출 흐름 요약 */}
      <Section variant="canvas" prevVariant="white">
        <div className="container-max max-w-4xl">
          <SectionTitle className="mb-8">작품 구매가 예술인 대출이 되는 4단계</SectionTitle>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-3 mb-6">
            {[
              { step: '1', label: '작품 구매', note: '거래액 100%' },
              { step: '2', label: '기금 형성', note: '거래액 10%' },
              { step: '3', label: '금융 협약', note: '10배 레버리지' },
              { step: '4', label: '예술인 대출', note: '한도 100%', highlight: true },
            ].map((s, i, arr) => (
              <div key={s.step} className="flex md:flex-row flex-col items-center gap-2">
                <div
                  className={`flex flex-col items-center rounded-2xl px-6 py-4 shadow-sm w-44 md:w-auto ${
                    s.highlight ? 'bg-primary-strong text-white' : 'bg-white border border-gray-100'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold tracking-wider uppercase mb-1 ${s.highlight ? 'text-white/90' : 'text-primary-strong'}`}
                  >
                    {s.note}
                  </span>
                  <span
                    className={`text-sm font-bold ${s.highlight ? 'text-white' : 'text-charcoal-deep'}`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <span aria-hidden="true" className="hidden md:block text-charcoal-soft text-lg">
                    ›
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-charcoal-muted">
            이 메커니즘으로 누적 {LOAN_COUNT}건 대출 · 95% 상환 달성
          </p>
        </div>
      </Section>

      {/* 관련 매거진 — 상호부조 기금 심화 읽기 (KO) */}
      <RelatedStoriesGrid
        locale={locale}
        eyebrow={{ ko: '기금 이야기 더 읽기', en: 'More on the Fund' }}
        title={{ ko: '상호부조는 어떻게 작동하나', en: 'How Mutual Aid Works' }}
        slugs={[
          'bank-vs-mutual-aid-comparison',
          'what-95-percent-repayment-rate-means',
          'how-mutual-aid-fund-works',
        ]}
      />

      {/* Call to Action */}
      <Section variant="primary-soft" prevVariant="canvas" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <SectionTitle className="mb-8">당신도 이 신뢰의 체계에 참여할 수 있습니다</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">조합원이 되어 연대해주세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                한국스마트협동조합의 조합원이 되어 예술인 상호부조 대출 기금 조성과 운영에 함께하실
                수 있습니다.
              </p>
              <TrackedDonateButton position="our-proof-ko" variant="primary" size="md">
                조합원 가입하기
              </TrackedDonateButton>
            </div>
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">작품으로 동료 작가의 다음을 만듭니다</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                작품 한 점의 구매가 예술인 상호부조 기금이 되어 동료 작가의 저금리 대출로
                이어집니다. 온라인 갤러리에서 작품을 만나보세요.
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
