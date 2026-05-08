import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getTranslations } from 'next-intl/server';

/**
 * 사용자 행동 인사이트 패널 — Phase A 빠른 win 4종.
 *
 * 1. 세션 깊이 (avg/median pages per session)
 * 2. 주요 이탈 페이지 (CRO 직격)
 * 3. 신규 vs 재방문자 비율
 * 4. UTM 캠페인 분포
 *
 * 모두 page_views 테이블 + 새 RPC 4개로 산출. UTM은 query_params 컬럼(2026-05-08~ 추가)
 * 기반이라 그 이전 트래픽은 미포함.
 */
interface Props {
  data: AnalyticsData['insights'];
}

export default async function InsightsPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat();

  const totalVisitors =
    data.visitorRecurrence.newVisitors + data.visitorRecurrence.returningVisitors;
  const newVisitorRate =
    totalVisitors > 0
      ? Math.round((data.visitorRecurrence.newVisitors / totalVisitors) * 1000) / 10
      : 0;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('insightsTitle')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('insightsDescription')}</p>
      </div>

      {/* 세션 깊이 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('sessionDepthTitle')}</h3>
        </AdminCardHeader>
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <Stat
            label={t('totalSessions')}
            value={numberFormatter.format(data.sessionDepth.totalSessions)}
          />
          <Stat
            label={t('totalPageViews')}
            value={numberFormatter.format(data.sessionDepth.totalPageviews)}
          />
          <Stat
            label={t('avgPagesPerSession')}
            value={String(data.sessionDepth.avgPagesPerSession)}
          />
          <Stat
            label={t('medianPagesPerSession')}
            value={String(data.sessionDepth.medianPagesPerSession)}
          />
        </div>
      </AdminCard>

      {/* 신규 vs 재방문자 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('visitorRecurrenceTitle')}</h3>
        </AdminCardHeader>
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
          <Stat
            label={t('newVisitors')}
            value={numberFormatter.format(data.visitorRecurrence.newVisitors)}
            sub={`${numberFormatter.format(data.visitorRecurrence.newVisitorPageviews)} ${t('pageViews')}`}
          />
          <Stat
            label={t('returningVisitors')}
            value={numberFormatter.format(data.visitorRecurrence.returningVisitors)}
            sub={`${numberFormatter.format(data.visitorRecurrence.returningVisitorPageviews)} ${t('pageViews')}`}
          />
          <Stat
            label={t('newVisitorRate')}
            value={totalVisitors > 0 ? `${newVisitorRate}%` : '—'}
            highlight
          />
        </div>
      </AdminCard>

      {/* 주요 이탈 페이지 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('exitPagesTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('exitPagesDesc')}</p>
        </AdminCardHeader>
        {data.topExitPages.length === 0 ? (
          <AdminEmptyState title={t('noPageData')} description="" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">Path</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('exitCount')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('totalPageViews')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('exitRate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topExitPages.map((row) => (
                  <tr key={row.path} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 max-w-[400px]">
                      <a
                        href={row.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-mono text-xs text-gray-700 hover:text-primary-a11y hover:underline truncate"
                      >
                        {row.path}
                      </a>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.exitCount)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-500">
                      {numberFormatter.format(row.totalViews)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      <span
                        className={
                          row.exitRate >= 70 ? 'text-danger-a11y font-medium' : 'text-gray-900'
                        }
                      >
                        {row.exitRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* UTM 캠페인 분포 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('utmTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('utmDesc')}</p>
        </AdminCardHeader>
        {data.utmDistribution.length === 0 ? (
          <AdminEmptyState title={t('noUtmData')} description={t('noUtmDataDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">{t('utmSource')}</th>
                  <th className="px-6 py-3 font-medium text-gray-500">{t('utmMedium')}</th>
                  <th className="px-6 py-3 font-medium text-gray-500">{t('utmCampaign')}</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('pageViews')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('visitors')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.utmDistribution.map((row, i) => (
                  <tr key={i} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{row.utmSource}</td>
                    <td className="px-6 py-3 text-gray-700">{row.utmMedium}</td>
                    <td className="px-6 py-3 text-gray-700">{row.utmCampaign}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.views)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.visitors)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${highlight ? 'text-success-a11y' : 'text-gray-900'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
