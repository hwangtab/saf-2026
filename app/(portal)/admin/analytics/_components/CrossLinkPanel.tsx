import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getTranslations } from 'next-intl/server';

/**
 * 매거진 ↔ 작품 cross-link funnel 분석 패널.
 *
 * 데이터 출처: page_views 테이블의 event_type='event' + event_name in
 * ('story_to_artwork_click', 'artwork_to_story_click') 행. webhook이 event_data
 * jsonb 컬럼에 properties 보존(2026-05-08~). 자체 Vercel-Drain 트래커 인프라.
 *
 * UI:
 * - 4 summary card (양 방향 클릭/방문자)
 * - 매칭 단계(source) 분포 + 카드 위치(position) 분포
 * - 전환 잘 일어나는 매거진 TOP 10 (slug)
 * - 매거진에서 클릭 받은 작품 TOP 10 (artwork_id, artist)
 * - 매거진 클릭을 만드는 작품 TOP 10 (반대 방향)
 *
 * 데이터가 없을 때(no-data state)는 안내 문구만 노출 — 신규 추적이라 운영 초기엔 정상.
 */

const SOURCE_LABEL_KEYS: Record<string, string> = {
  inline: 'sourceInline',
  'artist-fallback': 'sourceArtistFallback',
  'recent-fallback': 'sourceRecentFallback',
};

interface Props {
  data: AnalyticsData['crossLinks'];
}

export default async function CrossLinkPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat();

  const hasAnyData = data.summary.storyToArtworkClicks > 0 || data.summary.artworkToStoryClicks > 0;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('crossLinksTitle')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('crossLinksDescription')}</p>
      </div>

      {/* 4 summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          label={t('storyToArtworkClicks')}
          value={numberFormatter.format(data.summary.storyToArtworkClicks)}
          sub={`${numberFormatter.format(data.summary.storyToArtworkVisitors)} ${t('visitors').toLowerCase()}`}
        />
        <SummaryStat
          label={t('artworkToStoryClicks')}
          value={numberFormatter.format(data.summary.artworkToStoryClicks)}
          sub={`${numberFormatter.format(data.summary.artworkToStoryVisitors)} ${t('visitors').toLowerCase()}`}
        />
        <SummaryStat
          label={t('storyToArtworkVisitors')}
          value={numberFormatter.format(data.summary.storyToArtworkVisitors)}
        />
        <SummaryStat
          label={t('artworkToStoryVisitors')}
          value={numberFormatter.format(data.summary.artworkToStoryVisitors)}
        />
      </div>

      {!hasAnyData ? (
        <AdminCard className="p-0">
          <AdminEmptyState title={t('noCrossLinkData')} description={t('noCrossLinkDataDesc')} />
        </AdminCard>
      ) : (
        <>
          {/* 매칭 단계 분포 + 카드 위치 분포 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AdminCard className="flex flex-col">
              <AdminCardHeader className="rounded-t-2xl">
                <h3 className="text-base font-semibold text-gray-900">
                  {t('sourceDistributionTitle')}
                </h3>
              </AdminCardHeader>
              <SourceDistributionTable
                data={data.sourceDistribution}
                emptyTitle={t('noCrossLinkData')}
                emptyDescription={t('noCrossLinkDataDesc')}
                clicksLabel={t('clicksColumn')}
                visitorsLabel={t('visitors')}
                getSourceLabel={(s) => {
                  const key = SOURCE_LABEL_KEYS[s];
                  return key ? t(key) : t('sourceUnknown');
                }}
              />
            </AdminCard>

            <AdminCard className="flex flex-col">
              <AdminCardHeader className="rounded-t-2xl">
                <h3 className="text-base font-semibold text-gray-900">
                  {t('positionDistributionTitle')}
                </h3>
              </AdminCardHeader>
              <PositionDistributionTable
                data={data.positionDistribution}
                emptyTitle={t('noCrossLinkData')}
                emptyDescription={t('noCrossLinkDataDesc')}
                positionLabel={t('positionColumn')}
                clicksLabel={t('clicksColumn')}
              />
            </AdminCard>
          </div>

          {/* 전환 잘 일어나는 매거진 TOP 10 */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">
                {t('topConvertingStoriesTitle')}
              </h3>
            </AdminCardHeader>
            <StoriesTable
              data={data.topConvertingStories}
              emptyTitle={t('noCrossLinkData')}
              emptyDescription={t('noCrossLinkDataDesc')}
              titleLabel={t('storyTitleColumn')}
              clicksLabel={t('clicksColumn')}
              visitorsLabel={t('visitors')}
            />
          </AdminCard>

          {/* 매거진에서 클릭 받은 작품 TOP 10 */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">
                {t('topClickedArtworksTitle')}
              </h3>
            </AdminCardHeader>
            <ArtworksTable
              data={data.topClickedArtworks}
              emptyTitle={t('noCrossLinkData')}
              emptyDescription={t('noCrossLinkDataDesc')}
              artworkLabel={t('artworkColumn')}
              artistLabel={t('artistColumn')}
              clicksLabel={t('clicksColumn')}
              visitorsLabel={t('visitors')}
            />
          </AdminCard>

          {/* 작품 → 매거진 클릭을 만드는 작품 TOP 10 (반대 방향) */}
          <AdminCard className="flex flex-col">
            <AdminCardHeader className="rounded-t-2xl">
              <h3 className="text-base font-semibold text-gray-900">
                {t('topArtworkSourcesTitle')}
              </h3>
            </AdminCardHeader>
            <ArtworksTable
              data={data.topArtworkSources}
              emptyTitle={t('noCrossLinkData')}
              emptyDescription={t('noCrossLinkDataDesc')}
              artworkLabel={t('artworkColumn')}
              artistLabel={t('artistColumn')}
              clicksLabel={t('clicksColumn')}
              visitorsLabel={t('visitors')}
            />
          </AdminCard>
        </>
      )}
    </section>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <AdminCard className="p-5">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </AdminCard>
  );
}

