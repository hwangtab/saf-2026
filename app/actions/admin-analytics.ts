'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

export type AnalyticsData = {
  period: AnalyticsPeriod;
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgViewsPerVisitor: number;
  };
  realtime: {
    activeVisitors: number;
    activePageviews: number;
  };
  dailyTrend: Array<{ date: string; views: number; visitors: number }>;
  topPages: Array<{ path: string; views: number; visitors: number }>;
  deviceDistribution: Array<{ type: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  countryDistribution: Array<{ country: string; views: number; visitors: number }>;
  browserDistribution: Array<{ browser: string; count: number }>;
  osDistribution: Array<{ os: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; views: number; visitors: number }>;
  /**
   * 매거진↔작품 cross-link funnel — 본문에 작품 인용 → 카드 클릭으로 이어지는 흐름.
   * 데이터 source는 page_views 테이블의 event_type='event' + event_name='*_click' 행.
   * 2026-05-08부터 webhook이 event_data jsonb 컬럼에 properties 보존해 활성화됨.
   */
  crossLinks: {
    summary: {
      storyToArtworkClicks: number;
      storyToArtworkVisitors: number;
      artworkToStoryClicks: number;
      artworkToStoryVisitors: number;
    };
    topConvertingStories: Array<{ storySlug: string; clicks: number; visitors: number }>;
    topClickedArtworks: Array<{
      artworkId: string;
      artist: string;
      clicks: number;
      visitors: number;
    }>;
    sourceDistribution: Array<{ source: string; clicks: number; visitors: number }>;
    positionDistribution: Array<{ position: number; clicks: number }>;
    topArtworkSources: Array<{
      artworkId: string;
      artist: string;
      clicks: number;
      visitors: number;
    }>;
  };
};

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function getAnalyticsData(period: AnalyticsPeriod = '30d'): Promise<AnalyticsData> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  if (!(period in PERIOD_DAYS)) throw new Error('Invalid period');
  const days = PERIOD_DAYS[period];
  const sinceTs = new Date(Date.now() - days * 86_400_000).toISOString();

  // 새 cross-link RPC들은 generated supabase types에 아직 없어 typed client에서
  // 호출 시 union literal 에러 발생. types 자동 생성이 다음 supabase gen-types
  // 사이클에서 갱신될 때까지 untyped wrapper로 우회 — runtime은 동일.
  type RpcResult<T> = { data: T | null; error: unknown };
  const untypedRpc = supabase.rpc.bind(supabase) as unknown as <T>(
    name: string,
    args?: Record<string, unknown>
  ) => Promise<RpcResult<T>>;

  type CrossLinkSummaryRow = {
    story_to_artwork_clicks: number;
    story_to_artwork_visitors: number;
    artwork_to_story_clicks: number;
    artwork_to_story_visitors: number;
  };
  type StoryRow = { story_slug: string; clicks: number; visitors: number };
  type ArtworkRow = {
    artwork_id: string;
    artist: string;
    clicks: number;
    visitors: number;
  };
  type SourceRow = { source: string; clicks: number; visitors: number };
  // `position`은 PG reserved keyword라 RPC 컬럼명을 `card_position`으로 정의
  // (마이그레이션 20260508110000 참조). 호출부는 그대로 position number로 매핑.
  type PositionRow = { card_position: number; clicks: number };

  const [
    summaryRes,
    trendRes,
    pagesRes,
    deviceRes,
    referrerRes,
    countryRes,
    browserRes,
    osRes,
    hourlyRes,
    realtimeRes,
    crossLinkSummaryRes,
    topConvertingStoriesRes,
    topClickedArtworksRes,
    sourceDistRes,
    positionDistRes,
    topArtworkSourcesRes,
  ] = await Promise.all([
    supabase.rpc('get_pv_summary', { since_ts: sinceTs }),
    supabase.rpc('get_pv_daily_trend', { since_ts: sinceTs }),
    supabase.rpc('get_pv_top_pages', { since_ts: sinceTs, lim: 10 }),
    supabase.rpc('get_pv_device_distribution', { since_ts: sinceTs }),
    supabase.rpc('get_pv_top_referrers', { since_ts: sinceTs, lim: 10 }),
    supabase.rpc('get_pv_country_distribution', { since_ts: sinceTs, lim: 20 }),
    supabase.rpc('get_pv_browser_distribution', { since_ts: sinceTs, lim: 10 }),
    supabase.rpc('get_pv_os_distribution', { since_ts: sinceTs, lim: 10 }),
    supabase.rpc('get_pv_hourly_distribution', { since_ts: sinceTs }),
    supabase.rpc('get_pv_realtime_visitors', { minutes: 5 }),
    untypedRpc<CrossLinkSummaryRow[]>('get_cross_link_summary', { since_ts: sinceTs }),
    untypedRpc<StoryRow[]>('get_top_converting_stories', { since_ts: sinceTs, lim: 10 }),
    untypedRpc<ArtworkRow[]>('get_top_clicked_artworks_from_stories', {
      since_ts: sinceTs,
      lim: 10,
    }),
    untypedRpc<SourceRow[]>('get_story_to_artwork_source_distribution', { since_ts: sinceTs }),
    untypedRpc<PositionRow[]>('get_story_to_artwork_position_distribution', {
      since_ts: sinceTs,
    }),
    untypedRpc<ArtworkRow[]>('get_top_artwork_to_story_artworks', {
      since_ts: sinceTs,
      lim: 10,
    }),
  ]);

  // Summary
  const summaryRow = Array.isArray(summaryRes.data) ? summaryRes.data[0] : null;
  const totalPageViews = Number(summaryRow?.total_views ?? 0);
  const uniqueVisitors = Number(summaryRow?.unique_visitors ?? 0);
  const avgViewsPerVisitor =
    uniqueVisitors > 0 ? Math.round((totalPageViews / uniqueVisitors) * 10) / 10 : 0;

  // Daily trend — fill missing dates with 0
  const trendMap = new Map<string, { views: number; visitors: number }>();
  if (Array.isArray(trendRes.data)) {
    for (const row of trendRes.data) {
      trendMap.set(row.day, {
        views: Number(row.views),
        visitors: Number(row.visitors),
      });
    }
  }

  const dailyTrend: AnalyticsData['dailyTrend'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = trendMap.get(dateStr);
    dailyTrend.push({
      date: dateStr,
      views: entry?.views ?? 0,
      visitors: entry?.visitors ?? 0,
    });
  }

  // Top pages
  const topPages: AnalyticsData['topPages'] = Array.isArray(pagesRes.data)
    ? pagesRes.data.map((row: { path: string; views: number; visitors: number }) => ({
        path: row.path,
        views: Number(row.views),
        visitors: Number(row.visitors),
      }))
    : [];

  // Device distribution
  const deviceDistribution: AnalyticsData['deviceDistribution'] = Array.isArray(deviceRes.data)
    ? deviceRes.data.map((row: { device_type: string; count: number }) => ({
        type: row.device_type,
        count: Number(row.count),
      }))
    : [];

  // Top referrers
  const topReferrers: AnalyticsData['topReferrers'] = Array.isArray(referrerRes.data)
    ? referrerRes.data.map((row: { referrer: string; count: number }) => ({
        referrer: row.referrer,
        count: Number(row.count),
      }))
    : [];

  // Country distribution
  const countryDistribution: AnalyticsData['countryDistribution'] = Array.isArray(countryRes.data)
    ? countryRes.data.map((row: { country: string; views: number; visitors: number }) => ({
        country: row.country,
        views: Number(row.views),
        visitors: Number(row.visitors),
      }))
    : [];

  // Browser distribution
  const browserDistribution: AnalyticsData['browserDistribution'] = Array.isArray(browserRes.data)
    ? browserRes.data.map((row: { browser: string; count: number }) => ({
        browser: row.browser,
        count: Number(row.count),
      }))
    : [];

  // OS distribution
  const osDistribution: AnalyticsData['osDistribution'] = Array.isArray(osRes.data)
    ? osRes.data.map((row: { os: string; count: number }) => ({
        os: row.os,
        count: Number(row.count),
      }))
    : [];

  // Hourly distribution — fill missing hours with 0
  const hourlyMap = new Map<number, { views: number; visitors: number }>();
  if (Array.isArray(hourlyRes.data)) {
    for (const row of hourlyRes.data) {
      hourlyMap.set(Number(row.hour), {
        views: Number(row.views),
        visitors: Number(row.visitors),
      });
    }
  }
  const hourlyDistribution: AnalyticsData['hourlyDistribution'] = [];
  for (let h = 0; h < 24; h++) {
    const entry = hourlyMap.get(h);
    hourlyDistribution.push({ hour: h, views: entry?.views ?? 0, visitors: entry?.visitors ?? 0 });
  }

  // Realtime
  const realtimeRow = Array.isArray(realtimeRes.data) ? realtimeRes.data[0] : null;
  const realtime: AnalyticsData['realtime'] = {
    activeVisitors: Number(realtimeRow?.active_visitors ?? 0),
    activePageviews: Number(realtimeRow?.active_pageviews ?? 0),
  };

  // Cross-link funnel — untypedRpc로 호출했으므로 .data가 이미 generic-typed.
  // 운영 DB에 마이그레이션 적용 전엔 RPC 자체가 없어 .data가 null — 모두 안전한 0/[] fallback.
  const crossLinkSummaryRow = Array.isArray(crossLinkSummaryRes.data)
    ? crossLinkSummaryRes.data[0]
    : null;
  const crossLinks: AnalyticsData['crossLinks'] = {
    summary: {
      storyToArtworkClicks: Number(crossLinkSummaryRow?.story_to_artwork_clicks ?? 0),
      storyToArtworkVisitors: Number(crossLinkSummaryRow?.story_to_artwork_visitors ?? 0),
      artworkToStoryClicks: Number(crossLinkSummaryRow?.artwork_to_story_clicks ?? 0),
      artworkToStoryVisitors: Number(crossLinkSummaryRow?.artwork_to_story_visitors ?? 0),
    },
    topConvertingStories: Array.isArray(topConvertingStoriesRes.data)
      ? topConvertingStoriesRes.data.map((row) => ({
          storySlug: row.story_slug,
          clicks: Number(row.clicks),
          visitors: Number(row.visitors),
        }))
      : [],
    topClickedArtworks: Array.isArray(topClickedArtworksRes.data)
      ? topClickedArtworksRes.data.map((row) => ({
          artworkId: row.artwork_id,
          artist: row.artist,
          clicks: Number(row.clicks),
          visitors: Number(row.visitors),
        }))
      : [],
    sourceDistribution: Array.isArray(sourceDistRes.data)
      ? sourceDistRes.data.map((row) => ({
          source: row.source,
          clicks: Number(row.clicks),
          visitors: Number(row.visitors),
        }))
      : [],
    positionDistribution: Array.isArray(positionDistRes.data)
      ? positionDistRes.data.map((row) => ({
          position: Number(row.card_position),
          clicks: Number(row.clicks),
        }))
      : [],
    topArtworkSources: Array.isArray(topArtworkSourcesRes.data)
      ? topArtworkSourcesRes.data.map((row) => ({
          artworkId: row.artwork_id,
          artist: row.artist,
          clicks: Number(row.clicks),
          visitors: Number(row.visitors),
        }))
      : [],
  };

  return {
    period,
    summary: { totalPageViews, uniqueVisitors, avgViewsPerVisitor },
    realtime,
    dailyTrend,
    topPages,
    deviceDistribution,
    topReferrers,
    countryDistribution,
    browserDistribution,
    osDistribution,
    hourlyDistribution,
    crossLinks,
  };
}
