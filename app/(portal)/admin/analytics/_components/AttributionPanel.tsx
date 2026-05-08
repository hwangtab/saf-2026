import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getTranslations } from 'next-intl/server';

/**
 * 작가별 매출 성과 — Phase C에서 매거진 attribution과 분리.
 *
 * artistDashboard: 작가별 페이지뷰·결제·매출 (매출 큰 순). 매거진 attribution은
 * StoryAttributionPanel로 이동 — 두 표가 시각적으로 가까울 필요 없고, 매거진 쪽은
 * cross-link funnel과 같이 묶여 더 자연스러움.
 */
interface Props {
  data: AnalyticsData['attribution']['artistDashboard'];
}

export default async function ArtistCommercePanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat();
  const krwFormatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  });

  return (
    <AdminCard className="flex flex-col">
      <AdminCardHeader className="rounded-t-2xl">
        <h3 className="text-base font-semibold text-gray-900">{t('artistDashboardTitle')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('artistDashboardDesc')}</p>
      </AdminCardHeader>
      {data.length === 0 ? (
        <AdminEmptyState title={t('noArtistData')} description={t('noArtistDataDesc')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 font-medium text-gray-500">{t('artistColumnLong')}</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('artworkCountColumn')}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('viewsColumn')}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">{t('visitors')}</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('paidColumn')}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('revenueColumn')}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('viewToPaidRate')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row) => (
                <tr key={row.artistId} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                    {row.artistName}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-500">
                    {numberFormatter.format(row.artworkCount)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                    {numberFormatter.format(row.totalViews)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                    {numberFormatter.format(row.uniqueVisitors)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                    {numberFormatter.format(row.ordersPaid)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                    {row.totalRevenue > 0 ? krwFormatter.format(row.totalRevenue) : '—'}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {row.totalViews > 0 ? (
                      <span
                        className={
                          row.viewToPaidRate >= 1
                            ? 'text-success-a11y font-medium'
                            : row.viewToPaidRate === 0 && row.totalViews >= 50
                              ? 'text-danger-a11y'
                              : 'text-gray-700'
                        }
                      >
                        {row.viewToPaidRate}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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
