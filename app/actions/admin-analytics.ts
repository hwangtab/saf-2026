'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

export type AnalyticsData = {
  period: AnalyticsPeriod;
  summary: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgViewsPerVisitor: number;
  };
  dailyTrend: Array<{ date: string; views: number; visitors: number }>;
  topPages: Array<{ path: string; views: number; visitors: number }>;
  deviceDistribution: Array<{ type: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
};

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export async function getAnalyticsData(period: AnalyticsPeriod = '30d'): Promise<AnalyticsData> {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const days = PERIOD_DAYS[period];
  const sinceTs = new Date(Date.now() - days * 86_400_000).toISOString();

  const [summaryRes, trendRes, pagesRes, deviceRes, referrerRes] = await Promise.all([
    supabase.rpc('get_pv_summary', { since_ts: sinceTs }),
    supabase.rpc('get_pv_daily_trend', { since_ts: sinceTs }),
    supabase.rpc('get_pv_top_pages', { since_ts: sinceTs, lim: 10 }),
    supabase.rpc('get_pv_device_distribution', { since_ts: sinceTs }),
    supabase.rpc('get_pv_top_referrers', { since_ts: sinceTs, lim: 10 }),
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

  return {
    period,
    summary: { totalPageViews, uniqueVisitors, avgViewsPerVisitor },
    dailyTrend,
    topPages,
    deviceDistribution,
    topReferrers,
  };
}
