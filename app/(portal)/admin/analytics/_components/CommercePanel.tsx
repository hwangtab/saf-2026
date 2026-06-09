import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getTranslations } from 'next-intl/server';

/**
 * Commerce Funnel 패널 — Phase B.
 *
 * 단계: 작품 페이지뷰 → 체크아웃 진입 → 주문 생성 → 결제 완료
 * 각 단계 drop-off로 매출 누수 지점 식별.
 *
 * 데이터: page_views(artworks/, checkout/ path 매칭) + orders 테이블 join.
 */
interface Props {
  data: AnalyticsData['commerce'];
}

export default async function CommercePanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat();
  const krwFormatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  });

  const { summary } = data;
  const viewToCheckout =
    summary.artworkViews > 0
      ? Math.round((summary.checkoutViews / summary.artworkViews) * 1000) / 10
      : 0;
  const checkoutToPaid =
    summary.checkoutViews > 0
      ? Math.round((summary.ordersPaid / summary.checkoutViews) * 1000) / 10
      : 0;
  const slotLabelByKey: Record<string, string> = {
    story_mid_intent: t('slot_story_mid_intent'),
    story_bottom_related: t('slot_story_bottom_related'),
    oh_yoon_hub: t('slot_oh_yoon_hub'),
    artist_page_sales: t('slot_artist_page_sales'),
    unknown: t('slot_unknown'),
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('commerceTitle')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('commerceDescription')}</p>
      </div>

      {/* Funnel summary — 5 stage stat cards */}
      <AdminCard className="p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <FunnelStat
            label={t('funnelArtworkViews')}
            value={numberFormatter.format(summary.artworkViews)}
            sub={`${numberFormatter.format(summary.uniqueArtworkVisitors)} ${t('visitors').toLowerCase()}`}
          />
          <FunnelStat
            label={t('funnelCheckoutViews')}
            value={numberFormatter.format(summary.checkoutViews)}
            sub={
              summary.artworkViews > 0 ? `${viewToCheckout}% ${t('viewToCheckoutRate')}` : undefined
            }
          />
          <FunnelStat
            label={t('funnelOrdersCreated')}
            value={numberFormatter.format(summary.ordersCreated)}
          />
          <FunnelStat
            label={t('funnelOrdersPaid')}
            value={numberFormatter.format(summary.ordersPaid)}
            sub={
              summary.checkoutViews > 0
                ? `${checkoutToPaid}% ${t('checkoutToPaidRate')}`
                : undefined
            }
            highlight
          />
          <FunnelStat
            label={t('funnelRevenue')}
            value={krwFormatter.format(summary.totalRevenue)}
            highlight
          />
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h3 className="text-base font-semibold text-gray-900">{t('pushCandidatesTitle')}</h3>
            <p className="mt-1 text-xs text-gray-500">{t('pushCandidatesDesc')}</p>
          </AdminCardHeader>
          <PushCandidatesTable
            data={data.pushCandidates}
            emptyTitle={t('noFunnelData')}
            emptyDescription={t('noFunnelDataDesc')}
            artworkLabel={t('artworkColumn')}
            reasonLabel={t('reasonColumn')}
            viewsLabel={t('viewsColumn')}
            checkoutLabel={t('checkoutColumn')}
            rateLabel={t('checkoutToPaidRate')}
            getReasonLabel={(reason) =>
              reason === 'checkout_leak' ? t('reasonCheckoutLeak') : t('reasonLowCheckout')
            }
          />
        </AdminCard>

        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h3 className="text-base font-semibold text-gray-900">
              {t('recommendationSlotsTitle')}
            </h3>
            <p className="mt-1 text-xs text-gray-500">{t('recommendationSlotsDesc')}</p>
          </AdminCardHeader>
          <RecommendationSlotsTable
            data={data.recommendationSlots}
            emptyTitle={t('noRecommendationSlotData')}
            emptyDescription={t('noRecommendationSlotDataDesc')}
            slotLabel={t('slotColumn')}
            clicksLabel={t('clicksColumn')}
            checkoutLabel={t('checkoutColumn')}
            paidLabel={t('paidColumn')}
            revenueLabel={t('revenueColumn')}
            formatRevenue={(value) => (value > 0 ? krwFormatter.format(value) : '—')}
            getSlotLabel={(slot) => slotLabelByKey[slot] ?? slot}
          />
        </AdminCard>
      </div>

      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('checkoutLeakageTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('checkoutLeakageDesc')}</p>
        </AdminCardHeader>
        <CheckoutLeakageTable
          data={data.checkoutLeakage}
          emptyTitle={t('noFunnelData')}
          emptyDescription={t('noFunnelDataDesc')}
          segmentLabel={t('segmentColumn')}
          createdLabel={t('funnelOrdersCreated')}
          paidLabel={t('paidColumn')}
          cancelledLabel={t('cancelledOrRefundedColumn')}
          pendingLabel={t('pendingColumn')}
          revenueLabel={t('revenueColumn')}
          formatRevenue={(value) => (value > 0 ? krwFormatter.format(value) : '—')}
        />
      </AdminCard>

      {/* 일별 매출 추이 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('revenueTrendTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('revenueTrendDesc')}</p>
        </AdminCardHeader>
        {data.revenueDailyTrend.length === 0 ? (
          <AdminEmptyState title={t('noRevenueData')} description={t('noRevenueDataDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('paidColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('revenueColumn')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.revenueDailyTrend.map((row) => (
                  <tr key={row.date} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700">{row.date}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.ordersPaid)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                      {krwFormatter.format(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* 작품별 funnel TOP 20 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('topArtworkFunnelTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('topArtworkFunnelDesc')}</p>
        </AdminCardHeader>
        {data.topArtworkFunnel.length === 0 ? (
          <AdminEmptyState title={t('noFunnelData')} description={t('noFunnelDataDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">{t('artworkColumn')}</th>
                  <th className="px-6 py-3 font-medium text-gray-500">{t('artistColumn')}</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('viewsColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('checkoutColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('paidColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('revenueColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('checkoutToPaidRate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topArtworkFunnel.map((row) => (
                  <tr key={row.artworkId} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 max-w-[280px]">
                      <a
                        href={`/artworks/${row.artworkId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:underline"
                      >
                        <div className="font-medium text-gray-900 line-clamp-2">
                          {row.artworkTitle || (
                            <span className="font-mono text-xs text-gray-500">{row.artworkId}</span>
                          )}
                        </div>
                        {row.artworkTitle && (
                          <div className="font-mono text-[10px] text-gray-400 mt-0.5 truncate">
                            {row.artworkId}
                          </div>
                        )}
                      </a>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{row.artist || '—'}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.views)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.checkoutViews)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.ordersPaid)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                      {row.revenue > 0 ? krwFormatter.format(row.revenue) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {row.checkoutViews > 0 ? (
                        <span
                          className={
                            row.checkoutToPaidRate >= 50
                              ? 'text-success-a11y font-medium'
                              : row.checkoutToPaidRate < 10
                                ? 'text-danger-a11y'
                                : 'text-gray-700'
                          }
                        >
                          {row.checkoutToPaidRate}%
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
    </section>
  );
}

function FunnelStat({
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

function PushCandidatesTable({
  data,
  emptyTitle,
  emptyDescription,
  artworkLabel,
  reasonLabel,
  viewsLabel,
  checkoutLabel,
  rateLabel,
  getReasonLabel,
}: {
  data: AnalyticsData['commerce']['pushCandidates'];
  emptyTitle: string;
  emptyDescription: string;
  artworkLabel: string;
  reasonLabel: string;
  viewsLabel: string;
  checkoutLabel: string;
  rateLabel: string;
  getReasonLabel: (reason: AnalyticsData['commerce']['pushCandidates'][number]['reason']) => string;
}) {
  if (data.length === 0) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;
  }
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-6 py-3 font-medium text-gray-500">{artworkLabel}</th>
            <th className="px-6 py-3 font-medium text-gray-500">{reasonLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{viewsLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{checkoutLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{rateLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row) => (
            <tr
              key={`${row.artworkId}-${row.reason}`}
              className="transition-colors hover:bg-gray-50"
            >
              <td className="px-6 py-3 max-w-[260px]">
                <a
                  href={`/artworks/${row.artworkId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:underline"
                >
                  <div className="font-medium text-gray-900 line-clamp-2">
                    {row.artworkTitle || row.artworkId}
                  </div>
                  {row.artist && <div className="mt-0.5 text-xs text-gray-500">{row.artist}</div>}
                </a>
              </td>
              <td className="px-6 py-3 text-gray-700">{getReasonLabel(row.reason)}</td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.views)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.checkoutViews)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-danger-a11y">
                {row.reason === 'checkout_leak'
                  ? `${row.checkoutToPaidRate}%`
                  : `${row.viewToCheckoutRate}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecommendationSlotsTable({
  data,
  emptyTitle,
  emptyDescription,
  slotLabel,
  clicksLabel,
  checkoutLabel,
  paidLabel,
  revenueLabel,
  formatRevenue,
  getSlotLabel,
}: {
  data: AnalyticsData['commerce']['recommendationSlots'];
  emptyTitle: string;
  emptyDescription: string;
  slotLabel: string;
  clicksLabel: string;
  checkoutLabel: string;
  paidLabel: string;
  revenueLabel: string;
  formatRevenue: (value: number) => string;
  getSlotLabel: (slot: string) => string;
}) {
  if (data.length === 0) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;
  }
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-6 py-3 font-medium text-gray-500">{slotLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{clicksLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{checkoutLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{paidLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{revenueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row) => (
            <tr key={row.slot} className="transition-colors hover:bg-gray-50">
              <td className="px-6 py-3">
                <div className="font-medium text-gray-900">{getSlotLabel(row.slot)}</div>
                <div className="mt-0.5 text-xs text-gray-500">{row.slot}</div>
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.clicks)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.checkoutViews)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.ordersPaid)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                {formatRevenue(row.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckoutLeakageTable({
  data,
  emptyTitle,
  emptyDescription,
  segmentLabel,
  createdLabel,
  paidLabel,
  cancelledLabel,
  pendingLabel,
  revenueLabel,
  formatRevenue,
}: {
  data: AnalyticsData['commerce']['checkoutLeakage'];
  emptyTitle: string;
  emptyDescription: string;
  segmentLabel: string;
  createdLabel: string;
  paidLabel: string;
  cancelledLabel: string;
  pendingLabel: string;
  revenueLabel: string;
  formatRevenue: (value: number) => string;
}) {
  if (data.length === 0) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;
  }
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-6 py-3 font-medium text-gray-500">{segmentLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{createdLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{paidLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{cancelledLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{pendingLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{revenueLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row) => (
            <tr key={row.segment} className="transition-colors hover:bg-gray-50">
              <td className="px-6 py-3 font-medium text-gray-900">{row.segment}</td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.ordersCreated)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-success-a11y">
                {numberFormatter.format(row.ordersPaid)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-danger-a11y">
                {numberFormatter.format(row.cancelledOrRefunded)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                {numberFormatter.format(row.pending)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                {formatRevenue(row.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
