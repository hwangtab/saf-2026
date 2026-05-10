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
   * 빠른 win 4종 — 기존 page_views 데이터로 산출 가능한 경영자 인사이트.
   * - sessionDepth: avg/median pages per session (engagement)
   * - topExitPages: 어디서 사이트 떠나는지 (CRO 직격)
   * - visitorRecurrence: 신규 vs 재방문자
   * - utmDistribution: 캠페인·매체별 traffic (마케팅 ROI)
   */
  insights: {
    sessionDepth: {
      totalSessions: number;
      totalPageviews: number;
      avgPagesPerSession: number;
      medianPagesPerSession: number;
    };
    topExitPages: Array<{
      path: string;
      exitCount: number;
      totalViews: number;
      exitRate: number;
    }>;
    visitorRecurrence: {
      newVisitors: number;
      returningVisitors: number;
      newVisitorPageviews: number;
      returningVisitorPageviews: number;
    };
    utmDistribution: Array<{
      utmSource: string;
      utmMedium: string;
      utmCampaign: string;
      views: number;
      visitors: number;
    }>;
  };
  /**
   * Commerce funnel — 작품 페이지뷰부터 결제까지. 매출 의사결정 핵심 지표.
   * - summary: 단계별 unique 수 + 총 매출
   * - topArtworkFunnel: 작품별 funnel (조회→체크아웃→결제 conversion rate). 페이지뷰 많은데 안 팔리는 작품 식별
   * - revenueDailyTrend: 일별 매출 추이 (결제 완료 기준)
   */
  commerce: {
    summary: {
      artworkViews: number;
      uniqueArtworkVisitors: number;
      checkoutViews: number;
      uniqueCheckoutVisitors: number;
      ordersCreated: number;
      ordersPaid: number;
      totalRevenue: number;
    };
    topArtworkFunnel: Array<{
      artworkId: string;
      artworkTitle: string | null;
      artist: string;
      views: number;
      uniqueVisitors: number;
      checkoutViews: number;
      ordersCreated: number;
      ordersPaid: number;
      revenue: number;
      viewToCheckoutRate: number;
      checkoutToPaidRate: number;
    }>;
    revenueDailyTrend: Array<{
      date: string;
      ordersPaid: number;
      revenue: number;
    }>;
  };
  /**
   * 작가별·매거진별 commerce 기여도 — Phase C.
   * - artistDashboard: 작가별 페이지뷰·결제·매출·view→paid conversion
   * - storyAttributedRevenue: 매거진에서 클릭된 작품의 결제 매출 (last-touch attribution)
   *
   * Attribution 한계: orders 테이블에 device_id 컬럼이 없어 명시적 사용자 매칭 불가.
   * 단순 last-touch: 매거진에서 클릭된 artwork의 paid 매출을 그 매거진에 기여로 인정.
   */
  attribution: {
    artistDashboard: Array<{
      artistId: string;
      artistName: string;
      artworkCount: number;
      totalViews: number;
      uniqueVisitors: number;
      ordersPaid: number;
      totalRevenue: number;
      viewToPaidRate: number;
    }>;
    storyAttributedRevenue: Array<{
      storySlug: string;
      storyTitle: string | null;
      totalClicks: number;
      uniqueClickers: number;
      attributedOrdersPaid: number;
      attributedRevenue: number;
    }>;
  };
  /**
   * Google Search Console organic SEO 성과 — Phase D.
   * Cron으로 매일 fetch해 gsc_metrics 테이블에 캐시. 최대 30일 보관.
   * - syncStatus: 마지막 sync 시점 (운영자가 데이터 신선도 확인)
   * - dailyTrend: 일별 impressions/clicks/CTR 추이
   * - topQueries: 검색 노출 TOP 키워드
   * - topPages: organic 트래픽 받는 TOP 페이지
   * - lowCtrQueries: 노출 50회+ but CTR 낮은 keyword (메타태그 개선 신호)
   */
  gsc: {
    syncStatus: {
      latestDate: string | null;
      oldestDate: string | null;
      totalRows: number;
      lastFetched: string | null;
    };
    dailyTrend: Array<{
      date: string;
      impressions: number;
      clicks: number;
      ctr: number;
      avgPosition: number;
    }>;
    topQueries: Array<{
      query: string;
      impressions: number;
      clicks: number;
      ctr: number;
      avgPosition: number;
    }>;
    topPages: Array<{
      page: string;
      impressions: number;
      clicks: number;
      ctr: number;
      avgPosition: number;
    }>;
    lowCtrQueries: Array<{
      query: string;
      impressions: number;
      clicks: number;
      ctr: number;
      avgPosition: number;
    }>;
  };
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
    /**
     * UI에서 사용자가 직접 페이지로 이동할 수 있게 storyTitle도 함께 노출 — slug만으로는
     * 운영자가 어떤 매거진인지 알 수 없음. RPC 결과 + stories 테이블 batch fetch 결합.
     * 매거진 삭제·이름 변경 시 fallback: storyTitle null일 수 있음 → UI는 slug 표시.
     */
    topConvertingStories: Array<{
      storySlug: string;
      storyTitle: string | null;
      clicks: number;
      visitors: number;
    }>;
    /** 작품 title + artist도 함께 — id는 보조 표시. */
    topClickedArtworks: Array<{
      artworkId: string;
      artworkTitle: string | null;
      artist: string;
      clicks: number;
      visitors: number;
    }>;
    sourceDistribution: Array<{ source: string; clicks: number; visitors: number }>;
    positionDistribution: Array<{ position: number; clicks: number }>;
    topArtworkSources: Array<{
      artworkId: string;
      artworkTitle: string | null;
      artist: string;
      clicks: number;
      visitors: number;
    }>;
  };
  /**
   * Real User Monitoring — WebVitalsTracker가 자체 page_views 테이블에 적재한
   * web_vitals 이벤트를 기반으로 LCP/CLS/INP/FCP/TTFB의 p75·median·avg·rating 분포를
   * 자체 RPC로 산출. GA4 Custom Dimension 등록 없이도 동작. 데이터 source:
   * page_views.event_name='web_vitals' + event_data jsonb (metric_name·metric_value·
   * metric_rating·page_path 키).
   *
   * Web Vitals 임계값(Google 공식):
   * - LCP good ≤2500ms / poor >4000ms
   * - CLS good ≤0.1 / poor >0.25
   * - INP good ≤200ms / poor >500ms
   * - FCP good ≤1800ms / poor >3000ms
   * - TTFB good ≤800ms / poor >1800ms
   */
  webVitals: {
    summary: Array<{
      metricName: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB' | (string & {});
      totalEvents: number;
      goodCount: number;
      needsImprovementCount: number;
      poorCount: number;
      p75Value: number;
      medianValue: number;
      avgValue: number;
    }>;
    dailyP75: Array<{
      date: string;
      metricName: string;
      sampleSize: number;
      p75Value: number;
      goodRate: number;
    }>;
    /** 가장 흔히 LCP가 나쁜 페이지 — 성능 회귀 진단의 핵심 진입점. */
    lcpWorstPages: Array<{
      pagePath: string;
      sampleSize: number;
      p75Value: number;
      poorCount: number;
    }>;
  };
  /**
   * CTA 클릭 (조합원 가입 / share) — 외부 conversion 의도 추적.
   * 기존 패턴:
   * - member_join_click: CTAButtonGroup·Footer·FullscreenMenu·TrackedDonateButton에서
   *   발화. 조합원 가입 폼(JOIN_MEMBER) 단일 destination — 후원함(socialfunch)은 종료된
   *   캠페인이라 측정 대상 아님
   * - share_click: ShareButtons 5채널(facebook/twitter/kakao/sms/copy_link). 어떤
   *   페이지가 어떤 채널로 공유되는지 측정 → 콘텐츠 viral 진단
   */
  ctaClicks: {
    memberJoin: {
      totalClicks: number;
      uniqueClickers: number;
      positionDistribution: Array<{
        position: string;
        clicks: number;
        uniqueClickers: number;
      }>;
      daily: Array<{ date: string; clicks: number; uniqueClickers: number }>;
    };
    share: {
      totalClicks: number;
      uniqueClickers: number;
      channelDistribution: Array<{
        channel: string;
        clicks: number;
        uniqueClickers: number;
      }>;
      topPages: Array<{ pagePath: string; clicks: number; uniqueClickers: number }>;
    };
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
  type SessionDepthRow = {
    total_sessions: number;
    total_pageviews: number;
    avg_pages_per_session: number;
    median_pages_per_session: number;
  };
  type ExitPageRow = {
    path: string;
    exit_count: number;
    total_views: number;
    exit_rate: number;
  };
  type VisitorRecurrenceRow = {
    new_visitors: number;
    returning_visitors: number;
    new_visitor_pageviews: number;
    returning_visitor_pageviews: number;
  };
  type UtmRow = {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    views: number;
    visitors: number;
  };
  type CommerceFunnelSummaryRow = {
    artwork_views: number;
    unique_artwork_visitors: number;
    checkout_views: number;
    unique_checkout_visitors: number;
    orders_created: number;
    orders_paid: number;
    total_revenue: number;
  };
  type ArtworkFunnelRow = {
    artwork_id: string;
    views: number;
    unique_visitors: number;
    checkout_views: number;
    orders_created: number;
    orders_paid: number;
    revenue: number;
    view_to_checkout_rate: number;
    checkout_to_paid_rate: number;
  };
  type RevenueTrendRow = {
    day: string;
    orders_paid: number;
    revenue: number;
  };
  type ArtistDashboardRow = {
    artist_id: string;
    artist_name: string;
    artwork_count: number;
    total_views: number;
    unique_visitors: number;
    orders_paid: number;
    total_revenue: number;
    view_to_paid_rate: number;
  };
  type StoryAttributionRow = {
    story_slug: string;
    total_clicks: number;
    unique_clickers: number;
    attributed_orders_paid: number;
    attributed_revenue: number;
  };
  type GscQueryRow = {
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    avg_position: number;
  };
  type GscPageRow = {
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    avg_position: number;
  };
  type GscDailyRow = {
    day: string;
    impressions: number;
    clicks: number;
    ctr: number;
    avg_position: number;
  };
  type GscSyncStatusRow = {
    latest_date: string | null;
    oldest_date: string | null;
    total_rows: number;
    last_fetched: string | null;
  };
  type WebVitalsSummaryRow = {
    metric_name: string;
    total_events: number;
    good_count: number;
    needs_improvement_count: number;
    poor_count: number;
    p75_value: number;
    median_value: number;
    avg_value: number;
  };
  type WebVitalsDailyRow = {
    day: string;
    metric_name: string;
    sample_size: number;
    p75_value: number;
    good_rate: number;
  };
  type WebVitalsWorstPageRow = {
    page_path: string;
    sample_size: number;
    p75_value: number;
    poor_count: number;
  };
  type MemberJoinSummaryRow = {
    total_clicks: number;
    unique_clickers: number;
  };
  type MemberJoinPositionRow = {
    position_name: string;
    clicks: number;
    unique_clickers: number;
  };
  type MemberJoinDailyRow = {
    day: string;
    clicks: number;
    unique_clickers: number;
  };
  type ShareSummaryRow = {
    total_clicks: number;
    unique_clickers: number;
  };
  type ShareChannelRow = {
    channel: string;
    clicks: number;
    unique_clickers: number;
  };
  type SharePageRow = {
    page_path: string;
    clicks: number;
    unique_clickers: number;
  };

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
    sessionDepthRes,
    exitPagesRes,
    visitorRecurrenceRes,
    utmDistRes,
    commerceFunnelSummaryRes,
    artworkFunnelRes,
    revenueTrendRes,
    artistDashboardRes,
    storyAttributionRes,
    gscTopQueriesRes,
    gscTopPagesRes,
    gscLowCtrRes,
    gscDailyTrendRes,
    gscSyncStatusRes,
    webVitalsSummaryRes,
    webVitalsDailyRes,
    webVitalsLcpWorstRes,
    memberJoinSummaryRes,
    memberJoinPositionRes,
    memberJoinDailyRes,
    shareSummaryRes,
    shareChannelRes,
    sharePagesRes,
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
    untypedRpc<SessionDepthRow[]>('get_pv_session_depth', { since_ts: sinceTs }),
    untypedRpc<ExitPageRow[]>('get_pv_top_exit_pages', { since_ts: sinceTs, lim: 10 }),
    untypedRpc<VisitorRecurrenceRow[]>('get_pv_visitor_recurrence', { since_ts: sinceTs }),
    untypedRpc<UtmRow[]>('get_pv_utm_distribution', { since_ts: sinceTs, lim: 20 }),
    untypedRpc<CommerceFunnelSummaryRow[]>('get_commerce_funnel_summary', { since_ts: sinceTs }),
    untypedRpc<ArtworkFunnelRow[]>('get_top_artwork_funnel', { since_ts: sinceTs, lim: 20 }),
    untypedRpc<RevenueTrendRow[]>('get_revenue_daily_trend', { since_ts: sinceTs }),
    untypedRpc<ArtistDashboardRow[]>('get_artist_commerce_dashboard', {
      since_ts: sinceTs,
      lim: 30,
    }),
    untypedRpc<StoryAttributionRow[]>('get_story_attributed_revenue', {
      since_ts: sinceTs,
      lim: 20,
    }),
    // GSC RPC들은 date 타입이 since_date param. ISO timestamp의 앞 10자(YYYY-MM-DD) 사용.
    untypedRpc<GscQueryRow[]>('get_gsc_top_queries', {
      since_date: sinceTs.slice(0, 10),
      lim: 30,
    }),
    untypedRpc<GscPageRow[]>('get_gsc_top_pages', {
      since_date: sinceTs.slice(0, 10),
      lim: 30,
    }),
    untypedRpc<GscQueryRow[]>('get_gsc_low_ctr_queries', {
      since_date: sinceTs.slice(0, 10),
      min_impressions: 50,
      lim: 20,
    }),
    untypedRpc<GscDailyRow[]>('get_gsc_daily_trend', {
      since_date: sinceTs.slice(0, 10),
    }),
    untypedRpc<GscSyncStatusRow[]>('get_gsc_sync_status', {}),
    untypedRpc<WebVitalsSummaryRow[]>('get_web_vitals_summary', { since_ts: sinceTs }),
    untypedRpc<WebVitalsDailyRow[]>('get_web_vitals_daily_p75', { since_ts: sinceTs }),
    untypedRpc<WebVitalsWorstPageRow[]>('get_web_vitals_worst_pages', {
      since_ts: sinceTs,
      target_metric: 'LCP',
      lim: 10,
    }),
    untypedRpc<MemberJoinSummaryRow[]>('get_member_join_click_summary', {
      since_ts: sinceTs,
    }),
    untypedRpc<MemberJoinPositionRow[]>('get_member_join_click_position_distribution', {
      since_ts: sinceTs,
    }),
    untypedRpc<MemberJoinDailyRow[]>('get_member_join_click_daily', { since_ts: sinceTs }),
    untypedRpc<ShareSummaryRow[]>('get_share_click_summary', { since_ts: sinceTs }),
    untypedRpc<ShareChannelRow[]>('get_share_click_channel_distribution', {
      since_ts: sinceTs,
    }),
    untypedRpc<SharePageRow[]>('get_top_shared_pages', { since_ts: sinceTs, lim: 10 }),
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

  // RPC 결과의 slug/id를 운영자가 알아볼 수 있게 title/artist로 hydrate.
  // RPC를 join 형태로 다시 짜는 대신 server action에서 batch fetch — 작은 N(<=10)이라
  // 부담 작고 RPC schema 단순 유지.
  const storySlugs = Array.from(
    new Set([
      ...(Array.isArray(topConvertingStoriesRes.data)
        ? topConvertingStoriesRes.data.map((r) => r.story_slug)
        : []),
      // Phase C: story attribution에 등장하는 slug도 함께 hydrate
      ...(Array.isArray(storyAttributionRes.data)
        ? storyAttributionRes.data.map((r) => r.story_slug).filter((s): s is string => Boolean(s))
        : []),
    ])
  );
  const artworkIds = Array.from(
    new Set([
      ...(Array.isArray(topClickedArtworksRes.data)
        ? topClickedArtworksRes.data.map((r) => r.artwork_id)
        : []),
      ...(Array.isArray(topArtworkSourcesRes.data)
        ? topArtworkSourcesRes.data.map((r) => r.artwork_id)
        : []),
      // Phase B: artwork funnel에 등장하는 작품 id도 함께 hydrate
      ...(Array.isArray(artworkFunnelRes.data)
        ? artworkFunnelRes.data.map((r) => r.artwork_id).filter((id): id is string => Boolean(id))
        : []),
    ])
  );

  const [storyMetaRes, artworkMetaRes] = await Promise.all([
    storySlugs.length > 0
      ? supabase.from('stories').select('slug, title').in('slug', storySlugs)
      : Promise.resolve({ data: [] as Array<{ slug: string; title: string }> }),
    artworkIds.length > 0
      ? supabase.from('artworks').select('id, title, artists(name_ko)').in('id', artworkIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; title: string; artists: { name_ko: string } | null }>,
        }),
  ]);

  const storyTitleByslug = new Map<string, string>();
  if (Array.isArray(storyMetaRes.data)) {
    for (const s of storyMetaRes.data) {
      if (s?.slug && s?.title) storyTitleByslug.set(s.slug, s.title);
    }
  }
  const artworkMetaById = new Map<string, { title: string; artist: string }>();
  if (Array.isArray(artworkMetaRes.data)) {
    for (const a of artworkMetaRes.data as Array<{
      id: string;
      title: string;
      artists: { name_ko: string } | null;
    }>) {
      if (a?.id) {
        artworkMetaById.set(a.id, {
          title: a.title ?? '',
          artist: a.artists?.name_ko ?? '',
        });
      }
    }
  }

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
          storyTitle: storyTitleByslug.get(row.story_slug) ?? null,
          clicks: Number(row.clicks),
          visitors: Number(row.visitors),
        }))
      : [],
    topClickedArtworks: Array.isArray(topClickedArtworksRes.data)
      ? topClickedArtworksRes.data.map((row) => {
          const meta = artworkMetaById.get(row.artwork_id);
          return {
            artworkId: row.artwork_id,
            artworkTitle: meta?.title ?? null,
            // RPC가 event_data에서 가져온 artist는 이벤트 발생 시점 snapshot — 작가 이름
            // 변경됐으면 stale. artworks 테이블의 현재 작가가 더 정확.
            artist: meta?.artist || row.artist,
            clicks: Number(row.clicks),
            visitors: Number(row.visitors),
          };
        })
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
      ? topArtworkSourcesRes.data.map((row) => {
          const meta = artworkMetaById.get(row.artwork_id);
          return {
            artworkId: row.artwork_id,
            artworkTitle: meta?.title ?? null,
            artist: meta?.artist || row.artist,
            clicks: Number(row.clicks),
            visitors: Number(row.visitors),
          };
        })
      : [],
  };

  // Phase A 인사이트 — 마이그레이션 적용 전엔 RPC 없어 0/[] fallback.
  const sessionDepthRow = Array.isArray(sessionDepthRes.data) ? sessionDepthRes.data[0] : null;
  const visitorRecurrenceRow = Array.isArray(visitorRecurrenceRes.data)
    ? visitorRecurrenceRes.data[0]
    : null;

  const insights: AnalyticsData['insights'] = {
    sessionDepth: {
      totalSessions: Number(sessionDepthRow?.total_sessions ?? 0),
      totalPageviews: Number(sessionDepthRow?.total_pageviews ?? 0),
      avgPagesPerSession: Number(sessionDepthRow?.avg_pages_per_session ?? 0),
      medianPagesPerSession: Number(sessionDepthRow?.median_pages_per_session ?? 0),
    },
    topExitPages: Array.isArray(exitPagesRes.data)
      ? exitPagesRes.data.map((row) => ({
          path: row.path,
          exitCount: Number(row.exit_count),
          totalViews: Number(row.total_views),
          exitRate: Number(row.exit_rate),
        }))
      : [],
    visitorRecurrence: {
      newVisitors: Number(visitorRecurrenceRow?.new_visitors ?? 0),
      returningVisitors: Number(visitorRecurrenceRow?.returning_visitors ?? 0),
      newVisitorPageviews: Number(visitorRecurrenceRow?.new_visitor_pageviews ?? 0),
      returningVisitorPageviews: Number(visitorRecurrenceRow?.returning_visitor_pageviews ?? 0),
    },
    utmDistribution: Array.isArray(utmDistRes.data)
      ? utmDistRes.data.map((row) => ({
          utmSource: row.utm_source,
          utmMedium: row.utm_medium,
          utmCampaign: row.utm_campaign,
          views: Number(row.views),
          visitors: Number(row.visitors),
        }))
      : [],
  };

  // Phase B: Commerce funnel
  const commerceFunnelSummaryRow = Array.isArray(commerceFunnelSummaryRes.data)
    ? commerceFunnelSummaryRes.data[0]
    : null;
  const commerce: AnalyticsData['commerce'] = {
    summary: {
      artworkViews: Number(commerceFunnelSummaryRow?.artwork_views ?? 0),
      uniqueArtworkVisitors: Number(commerceFunnelSummaryRow?.unique_artwork_visitors ?? 0),
      checkoutViews: Number(commerceFunnelSummaryRow?.checkout_views ?? 0),
      uniqueCheckoutVisitors: Number(commerceFunnelSummaryRow?.unique_checkout_visitors ?? 0),
      ordersCreated: Number(commerceFunnelSummaryRow?.orders_created ?? 0),
      ordersPaid: Number(commerceFunnelSummaryRow?.orders_paid ?? 0),
      totalRevenue: Number(commerceFunnelSummaryRow?.total_revenue ?? 0),
    },
    topArtworkFunnel: Array.isArray(artworkFunnelRes.data)
      ? artworkFunnelRes.data.map((row) => {
          const meta = artworkMetaById.get(row.artwork_id);
          return {
            artworkId: row.artwork_id,
            artworkTitle: meta?.title ?? null,
            artist: meta?.artist ?? '',
            views: Number(row.views),
            uniqueVisitors: Number(row.unique_visitors),
            checkoutViews: Number(row.checkout_views),
            ordersCreated: Number(row.orders_created),
            ordersPaid: Number(row.orders_paid),
            revenue: Number(row.revenue),
            viewToCheckoutRate: Number(row.view_to_checkout_rate ?? 0),
            checkoutToPaidRate: Number(row.checkout_to_paid_rate ?? 0),
          };
        })
      : [],
    revenueDailyTrend: Array.isArray(revenueTrendRes.data)
      ? revenueTrendRes.data.map((row) => ({
          date: row.day,
          ordersPaid: Number(row.orders_paid),
          revenue: Number(row.revenue),
        }))
      : [],
  };

  // Phase C: 작가/매거진 attribution
  const attribution: AnalyticsData['attribution'] = {
    artistDashboard: Array.isArray(artistDashboardRes.data)
      ? artistDashboardRes.data.map((row) => ({
          artistId: row.artist_id,
          artistName: row.artist_name,
          artworkCount: Number(row.artwork_count),
          totalViews: Number(row.total_views),
          uniqueVisitors: Number(row.unique_visitors),
          ordersPaid: Number(row.orders_paid),
          totalRevenue: Number(row.total_revenue),
          viewToPaidRate: Number(row.view_to_paid_rate ?? 0),
        }))
      : [],
    storyAttributedRevenue: Array.isArray(storyAttributionRes.data)
      ? storyAttributionRes.data.map((row) => ({
          storySlug: row.story_slug,
          storyTitle: storyTitleByslug.get(row.story_slug) ?? null,
          totalClicks: Number(row.total_clicks),
          uniqueClickers: Number(row.unique_clickers),
          attributedOrdersPaid: Number(row.attributed_orders_paid),
          attributedRevenue: Number(row.attributed_revenue),
        }))
      : [],
  };

  // Phase D: Google Search Console (GSC) organic SEO
  const gscSyncStatusRow = Array.isArray(gscSyncStatusRes.data) ? gscSyncStatusRes.data[0] : null;
  const gsc: AnalyticsData['gsc'] = {
    syncStatus: {
      latestDate: gscSyncStatusRow?.latest_date ?? null,
      oldestDate: gscSyncStatusRow?.oldest_date ?? null,
      totalRows: Number(gscSyncStatusRow?.total_rows ?? 0),
      lastFetched: gscSyncStatusRow?.last_fetched ?? null,
    },
    dailyTrend: Array.isArray(gscDailyTrendRes.data)
      ? gscDailyTrendRes.data.map((row) => ({
          date: row.day,
          impressions: Number(row.impressions),
          clicks: Number(row.clicks),
          ctr: Number(row.ctr ?? 0),
          avgPosition: Number(row.avg_position ?? 0),
        }))
      : [],
    topQueries: Array.isArray(gscTopQueriesRes.data)
      ? gscTopQueriesRes.data.map((row) => ({
          query: row.query,
          impressions: Number(row.impressions),
          clicks: Number(row.clicks),
          ctr: Number(row.ctr ?? 0),
          avgPosition: Number(row.avg_position ?? 0),
        }))
      : [],
    topPages: Array.isArray(gscTopPagesRes.data)
      ? gscTopPagesRes.data.map((row) => ({
          page: row.page,
          impressions: Number(row.impressions),
          clicks: Number(row.clicks),
          ctr: Number(row.ctr ?? 0),
          avgPosition: Number(row.avg_position ?? 0),
        }))
      : [],
    lowCtrQueries: Array.isArray(gscLowCtrRes.data)
      ? gscLowCtrRes.data.map((row) => ({
          query: row.query,
          impressions: Number(row.impressions),
          clicks: Number(row.clicks),
          ctr: Number(row.ctr ?? 0),
          avgPosition: Number(row.avg_position ?? 0),
        }))
      : [],
  };

  // CTA 클릭 (조합원 가입 / share) — Phase B
  // RPC 에러는 Promise.all 안에서 swallow되므로(fulfilled with error data) 진단 로깅 추가.
  // 빈 결과(0건)와 실패(권한·SQL 에러)를 운영 로그에서 구분 가능.
  const ctaRpcResults = [
    ['get_member_join_click_summary', memberJoinSummaryRes],
    ['get_member_join_click_position_distribution', memberJoinPositionRes],
    ['get_member_join_click_daily', memberJoinDailyRes],
    ['get_share_click_summary', shareSummaryRes],
    ['get_share_click_channel_distribution', shareChannelRes],
    ['get_top_shared_pages', sharePagesRes],
    ['get_web_vitals_summary', webVitalsSummaryRes],
    ['get_web_vitals_daily_p75', webVitalsDailyRes],
    ['get_web_vitals_worst_pages', webVitalsLcpWorstRes],
  ] as const;
  for (const [name, res] of ctaRpcResults) {
    if (res.error) {
      console.error(`[admin-analytics] RPC ${name} failed:`, res.error);
    }
  }

  const memberJoinSummaryRow = Array.isArray(memberJoinSummaryRes.data)
    ? memberJoinSummaryRes.data[0]
    : null;
  const shareSummaryRow = Array.isArray(shareSummaryRes.data) ? shareSummaryRes.data[0] : null;

  // member_join daily — 0인 날 행 추가 (트래픽 없는 날과 데이터 누락 구분 위해 dailyTrend와 동일 패턴)
  const memberJoinDailyMap = new Map<string, { clicks: number; uniqueClickers: number }>();
  if (Array.isArray(memberJoinDailyRes.data)) {
    for (const row of memberJoinDailyRes.data) {
      memberJoinDailyMap.set(row.day, {
        clicks: Number(row.clicks),
        uniqueClickers: Number(row.unique_clickers),
      });
    }
  }
  const memberJoinDaily: Array<{ date: string; clicks: number; uniqueClickers: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = memberJoinDailyMap.get(dateStr);
    memberJoinDaily.push({
      date: dateStr,
      clicks: entry?.clicks ?? 0,
      uniqueClickers: entry?.uniqueClickers ?? 0,
    });
  }

  const ctaClicks: AnalyticsData['ctaClicks'] = {
    memberJoin: {
      totalClicks: Number(memberJoinSummaryRow?.total_clicks ?? 0),
      uniqueClickers: Number(memberJoinSummaryRow?.unique_clickers ?? 0),
      positionDistribution: Array.isArray(memberJoinPositionRes.data)
        ? memberJoinPositionRes.data.map((row) => ({
            position: row.position_name,
            clicks: Number(row.clicks),
            uniqueClickers: Number(row.unique_clickers),
          }))
        : [],
      daily: memberJoinDaily,
    },
    share: {
      totalClicks: Number(shareSummaryRow?.total_clicks ?? 0),
      uniqueClickers: Number(shareSummaryRow?.unique_clickers ?? 0),
      channelDistribution: Array.isArray(shareChannelRes.data)
        ? shareChannelRes.data.map((row) => ({
            channel: row.channel,
            clicks: Number(row.clicks),
            uniqueClickers: Number(row.unique_clickers),
          }))
        : [],
      topPages: Array.isArray(sharePagesRes.data)
        ? sharePagesRes.data.map((row) => ({
            pagePath: row.page_path,
            clicks: Number(row.clicks),
            uniqueClickers: Number(row.unique_clickers),
          }))
        : [],
    },
  };

  // Real User Monitoring (Web Vitals 자체 적재 기반)
  const webVitals: AnalyticsData['webVitals'] = {
    summary: Array.isArray(webVitalsSummaryRes.data)
      ? webVitalsSummaryRes.data.map((row) => ({
          metricName: row.metric_name,
          totalEvents: Number(row.total_events),
          goodCount: Number(row.good_count),
          needsImprovementCount: Number(row.needs_improvement_count),
          poorCount: Number(row.poor_count),
          p75Value: Number(row.p75_value ?? 0),
          medianValue: Number(row.median_value ?? 0),
          avgValue: Number(row.avg_value ?? 0),
        }))
      : [],
    dailyP75: Array.isArray(webVitalsDailyRes.data)
      ? webVitalsDailyRes.data.map((row) => ({
          date: row.day,
          metricName: row.metric_name,
          sampleSize: Number(row.sample_size),
          p75Value: Number(row.p75_value ?? 0),
          goodRate: Number(row.good_rate ?? 0),
        }))
      : [],
    lcpWorstPages: Array.isArray(webVitalsLcpWorstRes.data)
      ? webVitalsLcpWorstRes.data.map((row) => ({
          pagePath: row.page_path,
          sampleSize: Number(row.sample_size),
          p75Value: Number(row.p75_value ?? 0),
          poorCount: Number(row.poor_count),
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
    insights,
    commerce,
    attribution,
    crossLinks,
    gsc,
    webVitals,
    ctaClicks,
  };
}