function StoriesTable({
  data,
  emptyTitle,
  emptyDescription,
  titleLabel,
  clicksLabel,
  visitorsLabel,
}: {
  data: Array<{ storySlug: string; storyTitle: string | null; clicks: number; visitors: number }>;
  emptyTitle: string;
  emptyDescription: string;
  titleLabel: string;
  clicksLabel: string;
  visitorsLabel: string;
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
            <th className="px-6 py-3 font-medium text-gray-500">{titleLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{clicksLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{visitorsLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row) => (
            <tr key={row.storySlug} className="transition-colors hover:bg-gray-50">
              <td className="px-6 py-3 max-w-[500px]">
                {/*
                  새 탭으로 열기: 운영자가 분석 화면 컨텍스트를 잃지 않고 매거진 확인 후 돌아옴.
                  storyTitle이 null인 경우(예: 매거진 삭제 후) slug 단독 표시 — 클릭은 그대로 가능.
                */}
                <a
                  href={`/stories/${row.storySlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-primary-a11y hover:underline"
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
                {numberFormatter.format(row.clicks)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.visitors)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArtworksTable({
  data,
  emptyTitle,
  emptyDescription,
  artworkLabel,
  artistLabel,
  clicksLabel,
  visitorsLabel,
}: {
  data: Array<{
    artworkId: string;
    artworkTitle: string | null;
    artist: string;
    clicks: number;
    visitors: number;
  }>;
  emptyTitle: string;
  emptyDescription: string;
  artworkLabel: string;
  artistLabel: string;
  clicksLabel: string;
  visitorsLabel: string;
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
            <th className="px-6 py-3 font-medium text-gray-500">{artistLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{clicksLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{visitorsLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row) => (
            <tr key={row.artworkId} className="transition-colors hover:bg-gray-50">
              <td className="px-6 py-3 max-w-[400px]">
                {/* 작품 detail 새 탭으로. 작품 title이 비어있으면 id로 fallback. */}
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
                {numberFormatter.format(row.clicks)}
              </td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.visitors)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceDistributionTable({
  data,
  emptyTitle,
  emptyDescription,
  clicksLabel,
  visitorsLabel,
  getSourceLabel,
}: {
  data: Array<{ source: string; clicks: number; visitors: number }>;
  emptyTitle: string;
  emptyDescription: string;
  clicksLabel: string;
  visitorsLabel: string;
  getSourceLabel: (source: string) => string;
}) {
  if (data.length === 0) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;
  }
  const totalClicks = data.reduce((sum, row) => sum + row.clicks, 0);
  const numberFormatter = new Intl.NumberFormat();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-6 py-3 font-medium text-gray-500">Source</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{clicksLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{visitorsLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row) => {
            const pct = totalClicks > 0 ? Math.round((row.clicks / totalClicks) * 1000) / 10 : 0;
            return (
              <tr key={row.source} className="transition-colors hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-700">{getSourceLabel(row.source)}</td>
                <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                  {numberFormatter.format(row.clicks)}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                  {numberFormatter.format(row.visitors)}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-gray-500">{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PositionDistributionTable({
  data,
  emptyTitle,
  emptyDescription,
  positionLabel,
  clicksLabel,
}: {
  data: Array<{ position: number; clicks: number }>;
  emptyTitle: string;
  emptyDescription: string;
  positionLabel: string;
  clicksLabel: string;
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
            <th className="px-6 py-3 font-medium text-gray-500">{positionLabel}</th>
            <th className="px-6 py-3 text-right font-medium text-gray-500">{clicksLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row) => (
            <tr key={row.position} className="transition-colors hover:bg-gray-50">
              <td className="px-6 py-3 text-gray-700">#{row.position + 1}</td>
              <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                {numberFormatter.format(row.clicks)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
