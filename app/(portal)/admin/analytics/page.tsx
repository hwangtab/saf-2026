import { getAnalyticsData, type AnalyticsPeriod } from '@/app/actions/admin-analytics';
import {
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
  AdminHelp,
} from '@/app/admin/_components/admin-ui';
import { AnalyticsPeriodTabs } from './_components/AnalyticsPeriodTabs';
import {
  DailyViewsChart,
  TopPagesChart,
  DevicePieChart,
  BrowserOsChart,
  HourlyHeatmap,
  AnalyticsCsvExport,
} from './_components/AnalyticsCharts';
import ArtistCommercePanel from './_components/AttributionPanel';
import CommercePanel from './_components/CommercePanel';
import CrossLinkPanel from './_components/CrossLinkPanel';
import GscPanel from './_components/GscPanel';
import InsightsPanel from './_components/InsightsPanel';
import StoryAttributionPanel from './_components/StoryAttributionPanel';
import WebVitalsPanel from './_components/WebVitalsPanel';
import CtaClicksPanel from './_components/CtaClicksPanel';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const VALID_PERIODS: AnalyticsPeriod[] = ['7d', '30d', '90d'];

const COUNTRY_KEYS: Record<string, string> = {
  KR: 'countryKR',
  US: 'countryUS',
  JP: 'countryJP',
  CN: 'countryCN',
  TW: 'countryTW',
  HK: 'countryHK',
  DE: 'countryDE',
  FR: 'countryFR',
  GB: 'countryGB',
  CA: 'countryCA',
  AU: 'countryAU',
  SG: 'countrySG',
  unknown: 'countryUnknown',
};

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <AdminCard className="p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight ${accent ? 'text-success-a11y' : 'text-gray-900'}`}
      >
        {value}
      </p>
      {subtitle && <p className="mt-2 text-sm text-gray-500">{subtitle}</p>}
    </AdminCard>
  );
}

/**
 * 대섹션 헤더 — 다섯 영역(트래픽/매출/매거진 영향력/사용자 행동/SEO)을 시각적으로 분리.
 *
 * 디자인: 상단 hairline + eyebrow 번호 + 큰 제목 + 서브 설명. 페이지 내비게이션 anchor용
 * id를 부여해 향후 TOC 링크나 직접 #해시 점프로 활용 가능.
 */
