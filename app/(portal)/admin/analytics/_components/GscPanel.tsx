import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * Google Search Console organic SEO 패널 — Phase D.
 *
 * - syncStatus: 마지막 sync 시점·총 보관 row (운영자가 데이터 신선도 확인)
 * - dailyTrend: 일별 노출/클릭/CTR/순위 추이
 * - topQueries: 검색 노출 TOP 키워드 (어떤 키워드로 잡히는지)
 * - topPages: organic 트래픽 받는 TOP 페이지 (clicks 우선 정렬)
 * - lowCtrQueries: 노출 50회+ but CTR 낮은 keyword — 메타태그·title 개선 신호
 *
 * 데이터는 GitHub Actions(.github/workflows/gsc-sync.yml)가 매일 새벽 5시 KST
 * (20:00 UTC)에 fetch해 gsc_metrics 테이블에 캐시. GSC API 자체는 약 2일 lag.
 * (Vercel route /api/internal/gsc-sync는 수동 백필용 fallback으로만 잔존)
 */
interface Props {
  data: AnalyticsData['gsc'];
}

export default async function GscPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const locale = await getLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'ko-KR';
  const numberFormatter = new Intl.NumberFormat(intlLocale);
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const datetimeFormatter = new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatDate = (s: string | null) => (s ? dateFormatter.format(new Date(s)) : '—');
  const formatDatetime = (s: string | null) => (s ? datetimeFormatter.format(new Date(s)) : '—');

  const hasData = data.syncStatus.totalRows > 0;
  // 운영 분석 화면은 최신 일자가 위쪽에 — RPC는 ASC 반환이라 클라이언트에서 reverse
  const dailyTrendDesc = [...data.dailyTrend].reverse();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('gscTitle')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('gscDescription')}</p>
      </div>

      {/* sync 상태 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('gscSyncStatusTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('gscSyncStatusDesc')}</p>
        </AdminCardHeader>
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <Stat
            label={t('gscLatestDate')}
            value={formatDate(data.syncStatus.latestDate)}
            highlight
          />
          <Stat label={t('gscOldestDate')} value={formatDate(data.syncStatus.oldestDate)} />
          <Stat
            label={t('gscTotalRows')}
            value={numberFormatter.format(data.syncStatus.totalRows)}
          />
          <Stat label={t('gscLastFetched')} value={formatDatetime(data.syncStatus.lastFetched)} />
        </div>
      </AdminCard>

      {!hasData ? (
        <AdminCard className="flex flex-col">
          <AdminEmptyState title={t('gscNoDataTitle')} description={t('gscNoDataDesc')} />
        </AdminCard>
      ) : (
        <>
          {/* 일별 추이 */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">{t('gscDailyTrendTitle')}</h3>
              <p className="mt-1 text-xs text-gray-500">{t('gscDailyTrendDesc')}</p>
            </AdminCardHeader>
            {data.dailyTrend.length === 0 ? (
              <AdminEmptyState title={t('gscNoTrendData')} description="" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 font-medium text-gray-500">{t('gscDateColumn')}</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscImpressionsColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscClicksColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscCtrColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscPositionColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyTrendDesc.map((row) => (
                      <tr key={row.date} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium tabular-nums text-gray-900">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                          {numberFormatter.format(row.impressions)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                          {numberFormatter.format(row.clicks)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                          {row.ctr}%
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                          {row.avgPosition}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          {/* TOP 검색 키워드 */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">{t('gscTopQueriesTitle')}</h3>
              <p className="mt-1 text-xs text-gray-500">{t('gscTopQueriesDesc')}</p>
            </AdminCardHeader>
            {data.topQueries.length === 0 ? (
              <AdminEmptyState title={t('gscNoQueryData')} description="" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 font-medium text-gray-500">{t('gscQueryColumn')}</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscImpressionsColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscClicksColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscCtrColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscPositionColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topQueries.map((row) => (
                      <tr key={row.query} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-3 max-w-[280px] truncate font-medium text-gray-900">
                          {row.query}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                          {numberFormatter.format(row.impressions)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                          {numberFormatter.format(row.clicks)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                          {row.ctr}%
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                          {row.avgPosition}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          {/* TOP organic 페이지 */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">{t('gscTopPagesTitle')}</h3>
              <p className="mt-1 text-xs text-gray-500">{t('gscTopPagesDesc')}</p>
            </AdminCardHeader>
            {data.topPages.length === 0 ? (
              <AdminEmptyState title={t('gscNoPageData')} description="" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 font-medium text-gray-500">{t('gscPageColumn')}</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscImpressionsColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscClicksColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscCtrColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscPositionColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topPages.map((row) => {
                      const path = pageToPath(row.page);
                      return (
                        <tr key={row.page} className="transition-colors hover:bg-gray-50">
                          <td className="px-6 py-3 max-w-[400px]">
                            <a
                              href={path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-gray-900 hover:underline"
                              title={row.page}
                            >
                              {path}
                            </a>
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                            {numberFormatter.format(row.impressions)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                            {numberFormatter.format(row.clicks)}
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                            {row.ctr}%
                          </td>
                          <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                            {row.avgPosition}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          {/* CTR 낮은 keyword (개선 신호) */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">{t('gscLowCtrTitle')}</h3>
              <p className="mt-1 text-xs text-gray-500">{t('gscLowCtrDesc')}</p>
            </AdminCardHeader>
            {data.lowCtrQueries.length === 0 ? (
              <AdminEmptyState title={t('gscNoLowCtrData')} description="" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 font-medium text-gray-500">{t('gscQueryColumn')}</th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscImpressionsColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscClicksColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscCtrColumn')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-gray-500">
                        {t('gscPositionColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.lowCtrQueries.map((row) => (
                      <tr key={row.query} className="transition-colors hover:bg-gray-50">
                        <td className="px-6 py-3 max-w-[280px] truncate font-medium text-gray-900">
                          {row.query}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                          {numberFormatter.format(row.impressions)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                          {numberFormatter.format(row.clicks)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-danger-a11y font-medium">
                          {row.ctr}%
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                          {row.avgPosition}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </>
      )}
    </section>
  );
}

/**
 * GSC URL prefix property는 full URL(https://www.saf2026.com/foo)을, domain property는
 * path만 반환. 어느 쪽이든 path만 표시해 가독성·내부 링크 일관성 확보.
 */
function pageToPath(page: string): string {
  try {
    const url = new URL(page);
    return url.pathname + url.search + url.hash;
  } catch {
    return page;
  }
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
        className={`mt-1 text-xl font-bold tracking-tight ${highlight ? 'text-success-a11y' : 'text-gray-900'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
