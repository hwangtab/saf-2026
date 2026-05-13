import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Real User Monitoring 패널 — WebVitalsTracker가 자체 page_views 테이블에 적재한
 * web_vitals 이벤트를 RPC로 집계해 LCP/CLS/INP/FCP/TTFB의 p75·rating 분포·일자별 추이·
 * 가장 느린 페이지를 보여줍니다.
 *
 * PSI(PageSpeed Insights)는 lab 시뮬레이션이라 실제 사용자 환경(저속 회선·구형 기기)을
 * 정확히 반영하지 못함. 이 패널은 실측 데이터를 보여주므로 회귀 진단의 ground truth.
 */

const METRIC_ORDER = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;

interface Props {
  data: AnalyticsData['webVitals'];
}

/**
 * metric별 단위·임계값. CLS만 score(0~1) 나머지는 ms.
 * 권장 임계는 Google Core Web Vitals 공식 기준.
 */
const METRIC_FORMAT: Record<
  string,
  { format: (v: number) => string; goodMax: number; poorMin: number }
> = {
  LCP: { format: (v) => `${(v / 1000).toFixed(2)}s`, goodMax: 2500, poorMin: 4000 },
  INP: { format: (v) => `${Math.round(v)}ms`, goodMax: 200, poorMin: 500 },
  CLS: { format: (v) => v.toFixed(3), goodMax: 0.1, poorMin: 0.25 },
  FCP: { format: (v) => `${(v / 1000).toFixed(2)}s`, goodMax: 1800, poorMin: 3000 },
  TTFB: { format: (v) => `${Math.round(v)}ms`, goodMax: 800, poorMin: 1800 },
};

function formatMetric(metric: string, value: number): string {
  const fmt = METRIC_FORMAT[metric];
  return fmt ? fmt.format(value) : value.toFixed(2);
}

/** p75 색상: good 이하 success, poor 이상 danger, 그 사이 amber */
function getRatingColor(metric: string, p75: number): string {
  const fmt = METRIC_FORMAT[metric];
  if (!fmt) return 'text-gray-700';
  if (p75 <= fmt.goodMax) return 'text-success-a11y';
  if (p75 >= fmt.poorMin) return 'text-danger-a11y';
  return 'text-sun-strong';
}

