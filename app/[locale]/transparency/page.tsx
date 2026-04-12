import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import LinkButton from '@/components/ui/LinkButton';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import StatCard from '@/components/ui/StatCard';
import { CONTACT, EXTERNAL_LINKS, SITE_URL } from '@/lib/constants';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import {
  REPORTS,
  YEARLY_GROWTH,
  LOAN_TERMS,
  INTEREST_SAVING,
  BORROWER_FIELDS,
} from '@/content/transparency-data';

export const revalidate = false;

const LAST_UPDATED = '2026-03-01';
const PAGE_URL = `${SITE_URL}/transparency`;
const PAGE_COPY = {
  ko: {
    title: '운용 보고서',
    description:
      '2022년 12월 시작된 예술인 상호부조 대출 운영 현황. 누적 354건, 상환율 95%, 총 7억 원 이상 지원의 성과를 연간 보고서로 투명하게 공개합니다.',
  },
  en: {
    title: 'Transparency Reports',
    description:
      'Launched in December 2022, the artist mutual aid loan program publishes annual reports to ensure full operational transparency.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  const base = createStandardPageMetadata(
    title,
    copy.description,
    PAGE_URL,
    '/transparency',
    locale
  );
  return {
    ...base,
    keywords:
      locale === 'en'
        ? 'artist loan transparency, mutual aid fund report, Korea artist loan program, annual report artist fund, artist financial accountability'
        : '예술인 대출 투명성, 상호부조 기금 보고서, 예술인 대출 운용 현황, 씨앗페 연간 보고서, 예술인 금융 지원 성과',
    openGraph: {
      ...base.openGraph,
      type: 'article',
    },
    other: {
      'article:published_time': '2022-12-01',
      'article:modified_time': LAST_UPDATED,
      'article:section': locale === 'en' ? 'Transparency & Reports' : '투명성 & 보고서',
      'article:author': locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
  };
}

export default async function TransparencyPage() {
  const locale = resolveLocale(await getLocale());
  const pageUrl = buildLocaleUrl('/transparency', locale);
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('transparency'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: locale === 'en' ? 'Transparency Reports | SAF Online' : '운용 보고서 | 씨앗페 온라인',
    isPartOf: { '@id': `${SITE_URL}#website` },
    mainEntity: { '@id': `${pageUrl}#reports` },
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
      cssSelector: [
        '#transparency-hero-description',
        '#transparency-stats-section',
        '#transparency-reports-section',
      ],
    },
  };

  // Annual report structured data — helps Google understand these as document records
  const reportsSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#reports`,
    name: locale === 'en' ? 'Annual Transparency Reports' : '연간 운용 보고서',
    description:
      locale === 'en'
        ? 'Annual operational reports of the SAF artist mutual aid loan program'
        : '씨앗페 예술인 상호부조 대출 연간 운용 보고서',
    url: pageUrl,
    numberOfItems: REPORTS.length,
    itemListElement: REPORTS.map((report, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Article',
        '@id': `${SITE_URL}/reports/${encodeURIComponent(report.pdfFilename)}`,
        headline: locale === 'en' ? report.title.en : report.title.ko,
        description: locale === 'en' ? report.summary.en : report.summary.ko,
        datePublished:
          report.year === 2023 ? '2024-03-12' : report.year === 2024 ? '2025-04-17' : '2025-10-18',
        url: `${SITE_URL}/reports/${encodeURIComponent(report.pdfFilename)}`,
        publisher: {
          '@type': 'Organization',
          '@id': `${SITE_URL}#organization`,
          name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
          url: SITE_URL,
        },
      },
    })),
  };

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={[breadcrumbSchema, webPageSchema, reportsSchema]} />
        <PageHero
          title="Transparency Reports"
          description="Every loan, every repayment, every won — published openly. Here is the full operational record of the artist mutual aid fund."
          descriptionId="transparency-hero-description"
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={pageUrl}
            title="Transparency Reports - SAF Online"
            description="Annual operational reports of the artist mutual aid loan program."
          />
        </PageHero>

        <div className="w-full bg-white">
          <div className="container-max pt-4 text-right">
            <p className="text-xs text-gray-400">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
        {/* Reports Grid */}
        <Section variant="primary-surface" prevVariant="white">
          <div id="transparency-reports-section" className="container-max">
            <SectionTitle className="mb-12">Annual Reports</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {REPORTS.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-bold text-primary">{report.year}</span>
                    <span className="text-sm text-charcoal-muted">{report.publishedAt.en}</span>
                  </div>
                  <h3 className="text-card-title mb-3">{report.title.en}</h3>
                  <p className="text-charcoal-muted text-sm mb-6 flex-grow">{report.summary.en}</p>
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {report.stats.map((stat) => (
                      <div key={stat.label.en} className="text-center">
                        <p className="text-sm font-bold text-primary whitespace-nowrap">
                          {stat.value.en}
                        </p>
                        <p className="text-xs text-charcoal-muted leading-tight">{stat.label.en}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-charcoal-muted mb-3 text-center">
                    Rate: {LOAN_TERMS.rateRange.en}
                  </p>
                  <a
                    href={`/reports/${encodeURIComponent(report.pdfFilename)}`}
                    download={report.pdfFilename}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold text-primary border-2 border-primary rounded-md hover:bg-primary hover:text-white transition-colors"
                  >
                    Download PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Growth Table */}
        <Section variant="white" prevVariant="primary-surface">
          <div id="transparency-stats-section" className="container-max">
            <SectionTitle className="mb-4">Year-on-Year Growth</SectionTitle>
            <p className="text-charcoal-muted text-center mb-12">
              Loan volume has grown each year since inception in December 2022, while maintaining a
              stable repayment rate.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Year</th>
                    <th className="px-6 py-4 text-center font-bold">Loans</th>
                    <th className="px-6 py-4 text-center font-bold">Amount</th>
                    <th className="px-6 py-4 text-center font-bold">Repayment</th>
                    <th className="px-6 py-4 text-center font-bold">Subrogation</th>
                  </tr>
                </thead>
                <tbody>
                  {YEARLY_GROWTH.map((row, i) => (
                    <tr key={row.year} className={i < YEARLY_GROWTH.length - 1 ? 'border-b' : ''}>
                      <td className="px-6 py-4 font-bold text-primary">{row.year}</td>
                      <td className="px-6 py-4 text-center">{row.loans.en}</td>
                      <td className="px-6 py-4 text-center">{row.amount.en}</td>
                      <td className="px-6 py-4 text-center">{row.repaymentRate.en}</td>
                      <td className="px-6 py-4 text-center">{row.subrogationRate.en}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-charcoal-muted text-center">
              * 2025 figures are cumulative totals from program inception (Dec 2022).
            </p>
          </div>
        </Section>

        {/* Borrower Distribution */}
        <Section variant="primary-surface" prevVariant="white">
          <div className="container-max">
            <SectionTitle className="mb-4">Borrower Distribution</SectionTitle>
            <p className="text-charcoal-muted text-center mb-10">
              Based on the 2024 operation report — loan utilization by artistic field.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {BORROWER_FIELDS.map((item) => (
                <div
                  key={item.field.en}
                  className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-200"
                >
                  <p className="text-2xl font-bold text-primary mb-1">{item.rate}</p>
                  <p className="text-sm text-charcoal">{item.field.en}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Key Stats */}
        <Section variant="white" prevVariant="primary-surface">
          <div className="container-max">
            <SectionTitle className="mb-12">Cumulative Impact</SectionTitle>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <StatCard value="354" label="Total loans issued" variant="highlight" />
              <StatCard value="~KRW 700M" label="Total support deployed" variant="highlight" />
              <StatCard value="95%" label="Repayment rate" variant="highlight" />
              <StatCard
                value={INTEREST_SAVING.value.en}
                label={INTEREST_SAVING.label.en}
                variant="highlight"
              />
            </div>
            <div className="mt-12 bg-white p-8 rounded-2xl max-w-3xl mx-auto border-l-4 border-primary">
              <p className="text-lg text-charcoal mb-2">
                Reports are published{' '}
                <span className="text-primary font-semibold">annually and independently</span>.
              </p>
              <p className="text-base text-charcoal-muted">
                Korea Smart Cooperative discloses all operational data — loans issued, repayments,
                and subrogation — to members and supporters through annual transparency reports.
                Download the PDFs above to verify for yourself.
              </p>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section variant="primary-soft" prevVariant="white" className="pb-24 md:pb-32">
          <div className="container-max text-center">
            <h2 className="font-section font-normal text-4xl md:text-5xl mb-8">
              You can extend this impact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
              <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
                <h3 className="text-card-title mb-3">Purchase artworks</h3>
                <p className="text-charcoal-muted mb-4 flex-grow">
                  Sales proceeds return directly to the mutual aid fund.
                </p>
                <LinkButton href="/artworks" variant="secondary" size="md">
                  Browse artworks
                </LinkButton>
              </div>
              <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
                <h3 className="text-card-title mb-3">Join the cooperative</h3>
                <p className="text-charcoal-muted mb-4 flex-grow">
                  Membership contributions strengthen the fund&apos;s lending capacity.
                </p>
                <LinkButton href={EXTERNAL_LINKS.JOIN_MEMBER} external variant="accent" size="md">
                  Join now
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
      <JsonLdScript data={[breadcrumbSchema, webPageSchema, reportsSchema]} />
      <PageHero
        title="운용 보고서"
        description="대출 한 건, 상환 한 건, 원 단위까지. 예술인 상호부조 대출 기금 운용 전 과정을 투명하게 공개합니다."
        descriptionId="transparency-hero-description"
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={PAGE_URL}
          title="운용 보고서 - 씨앗페 온라인"
          description="예술인 상호부조 대출 연간 운용 보고서. 데이터로 확인하세요."
        />
      </PageHero>

      <div className="w-full bg-white">
        <div className="container-max pt-4 text-right">
          <p className="text-xs text-gray-400">마지막 업데이트: {LAST_UPDATED}</p>
        </div>
      </div>
      {/* 보고서 카드 섹션 */}
      <Section variant="primary-surface" prevVariant="white">
        <div id="transparency-reports-section" className="container-max">
          <SectionTitle className="mb-12">연간 운용 보고서</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {REPORTS.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-bold text-primary">{report.year}</span>
                  <span className="text-sm text-charcoal-muted">{report.publishedAt.ko}</span>
                </div>
                <h3 className="text-card-title mb-3">{report.title.ko}</h3>
                <p className="text-charcoal-muted text-sm mb-6 flex-grow">{report.summary.ko}</p>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {report.stats.map((stat) => (
                    <div key={stat.label.ko} className="text-center">
                      <p className="text-sm font-bold text-primary whitespace-nowrap">
                        {stat.value.ko}
                      </p>
                      <p className="text-xs text-charcoal-muted leading-tight">{stat.label.ko}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-charcoal-muted mb-3 text-center">
                  대출 금리: {LOAN_TERMS.rateRange.ko}
                </p>
                <a
                  href={`/reports/${encodeURIComponent(report.pdfFilename)}`}
                  download={report.pdfFilename}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold text-primary border-2 border-primary rounded-md hover:bg-primary hover:text-white transition-colors"
                >
                  PDF 다운로드
                </a>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 성장 추이 테이블 */}
      <Section variant="white" prevVariant="primary-surface">
        <div id="transparency-stats-section" className="container-max">
          <SectionTitle className="mb-4">연도별 성장 추이</SectionTitle>
          <p className="text-charcoal-muted text-center mb-12">
            2022년 12월 출범 이후 매년 증가하는 대출 규모와 안정적인 상환율을 확인할 수 있습니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">연도</th>
                  <th className="px-6 py-4 text-center font-bold">대출 건수</th>
                  <th className="px-6 py-4 text-center font-bold">지원 금액</th>
                  <th className="px-6 py-4 text-center font-bold">상환 현황</th>
                  <th className="px-6 py-4 text-center font-bold">대위변제율</th>
                </tr>
              </thead>
              <tbody>
                {YEARLY_GROWTH.map((row, i) => (
                  <tr key={row.year} className={i < YEARLY_GROWTH.length - 1 ? 'border-b' : ''}>
                    <td className="px-6 py-4 font-bold text-primary">{row.year}</td>
                    <td className="px-6 py-4 text-center">{row.loans.ko}</td>
                    <td className="px-6 py-4 text-center">{row.amount.ko}</td>
                    <td className="px-6 py-4 text-center">{row.repaymentRate.ko}</td>
                    <td className="px-6 py-4 text-center">{row.subrogationRate.ko}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-charcoal-muted text-center">
            * 2025년 수치는 출범(2022년 12월) 이후 누적 집계입니다.
          </p>
        </div>
      </Section>

      {/* 수혜자 분야별 분포 */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-4">수혜자 분포</SectionTitle>
          <p className="text-charcoal-muted text-center mb-10">
            2024 운용보고서 기준, 분야별 대출 이용 현황입니다.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {BORROWER_FIELDS.map((item) => (
              <div
                key={item.field.ko}
                className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-200"
              >
                <p className="text-2xl font-bold text-primary mb-1">{item.rate}</p>
                <p className="text-sm text-charcoal">{item.field.ko}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 누적 핵심 수치 */}
      <Section variant="white" prevVariant="primary-surface">
        <div className="container-max">
          <SectionTitle className="mb-12">누적 성과 요약</SectionTitle>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <StatCard value="354건" label="누적 대출 건수" variant="highlight" />
            <StatCard value="약 7억 원" label="누적 지원 금액" variant="highlight" />
            <StatCard value="95%" label="상환율" variant="highlight" />
            <StatCard
              value={INTEREST_SAVING.value.ko}
              label={INTEREST_SAVING.label.ko}
              variant="highlight"
            />
          </div>
          <div className="mt-12 bg-white p-8 rounded-2xl max-w-3xl mx-auto border-l-4 border-primary">
            <p className="text-lg text-charcoal mb-2">
              보고서는 매년 <span className="text-primary font-semibold">독립적으로 작성·발행</span>
              됩니다.
            </p>
            <p className="text-base text-charcoal-muted">
              한국스마트협동조합은 대출 실행, 상환, 대위변제 등 모든 운용 데이터를 조합원과
              후원자에게 연간 보고서 형태로 공개하고 있습니다. 위 PDF를 내려받아 직접 확인하세요.
            </p>
          </div>
        </div>
      </Section>

      {/* CTA 섹션 */}
      <Section variant="primary-soft" prevVariant="white" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <h2 className="font-section font-normal text-4xl md:text-5xl mb-8">
            이 흐름에 함께해 주세요
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">작품을 구매해 기금에 참여하세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                판매 수익은 상호부조 기금으로 귀속되어 더 많은 예술인에게 저금리 대출로 이어집니다.
              </p>
              <LinkButton href="/artworks" variant="secondary" size="md">
                작품 구매하기
              </LinkButton>
            </div>
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-2xl bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">조합원이 되어 연대해주세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                조합원 가입으로 기금 조성에 직접 참여하고 대출 가능 금액을 늘릴 수 있습니다.
              </p>
              <LinkButton href={EXTERNAL_LINKS.JOIN_MEMBER} external variant="accent" size="md">
                조합원 가입하기
              </LinkButton>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
