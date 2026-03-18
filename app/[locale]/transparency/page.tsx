import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import LinkButton from '@/components/ui/LinkButton';
import SectionTitle from '@/components/ui/SectionTitle';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import StatCard from '@/components/ui/StatCard';
import { EXTERNAL_LINKS, SITE_URL, OG_IMAGE } from '@/lib/constants';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createLocaleAlternates } from '@/lib/locale-alternates';
import { REPORTS, YEARLY_GROWTH } from '@/content/transparency-data';

const PAGE_URL = `${SITE_URL}/transparency`;
const PAGE_COPY = {
  ko: {
    title: '운용 보고서',
    description:
      '2022년 12월 시작된 예술인 상호부조 대출. 매년 발행하는 보고서로 운용 현황을 투명하게 공개합니다.',
  },
  en: {
    title: 'Transparency Reports',
    description:
      'Launched in December 2022, the artist mutual aid loan program publishes annual reports to ensure full operational transparency.',
  },
} as const;

const resolveLocale = (locale: string): 'ko' | 'en' => (locale === 'en' ? 'en' : 'ko');

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.title} | ${tSeo('siteTitle')}`;

  return {
    title,
    description: copy.description,
    alternates: createLocaleAlternates('/transparency'),
    openGraph: {
      title,
      description: copy.description,
      url: PAGE_URL,
      images: [
        { url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: copy.description,
      images: [OG_IMAGE.url],
    },
  };
}

export default async function TransparencyPage() {
  const locale = resolveLocale(await getLocale());
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: SITE_URL },
    { name: tBreadcrumbs('transparency'), url: PAGE_URL },
  ]);

  if (locale === 'en') {
    return (
      <>
        <JsonLdScript data={breadcrumbSchema} />
        <PageHero
          title="Transparency Reports"
          description="Every loan, every repayment, every won — published openly. Here is the full operational record of the artist mutual aid fund."
        >
          <ShareButtonsWrapper
            url={PAGE_URL}
            title="Transparency Reports - SAF 2026"
            description="Annual operational reports of the artist mutual aid loan program."
          />
        </PageHero>

        {/* Reports Grid */}
        <Section variant="primary-surface" prevVariant="white">
          <div className="container-max">
            <SectionTitle className="mb-12">Annual Reports</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {REPORTS.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow"
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
          <div className="container-max">
            <SectionTitle className="mb-4">Year-on-Year Growth</SectionTitle>
            <p className="text-charcoal-muted text-center mb-12">
              Loan volume has grown each year since inception in December 2022, while maintaining a
              stable repayment rate.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
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

        {/* Key Stats */}
        <Section variant="primary-surface" prevVariant="white">
          <div className="container-max">
            <SectionTitle className="mb-12">Cumulative Impact</SectionTitle>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StatCard value="354" label="Total loans issued" variant="highlight" />
              <StatCard value="~KRW 700M" label="Total support deployed" variant="highlight" />
              <StatCard value="95%" label="Repayment rate" variant="highlight" />
            </div>
            <div className="mt-12 bg-white p-8 rounded-lg max-w-3xl mx-auto border-l-4 border-primary">
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
        <Section variant="primary-soft" prevVariant="primary-surface" className="pb-24 md:pb-32">
          <div className="container-max text-center">
            <h2 className="font-section font-normal text-4xl md:text-5xl mb-8">
              You can extend this impact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
              <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
                <h3 className="text-card-title mb-3">Purchase artworks</h3>
                <p className="text-charcoal-muted mb-4 flex-grow">
                  Sales proceeds return directly to the mutual aid fund.
                </p>
                <LinkButton href="/artworks" variant="secondary" size="md">
                  Browse artworks
                </LinkButton>
              </div>
              <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
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
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title="운용 보고서"
        description="대출 한 건, 상환 한 건, 원 단위까지. 예술인 상호부조 대출 기금 운용 전 과정을 투명하게 공개합니다."
      >
        <ShareButtonsWrapper
          url={PAGE_URL}
          title="운용 보고서 - 씨앗페 2026"
          description="예술인 상호부조 대출 연간 운용 보고서. 데이터로 확인하세요."
        />
      </PageHero>

      {/* 보고서 카드 섹션 */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">연간 운용 보고서</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {REPORTS.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow"
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
        <div className="container-max">
          <SectionTitle className="mb-4">연도별 성장 추이</SectionTitle>
          <p className="text-charcoal-muted text-center mb-12">
            2022년 12월 출범 이후 매년 증가하는 대출 규모와 안정적인 상환율을 확인할 수 있습니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
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

      {/* 누적 핵심 수치 */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <SectionTitle className="mb-12">누적 성과 요약</SectionTitle>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StatCard value="354건" label="누적 대출 건수" variant="highlight" />
            <StatCard value="약 7억 원" label="누적 지원 금액" variant="highlight" />
            <StatCard value="95%" label="상환율" variant="highlight" />
          </div>
          <div className="mt-12 bg-white p-8 rounded-lg max-w-3xl mx-auto border-l-4 border-primary">
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
      <Section variant="primary-soft" prevVariant="primary-surface" className="pb-24 md:pb-32">
        <div className="container-max text-center">
          <h2 className="font-section font-normal text-4xl md:text-5xl mb-8">
            이 흐름에 함께해 주세요
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-balance">
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
              <h3 className="text-card-title mb-3">작품을 구매해 기금에 참여하세요</h3>
              <p className="text-charcoal-muted mb-4 flex-grow">
                판매 수익은 상호부조 기금으로 귀속되어 더 많은 예술인에게 저금리 대출로 이어집니다.
              </p>
              <LinkButton href="/artworks" variant="secondary" size="md">
                작품 구매하기
              </LinkButton>
            </div>
            <div className="flex flex-col min-h-[200px] p-6 border border-gray-200 rounded-lg bg-white text-left shadow-sm">
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