export default async function WebVitalsPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const locale = await getLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'ko-KR';
  const numberFormatter = new Intl.NumberFormat(intlLocale);
  const percentFormatter = new Intl.NumberFormat(intlLocale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    month: '2-digit',
    day: '2-digit',
  });

  const hasData = data.summary.length > 0;

  // metric_name 기준으로 정렬 (LCP·INP·CLS·FCP·TTFB 우선)
  const sortedSummary = [...data.summary].sort((a, b) => {
    const ai = METRIC_ORDER.indexOf(a.metricName as (typeof METRIC_ORDER)[number]);
    const bi = METRIC_ORDER.indexOf(b.metricName as (typeof METRIC_ORDER)[number]);
    if (ai === -1 && bi === -1) return a.metricName.localeCompare(b.metricName);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('wvTitle')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('wvDescription')}</p>
      </div>

      {!hasData ? (
        <AdminCard className="flex flex-col">
          <AdminEmptyState title={t('wvNoDataTitle')} description={t('wvNoDataDesc')} />
        </AdminCard>
      ) : (
        <>
          {/* 회귀 강조 — admin nav alert dot의 출처. 가장 먼저 노출. */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader
              className={`rounded-t-2xl ${
                data.regressions.length > 0 ? 'bg-danger-a11y/5 ring-1 ring-danger-a11y/20' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">{t('wvRegressionsTitle')}</h3>
                {data.regressions.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-a11y/10 px-2 py-0.5 text-xs font-semibold text-danger-a11y">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-danger-a11y" />
                    {data.regressions.length}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('wvRegressionsDesc')}</p>
            </AdminCardHeader>
            {data.regressions.length === 0 ? (
              <div className="px-6 py-6 text-sm text-success-a11y">{t('wvRegressionsEmpty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">{t('wvMetricColumn')}</th>
                      <th className="px-4 py-2 text-left">{t('wvPagePathColumn')}</th>
                      <th className="px-4 py-2 text-right">{t('wvSampleColumn')}</th>
                      <th className="px-4 py-2 text-right">{t('wvP75Column')}</th>
                      <th className="px-4 py-2 text-right">{t('wvThresholdColumn')}</th>
                      <th className="px-4 py-2 text-right">{t('wvPoorRatioColumn')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {data.regressions.map((row) => (
                      <tr key={`${row.metricName}-${row.pagePath}`}>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-900">
                          {row.metricName}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">
                          {row.pagePath}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                          {numberFormatter.format(row.sampleSize)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right tabular-nums font-semibold ${getRatingColor(row.metricName, row.p75Value)}`}
                        >
                          {formatMetric(row.metricName, row.p75Value)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-500">
                          {formatMetric(row.metricName, row.poorThreshold)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-danger-a11y">
                          {percentFormatter.format(row.poorRatio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          {/* metric별 요약 */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">{t('wvSummaryTitle')}</h3>
              <p className="mt-1 text-xs text-gray-500">{t('wvSummaryDesc')}</p>
            </AdminCardHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">{t('wvMetricColumn')}</th>
                    <th className="px-4 py-2 text-right">{t('wvSampleColumn')}</th>
                    <th className="px-4 py-2 text-right">{t('wvP75Column')}</th>
                    <th className="px-4 py-2 text-right">{t('wvMedianColumn')}</th>
                    <th className="px-4 py-2 text-right">{t('wvAvgColumn')}</th>
                    <th className="px-4 py-2 text-right">{t('wvGoodColumn')}</th>
                    <th className="px-4 py-2 text-right">{t('wvNeedsColumn')}</th>
                    <th className="px-4 py-2 text-right">{t('wvPoorColumn')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {sortedSummary.map((row) => (
                    <tr key={row.metricName}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                        {row.metricName}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {numberFormatter.format(row.totalEvents)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums font-semibold ${getRatingColor(row.metricName, row.p75Value)}`}
                      >
                        {formatMetric(row.metricName, row.p75Value)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {formatMetric(row.metricName, row.medianValue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {formatMetric(row.metricName, row.avgValue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-success-a11y">
                        {numberFormatter.format(row.goodCount)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-sun-strong">
                        {numberFormatter.format(row.needsImprovementCount)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-danger-a11y">
                        {numberFormatter.format(row.poorCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>

          {/* 일자별 p75 추이 (metric별 가로 정렬) */}
          {data.dailyP75.length > 0 && (
            <AdminCard className="flex flex-col">
              <AdminCardHeader className="rounded-t-2xl">
                <h3 className="text-base font-semibold text-gray-900">{t('wvDailyTitle')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('wvDailyDesc')}</p>
              </AdminCardHeader>
              {/* sticky header + max-height scroll: 90d 기간(5 metric × 90일 = 최대 450행)도
                  전체 표시. 임의 50행 slice는 90d 선택 시 최근 10일밖에 안 보이는 회귀였음. */}
              <div className="max-h-[600px] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">{t('gscDateColumn')}</th>
                      <th className="px-4 py-2 text-left">{t('wvMetricColumn')}</th>
                      <th className="px-4 py-2 text-right">{t('wvSampleColumn')}</th>
                      <th className="px-4 py-2 text-right">{t('wvP75Column')}</th>
                      <th className="px-4 py-2 text-right">{t('wvGoodRateColumn')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {[...data.dailyP75].reverse().map((row) => (
                      <tr key={`${row.date}-${row.metricName}`}>
                        <td className="px-4 py-2 tabular-nums text-gray-700">
                          {dateFormatter.format(new Date(row.date))}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-900">
                          {row.metricName}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                          {numberFormatter.format(row.sampleSize)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right tabular-nums font-semibold ${getRatingColor(row.metricName, row.p75Value)}`}
                        >
                          {formatMetric(row.metricName, row.p75Value)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                          {percentFormatter.format(row.goodRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}

          {/* LCP가 가장 느린 페이지 */}
          {data.lcpWorstPages.length > 0 && (
            <AdminCard className="flex flex-col">
              <AdminCardHeader className="rounded-t-2xl">
                <h3 className="text-base font-semibold text-gray-900">{t('wvLcpWorstTitle')}</h3>
                <p className="mt-1 text-xs text-gray-500">{t('wvLcpWorstDesc')}</p>
              </AdminCardHeader>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">{t('wvPagePathColumn')}</th>
                      <th className="px-4 py-2 text-right">{t('wvSampleColumn')}</th>
                      <th className="px-4 py-2 text-right">{t('wvP75Column')} (LCP)</th>
                      <th className="px-4 py-2 text-right">{t('wvPoorColumn')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {data.lcpWorstPages.map((row) => (
                      <tr key={row.pagePath}>
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">
                          {row.pagePath}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                          {numberFormatter.format(row.sampleSize)}
                        </td>
                        <td
                          className={`px-4 py-2 text-right tabular-nums font-semibold ${getRatingColor('LCP', row.p75Value)}`}
                        >
                          {formatMetric('LCP', row.p75Value)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-danger-a11y">
                          {numberFormatter.format(row.poorCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          )}
        </>
      )}
    </section>
  );
}
