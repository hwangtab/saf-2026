'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';

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
};

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function getAnalyticsData(period: AnalyticsPeriod = '30d'): Promise<AnalyticsData> {
  await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  if (!(period in PERIOD_DAYS)) throw new Error('Invalid period');
  const days = PERIOD_DAYS[period];
  const sinceTs = new Date(Date.now() - days * 86_400_000).toISOString();

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
  };
}
