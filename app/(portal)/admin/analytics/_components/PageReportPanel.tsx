import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * GA4 페이지 보고서 — 페이지 제목·조회수·활성 사용자·평균 참여 시간·이벤트 수.
 *
 * GA4 어드민 UI의 "페이지 및 화면 — 페이지 제목 및 화면 클래스" 화면을 사이트 어드민에
 * 노출. 데이터 출처는 GA4 Data API (자체 page_views와 별개의 source).
 *
 * 기존 TopPagesChart는 path 기반 단순 view count. 이 패널은 page_title까지 보여줘
 * 운영자가 "어떤 콘텐츠"인지 path 외에도 식별 가능 + activeUsers·engagement 등 풍부.
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

export default async function PageReportPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const locale = await getLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'ko-KR';
  const numberFormatter = new Intl.NumberFormat(intlLocale);
  const decimalFormatter = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 });

  return (
    <AdminCard className="flex flex-col">
      <AdminCardHeader className="rounded-t-2xl">
        <h3 className="text-base font-semibold text-gray-900">{t('pageReportTitle')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('pageReportDesc')}</p>
      </AdminCardHeader>
      {data.length === 0 ? (
        <AdminEmptyState title={t('pageReportNoData')} description={t('pageReportNoDataDesc')} />
      ) : (
        <div className="max-h-[600px] overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">{t('pageReportTitleColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportViewsColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportUsersColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportViewsPerUserColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportEngagementColumn')}</th>
                <th className="px-4 py-2 text-right">{t('pageReportEventsColumn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {data.map((row) => (
                <tr key={`${row.pagePath}-${row.pageTitle}`}>
                  <td className="px-4 py-2 text-gray-700">
                    <p className="font-medium text-gray-900 line-clamp-1">{row.pageTitle}</p>
                    <p className="font-mono text-xs text-gray-500 line-clamp-1">{row.pagePath}</p>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">
                    {numberFormatter.format(row.screenPageViews)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {numberFormatter.format(row.activeUsers)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {decimalFormatter.format(row.viewsPerUser)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {formatDuration(row.avgEngagementSeconds, locale)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {numberFormatter.format(row.eventCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