function MajorSectionHeader({
  index,
  title,
  description,
  id,
}: {
  index: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div id={id} className="border-t border-gray-200 pt-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{index}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-gray-500">{description}</p>
    </div>
  );
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ko-KR');
  const params = await searchParams;
  const period: AnalyticsPeriod = VALID_PERIODS.includes(params.period as AnalyticsPeriod)
    ? (params.period as AnalyticsPeriod)
    : '30d';

  let data;
  try {
    data = await getAnalyticsData(period);
  } catch (error) {
    console.error('Analytics Error:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <h2 className="text-lg font-semibold text-danger-a11y">{t('loadErrorTitle')}</h2>
          <p className="mt-2 text-sm text-danger-a11y">{t('loadErrorMessage')}</p>
        </div>
      </div>
    );
  }

  const periodLabel =
    period === '7d' ? t('period7d') : period === '90d' ? t('period90d') : t('period30d');

  const getCountryName = (code: string) => {
    const key = COUNTRY_KEYS[code];
    if (key) return t(key);
    return code;
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>
            {t('title')}
            <AdminHelp>{t('titleHelp')}</AdminHelp>
          </AdminPageTitle>
          <AdminPageDescription>{t('description')}</AdminPageDescription>
        </AdminPageHeader>
        <div className="flex items-center gap-3">
          <AnalyticsCsvExport data={data} />
          <AnalyticsPeriodTabs selected={period} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* I. 트래픽 — 사이트 전반 방문 흐름                             */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <MajorSectionHeader
          id="section-traffic"
          index="01"
          title={t('sectionTrafficTitle')}
          description={t('sectionTrafficDesc')}
        />

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
          <StatCard
            title={t('realtimeVisitors')}
            value={numberFormatter.format(data.realtime.activeVisitors)}
            subtitle={t('recentFiveMin')}
            accent
          />
          <StatCard
            title={`${t('totalPageViews')} (${periodLabel})`}
            value={numberFormatter.format(data.summary.totalPageViews)}
          />
          <StatCard
            title={`${t('uniqueVisitors')} (${periodLabel})`}
            value={numberFormatter.format(data.summary.uniqueVisitors)}
          />
          <StatCard
            title={t('avgViewsPerVisitor')}
            value={String(data.summary.avgViewsPerVisitor)}
            subtitle={t('avgFormula')}
          />
        </div>

        {/* 일별 추이 차트 */}
        <DailyViewsChart data={data.dailyTrend} />

        {/* 시간대별 방문 */}
        <HourlyHeatmap data={data.hourlyDistribution} />

        {/* 인기 페이지 + 디바이스 분포 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopPagesChart data={data.topPages} />
          <DevicePieChart data={data.deviceDistribution} />
        </div>

        {/* 브라우저 / OS 분포 */}
        <BrowserOsChart browserData={data.browserDistribution} osData={data.osDistribution} />

        {/* 국가 분포 + 유입 경로 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">{t('countryVisits')}</h3>
            </AdminCardHeader>
            <div className="p-0">
              {data.countryDistribution.length === 0 ? (
                <AdminEmptyState title={t('noCountryData')} description={t('noCountryDataDesc')} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-3 font-medium text-gray-500">{t('country')}</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-500">
                          {t('pageViews')}
                        </th>
                        <th className="px-6 py-3 text-right font-medium text-gray-500">
                          {t('visitors')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.countryDistribution.map((item) => (
                        <tr key={item.country} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-700">
                            {getCountryName(item.country)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                            {numberFormatter.format(item.views)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                            {numberFormatter.format(item.visitors)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </AdminCard>

          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">{t('referrer')}</h3>
            </AdminCardHeader>
            <div className="p-0">
              {data.topReferrers.length === 0 ? (
                <AdminEmptyState
                  title={t('noReferrerData')}
                  description={t('noReferrerDataDesc')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-3 font-medium text-gray-500">{t('source')}</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-500">
                          {t('visits')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.topReferrers.map((item) => (
                        <tr key={item.referrer} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-700 truncate max-w-[300px]">
                            {item.referrer}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                            {numberFormatter.format(item.count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </AdminCard>
        </div>
      </section>

      {/* ============================================================ */}
      {/* II. 매출 — 작품 view부터 결제·작가별 commerce               */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <MajorSectionHeader
          id="section-commerce"
          index="02"
          title={t('sectionCommerceTitle')}
          description={t('sectionCommerceDesc')}
        />
        <CommercePanel data={data.commerce} />
        <ArtistCommercePanel data={data.attribution.artistDashboard} />
      </section>

      {/* ============================================================ */}
      {/* III. 매거진 영향력 — cross-link 클릭 → 매출 attribution 통합  */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <MajorSectionHeader
          id="section-story-impact"
          index="03"
          title={t('sectionStoryImpactTitle')}
          description={t('sectionStoryImpactDesc')}
        />
        <CrossLinkPanel data={data.crossLinks} />
        <StoryAttributionPanel data={data.attribution.storyAttributedRevenue} />
      </section>

      {/* ============================================================ */}
      {/* IV. 사용자 행동 — 세션·이탈·신규방문·UTM                    */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <MajorSectionHeader
          id="section-behavior"
          index="04"
          title={t('sectionBehaviorTitle')}
          description={t('sectionBehaviorDesc')}
        />
        <InsightsPanel data={data.insights} />
      </section>

      {/* ============================================================ */}
      {/* V. SEO (검색 유입) — Google Search Console organic           */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <MajorSectionHeader
          id="section-seo"
          index="05"
          title={t('sectionSeoTitle')}
          description={t('sectionSeoDesc')}
        />
        <GscPanel data={data.gsc} />
      </section>

      {/* ============================================================ */}
      {/* VI. 실측 성능 (RUM) — Web Vitals self-tracking 기반          */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <MajorSectionHeader
          id="section-rum"
          index="06"
          title={t('sectionRumTitle')}
          description={t('sectionRumDesc')}
        />
        <WebVitalsPanel data={data.webVitals} />
      </section>

      {/* ============================================================ */}
      {/* VII. CTA 클릭 — 외부 conversion (donate / share)             */}
      {/* ============================================================ */}
      <section className="space-y-8">
        <MajorSectionHeader
          id="section-cta"
          index="07"
          title={t('sectionCtaTitle')}
          description={t('sectionCtaDesc')}
        />
        <CtaClicksPanel data={data.ctaClicks} />
      </section>
    </div>
  );
}
