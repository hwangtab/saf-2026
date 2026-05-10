import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * GA4 페이지 보고서 — 페이지 제목·조회수·활성 사용자·평균 참여 시간·이벤트 수.
 *
 * GA4 어드민 UI의 "페이지 및 화면 — 페이지 제목 및 화면 클래스" 화면을 사이트 어드민에
 * 노출. 데이터 출처는 GA4 Data API (자체 page_views와 별개의 source).
 *
 * UI: rank + page_title 강조 + 조회수 inline progress bar + engagement 색상 등급.
 * 표 형식이지만 시각적 hierarchy로 운영자가 "어떤 페이지가 인기있고 깊이 읽히는지"
 * 한눈에 파악 가능.
 */

interface Props {
  data: AnalyticsData['pageReport'];
}

function formatDuration(seconds: number, locale: string): string {
  if (seconds <= 0) return locale === 'en' ? '0s' : '0초';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return locale === 'en' ? `${secs}s` : `${secs}초`;
  return locale === 'en' ? `${mins}m ${secs}s` : `${mins}분 ${secs}초`;
}

/**
 * Engagement time 색상 등급 — 운영자가 "깊이 읽히는 콘텐츠" 즉시 식별.
 * 60s 미만: 가벼운 체류 (text-gray-500)
 * 60s ~ 300s: 평균 (text-gray-700)
 * 300s ~ 600s: 깊은 정독 (text-primary-strong)
 * 600s 이상: 매우 깊은 정독 (text-success-a11y, 강조)
 */
function getEngagementClass(seconds: number): string {
  if (seconds < 60) return 'text-gray-500';
  if (seconds < 300) return 'text-gray-700';
  if (seconds < 600) return 'text-primary-strong font-medium';
  return 'text-success-a11y font-semibold';
}

export default async function PageReportPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const locale = await getLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'ko-KR';
  const numberFormatter = new Intl.NumberFormat(intlLocale);
  const decimalFormatter = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 });

  // 1위 조회수를 100% 기준으로 progress bar — 페이지 간 상대 popularity 즉시 비교.
  const maxViews = data.length > 0 ? Math.max(...data.map((r) => r.screenPageViews), 1) : 1;

  return (
    <AdminCard className="flex flex-col">
      <AdminCardHeader className="rounded-t-2xl">
        <h3 className="text-base font-semibold text-gray-900">{t('pageReportTitle')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('pageReportDesc')}</p>
      </AdminCardHeader>
      {data.length === 0 ? (
        <AdminEmptyState title={t('pageReportNoData')} description={t('pageReportNoDataDesc')} />
      ) : (
        <div className="max-h-[640px] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-2 py-2 text-center">#</th>
                <th className="px-4 py-2 text-left">{t('pageReportTitleColumn')}</th>
                <th className="px-4 py-2 text-left min-w-[160px]">{t('pageReportViewsColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportUsersColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportViewsPerUserColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportEngagementColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportEventsColumn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {data.map((row, idx) => {
                const rank = idx + 1;
                const viewsRatio = (row.screenPageViews / maxViews) * 100;
                return (
                  <tr key={`${row.pagePath}-${row.pageTitle}`}>
                    {/* rank — TOP 3은 charcoal-deep 강조, 나머지는 muted */}
                    <td
                      className={`px-2 py-3 text-center tabular-nums text-xs ${rank <= 3 ? 'font-semibold text-charcoal-deep' : 'text-gray-400'}`}
                    >
                      {rank}
                    </td>
                    {/* title + path */}
                    <td className="px-4 py-3 text-gray-700">
                      <p className="font-medium text-gray-900 line-clamp-2 leading-tight">
                        {row.pageTitle}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-gray-500 line-clamp-1">
                        {row.pagePath}
                      </p>
                    </td>
                    {/* views with inline bar — 1위 대비 비율 시각화 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-semibold text-gray-900 min-w-[40px]">
                          {numberFormatter.format(row.screenPageViews)}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${viewsRatio}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {numberFormatter.format(row.activeUsers)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {decimalFormatter.format(row.viewsPerUser)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${getEngagementClass(row.avgEngagementSeconds)}`}
                    >
                      {formatDuration(row.avgEngagementSeconds, locale)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {numberFormatter.format(row.eventCount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
