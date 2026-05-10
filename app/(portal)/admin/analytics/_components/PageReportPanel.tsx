import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getLocale, getTranslations } from 'next-intl/server';
import PageReportTable from './PageReportTable';

/**
 * GA4 페이지 보고서 — server wrapper.
 *
 * server에서 i18n + locale 받아 client table에 prop으로 전달. 정렬 토글은 client.
 * 표 셀 visualization(rank·progress bar·engagement 색상)은 PageReportTable 내부.
 */

interface Props {
  data: AnalyticsData['pageReport'];
}

export default async function PageReportPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const locale = await getLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'ko-KR';

  return (
    <AdminCard className="flex flex-col">
      <AdminCardHeader className="rounded-t-2xl">
        <h3 className="text-base font-semibold text-gray-900">{t('pageReportTitle')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('pageReportDesc')}</p>
      </AdminCardHeader>
      {data.length === 0 ? (
        <AdminEmptyState title={t('pageReportNoData')} description={t('pageReportNoDataDesc')} />
      ) : (
        <PageReportTable
          data={data}
          intlLocale={intlLocale}
          labels={{
            rankColumn: '#',
            titleColumn: t('pageReportTitleColumn'),
            viewsColumn: t('pageReportViewsColumn'),
            usersColumn: t('pageReportUsersColumn'),
            viewsPerUserColumn: t('pageReportViewsPerUserColumn'),
            engagementColumn: t('pageReportEngagementColumn'),
            eventsColumn: t('pageReportEventsColumn'),
            sortBy: t('pageReportSortBy'),
          }}
        />
      )}
    </AdminCard>
  );
}
