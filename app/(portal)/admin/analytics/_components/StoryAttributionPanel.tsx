import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getTranslations } from 'next-intl/server';

/**
 * 매거진별 매출 기여도 (last-touch attribution) — Phase C에서 분리.
 *
 * 데이터: 매거진 → 작품 클릭 후 그 작품이 결제 완료된 케이스를 매거진에 귀속.
 * 같은 작품이 여러 매거진에서 클릭됐다면 양쪽에 중복 계산 — 매거진 효과 비교 용도이지
 * 정밀 attribution은 아님(별도 추후 작업: orders.device_id 시간 기반 매칭).
 *
 * "매거진 영향력" 섹션의 매출 측면 → CrossLinkPanel(클릭 funnel)과 한 섹션에 묶여 노출.
 */
interface Props {
  data: AnalyticsData['attribution']['storyAttributedRevenue'];
}

export default async function StoryAttributionPanel({ data }: Props) {
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
        <h3 className="text-base font-semibold text-gray-900">{t('storyAttributionTitle')}</h3>
        <p className="mt-1 text-xs text-gray-500">{t('storyAttributionDesc')}</p>
      </AdminCardHeader>
      {data.length === 0 ? (
        <AdminEmptyState title={t('noAttributionData')} description={t('noAttributionDataDesc')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 font-medium text-gray-500">{t('storyTitleColumn')}</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('totalClicks')}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('uniqueClickers')}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('attributedOrders')}
                </th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">
                  {t('attributedRevenue')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row) => (
                <tr key={row.storySlug} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-3 max-w-[400px]">
                    <a
                      href={`/stories/${row.storySlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:underline"
                    >
                      <div className="font-medium text-gray-900 line-clamp-2">
                        {row.storyTitle ?? row.storySlug}
                      </div>
                      {row.storyTitle && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{row.storySlug}</div>
                      )}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                    {numberFormatter.format(row.totalClicks)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                    {numberFormatter.format(row.uniqueClickers)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                    {numberFormatter.format(row.attributedOrdersPaid)}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                    {row.attributedRevenue > 0 ? krwFormatter.format(row.attributedRevenue) : '—'}
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
