'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { unstable_cache } from 'next/cache';

export type DashboardPeriodKey = '7d' | '30d' | '90d' | '365d' | 'all' | `year_${number}`;
type FixedDashboardPeriodKey = Exclude<DashboardPeriodKey, 'all' | `year_${number}`>;

type RevenueBucketGranularity = 'day' | 'week' | 'month';

const DASHBOARD_PERIOD_OPTIONS: Array<{ key: DashboardPeriodKey; label: string }> = [
  { key: '7d', label: '최근 7일' },
  { key: '30d', label: '최근 30일' },
  { key: '90d', label: '최근 90일' },
  { key: '365d', label: '최근 1년' },
  { key: 'all', label: '전체 기간' },
];

const PERIOD_DAY_WINDOWS: Record<FixedDashboardPeriodKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

const PERIOD_LABEL_MAP: Record<FixedDashboardPeriodKey | 'all', string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  '365d': '최근 1년',
  all: '전체 기간',
};

const MAX_REVENUE_BUCKETS_FOR_ALL = 60;

type SoldRecord = {
  soldDate: Date;
  price: number;
};

type ArtworkMetricRow = {
  price: unknown;
  status: string | null;
  material: string | null;
  created_at: string | null;
  updated_at: string | null;
  sold_at?: string | null;
  is_hidden: boolean | null;
};

export type DashboardStats = {
  period: {
    key: DashboardPeriodKey;
    label: string;
    startDate: string;
    endDate: string;
    comparedTo: string | null;
    bucket: RevenueBucketGranularity;
  };
  artists: {
    totalRegistered: number;
    linkedAccounts: number;
    unlinkedAccounts: number;
    pendingApplications: number;
    suspendedAccounts: number;
  };
  artworks: {
    total: number;
    visible: number;
    hidden: number;
    statusVisible: {
      available: number;
      reserved: number;
      sold: number;
    };
    statusTotal: {
      available: number;
      reserved: number;
      sold: number;
    };
  };
  revenue: {
    lifetime: {
      totalRevenue: number;
      inventoryValue: number;
      soldCount: number;
      averagePrice: number;
    };
    period: {
      totalRevenue: number;
      soldCount: number;
      averagePrice: number;
      previousRevenue: number;
      changeRatePct: number | null;
    };
    timeSeries: Array<{
      bucketKey: string;
      label: string;
      startDate: string;
      endDate: string;
      revenue: number;
      soldCount: number;
      averagePrice: number;
      previousRevenue: number;
      growthRate: number | null;
    }>;
    timeSeriesMeta: {
      totalBuckets: number;
      displayedBuckets: number;
      truncated: boolean;
      maxBuckets: number | null;
    };
  };
  materialDistribution: Array<{
    material: string;
    count: number;
  }>;
  trends: {
    dailyArtists: Array<{ date: string; count: number }>;
    dailyArtworks: Array<{ date: string; count: number }>;
  };
  recentApplications: Array<{
    id: string;
    name: string;
    email: string;
    contact: string;
    created_at: string;
    status: string;
  }>;
  recentArtworks: Array<{
    id: string;
    title: string;
    artist_name: string;
    created_at: string;
  }>;
};

function isDashboardPeriodKey(value: string): value is DashboardPeriodKey {
  return DASHBOARD_PERIOD_OPTIONS.some((option) => option.key === value);
}

function parsePrice(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return Math.max(0, Math.round(price));
  }

  if (typeof price === 'string') {
    const numeric = Number(price.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.round(numeric));
    }
  }

  return 0;
}

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYearsClamped(date: Date, years: number): Date {
  const d = new Date(date);
  const originalMonth = d.getMonth();
  d.setFullYear(d.getFullYear() + years);

  if (d.getMonth() !== originalMonth) {
    d.setMonth(originalMonth + 1, 0);
  }

  return d;
}

function extractYearPeriod(value: string): number | null {
  const match = /^year_(\d{4})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function isAllowedYearPeriod(value: string, now: Date): boolean {
  const year = extractYearPeriod(value);
  if (year === null) return false;

  const currentYear = now.getFullYear();
  return year >= currentYear - 2 && year <= currentYear;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBucketGranularity(period: DashboardPeriodKey): RevenueBucketGranularity {
  if (period === '90d') return 'week';
  if (period === '365d' || period === 'all' || period.startsWith('year_')) return 'month';
  return 'day';
}

function getBucketStart(date: Date, granularity: RevenueBucketGranularity): Date {
  if (granularity === 'month') return startOfMonth(date);
  if (granularity === 'week') return startOfWeek(date);
  return startOfDay(date);
}

function addBucket(date: Date, granularity: RevenueBucketGranularity): Date {
  if (granularity === 'month') return addMonths(date, 1);
  if (granularity === 'week') return addDays(date, 7);
  return addDays(date, 1);
}

function getBucketEnd(date: Date, granularity: RevenueBucketGranularity): Date {
  if (granularity === 'day') return startOfDay(date);
  if (granularity === 'week') return addDays(startOfDay(date), 6);

  const monthStart = startOfMonth(date);
  const nextMonthStart = addMonths(monthStart, 1);
  return addDays(nextMonthStart, -1);
}

function getBucketKey(date: Date, granularity: RevenueBucketGranularity): string {
  if (granularity === 'month') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  if (granularity === 'week') {
    return `W-${toDateKey(startOfWeek(date))}`;
  }

  return toDateKey(startOfDay(date));
}

function formatBucketLabel(date: Date, granularity: RevenueBucketGranularity): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (granularity === 'month') {
    return `${year}.${month}`;
  }

  if (granularity === 'week') {
    return `${month}.${day} 주간`;
  }

  return `${month}.${day}`;
}

function sumRevenue(records: SoldRecord[]): number {
  return records.reduce((sum, record) => sum + record.price, 0);
}

function resolveSoldDate(artwork: ArtworkMetricRow): Date | null {
  const soldAt = toValidDate(artwork.sold_at ?? null);
  if (soldAt) return soldAt;

  if (artwork.status === 'sold') {
    return toValidDate(artwork.updated_at) || toValidDate(artwork.created_at);
  }

  return null;
}

function getPeriodStart(period: DashboardPeriodKey, now: Date, soldRecords: SoldRecord[]): Date {
  if (period.startsWith('year_')) {
    const year = parseInt(period.replace('year_', ''), 10);
    return new Date(year, 0, 1);
  }

  if (period === 'all') {
    if (soldRecords.length === 0) {
      return startOfMonth(addMonths(now, -11));
    }

    const oldest = soldRecords.reduce(
      (minDate, record) => (record.soldDate < minDate ? record.soldDate : minDate),
      soldRecords[0].soldDate
    );

    return startOfMonth(oldest);
  }

  const days = PERIOD_DAY_WINDOWS[period as FixedDashboardPeriodKey];
  return startOfDay(addDays(now, -(days - 1)));
}

function getPeriodEnd(period: DashboardPeriodKey, now: Date): Date {
  if (period.startsWith('year_')) {
    const year = extractYearPeriod(period);
    if (year === null) return now;
    if (year === now.getFullYear()) return now;
    return new Date(year, 11, 31, 23, 59, 59, 999);
  }
  return now;
}

function groupByDate(
  items: Array<{ created_at: string }>,
  startDate: Date,
  endDate: Date
): Array<{ date: string; count: number }> {
  const dateMap = new Map<string, number>();
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    dateMap.set(toDateKey(cursor), 0);
  }

  items.forEach((item) => {
    const createdAt = toValidDate(item.created_at);
    if (!createdAt) return;
    const key = toDateKey(startOfDay(createdAt));
    if (!dateMap.has(key)) return;
    dateMap.set(key, (dateMap.get(key) || 0) + 1);
  });

  return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
}

function buildRevenueTimeSeries(
  records: SoldRecord[],
  startDate: Date,
  endDate: Date,
  granularity: RevenueBucketGranularity,
  previousPeriodRecords: SoldRecord[] = [],
  mapPreviousRecordDate?: (date: Date) => Date
): DashboardStats['revenue']['timeSeries'] {
  const seriesMap = new Map<
    string,
    {
      bucketKey: string;
      label: string;
      startDate: string;
      endDate: string;
      revenue: number;
      soldCount: number;
      averagePrice: number;
      previousRevenue: number;
      growthRate: number | null;
    }
  >();

  const normalizedStart = getBucketStart(startDate, granularity);
  const normalizedEnd = startOfDay(endDate);

  for (
    let cursor = new Date(normalizedStart);
    cursor <= normalizedEnd;
    cursor = addBucket(cursor, granularity)
  ) {
    const bucketStart = getBucketStart(cursor, granularity);
    const bucketEnd = getBucketEnd(bucketStart, granularity);
    const clampedEnd = bucketEnd > normalizedEnd ? normalizedEnd : bucketEnd;
    const bucketKey = getBucketKey(bucketStart, granularity);

    seriesMap.set(bucketKey, {
      bucketKey,
      label: formatBucketLabel(bucketStart, granularity),
      startDate: toDateKey(bucketStart),
      endDate: toDateKey(clampedEnd),
      revenue: 0,
      soldCount: 0,
      averagePrice: 0,
      previousRevenue: 0,
      growthRate: null,
    });
  }

  records.forEach((record) => {
    const bucketStart = getBucketStart(record.soldDate, granularity);
    const bucketKey = getBucketKey(bucketStart, granularity);
    const bucket = seriesMap.get(bucketKey);
    if (!bucket) return;
    bucket.revenue += record.price;
    bucket.soldCount += 1;
  });

  previousPeriodRecords.forEach((record) => {
    const mappedDate = mapPreviousRecordDate
      ? mapPreviousRecordDate(record.soldDate)
      : new Date(record.soldDate);

    if (Number.isNaN(mappedDate.getTime())) return;

    const bucketStart = getBucketStart(mappedDate, granularity);
    const bucketKey = getBucketKey(bucketStart, granularity);
    const bucket = seriesMap.get(bucketKey);
    if (!bucket) return;
    bucket.previousRevenue += record.price;
  });

  return Array.from(seriesMap.values())
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((bucket) => {
      const averagePrice = bucket.soldCount > 0 ? Math.round(bucket.revenue / bucket.soldCount) : 0;
      const growthRate =
        bucket.previousRevenue === 0
          ? null
          : Number(
              (((bucket.revenue - bucket.previousRevenue) / bucket.previousRevenue) * 100).toFixed(
                1
              )
            );

      return {
        ...bucket,
        averagePrice,
        growthRate,
      };
    });
}

async function computeDashboardStats(period: DashboardPeriodKey = '30d'): Promise<DashboardStats> {
  const supabase = await createSupabaseAdminOrServerClient();
  const now = new Date();
  const periodKey: DashboardPeriodKey =
    isDashboardPeriodKey(period) || isAllowedYearPeriod(period, now) ? period : '30d';

  const [
    totalArtistsResult,
    linkedArtistsResult,
    suspendedArtistAccountsResult,
    pendingProfilesResult,
    totalArtworksResult,
    hiddenArtworksResult,
    visibleArtworksResult,
    availableVisibleResult,
    reservedVisibleResult,
    soldVisibleResult,
    availableTotalResult,
    reservedTotalResult,
    soldTotalResult,
  ] = await Promise.all([
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase
      .from('artists')
      .select('id', { count: 'exact', head: true })
      .not('user_id', 'is', null),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'artist')
      .eq('status', 'suspended'),
    supabase.from('profiles').select('id').eq('status', 'pending'),
    supabase.from('artworks').select('id', { count: 'exact', head: true }),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('is_hidden', true),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('is_hidden', false),
    supabase
      .from('artworks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'available')
      .eq('is_hidden', false),
    supabase
      .from('artworks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'reserved')
      .eq('is_hidden', false),
    supabase
      .from('artworks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sold')
      .eq('is_hidden', false),
    supabase
      .from('artworks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'available'),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('status', 'reserved'),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
  ]);

  const initialCountErrors = [
    totalArtistsResult.error,
    linkedArtistsResult.error,
    suspendedArtistAccountsResult.error,
    totalArtworksResult.error,
    hiddenArtworksResult.error,
    visibleArtworksResult.error,
    availableVisibleResult.error,
    reservedVisibleResult.error,
    soldVisibleResult.error,
    availableTotalResult.error,
    reservedTotalResult.error,
    soldTotalResult.error,
  ].filter((error): error is NonNullable<typeof error> => !!error);

  if (initialCountErrors.length > 0) {
    throw initialCountErrors[0];
  }

  if (pendingProfilesResult.error) throw pendingProfilesResult.error;
  const pendingProfileIds = (pendingProfilesResult.data || [])
    .map((profile) => profile.id)
    .filter((id): id is string => typeof id === 'string');

  let pendingApplicationsCount = 0;
  let recentPendingApplicationsRaw: Array<{
    user_id: string;
    artist_name: string | null;
    contact: string | null;
    created_at: string;
  }> = [];

  if (pendingProfileIds.length > 0) {
    const [pendingApplicationCountResult, recentPendingApplicationsResult] = await Promise.all([
      supabase
        .from('artist_applications')
        .select('user_id', { count: 'exact', head: true })
        .in('user_id', pendingProfileIds),
      supabase
        .from('artist_applications')
        .select('user_id, artist_name, contact, created_at')
        .in('user_id', pendingProfileIds)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (pendingApplicationCountResult.error) throw pendingApplicationCountResult.error;
    if (recentPendingApplicationsResult.error) throw recentPendingApplicationsResult.error;

    pendingApplicationsCount = pendingApplicationCountResult.count || 0;
    recentPendingApplicationsRaw = (recentPendingApplicationsResult.data || []).map((item) => ({
      user_id: item.user_id,
      artist_name: item.artist_name,
      contact: item.contact,
      created_at: item.created_at,
    }));
  }

  const recentApplicationUserIds = recentPendingApplicationsRaw.map((item) => item.user_id);
  let recentApplicationProfiles: Array<{
    id: string;
    name: string | null;
    email: string | null;
    status: string | null;
  }> = [];

  if (recentApplicationUserIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, status')
      .in('id', recentApplicationUserIds);

    if (profilesError) throw profilesError;
    recentApplicationProfiles = profilesData || [];
  }

  const profileMap = new Map(recentApplicationProfiles.map((profile) => [profile.id, profile]));

  const { data: recentArtworksRaw, error: recentArtworksError } = await supabase
    .from('artworks')
    .select('id, title, created_at, artists(name_ko)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentArtworksError) throw recentArtworksError;

  let allArtworks: ArtworkMetricRow[] = [];
  const artworksWithSoldAt = await supabase
    .from('artworks')
    .select('price, status, material, created_at, updated_at, sold_at, is_hidden');

  if (artworksWithSoldAt.error) {
    const shouldFallback = artworksWithSoldAt.error.message.toLowerCase().includes('sold_at');
    if (!shouldFallback) {
      throw artworksWithSoldAt.error;
    }

    const artworksFallback = await supabase
      .from('artworks')
      .select('price, status, material, created_at, updated_at, is_hidden');

    if (artworksFallback.error) throw artworksFallback.error;
    allArtworks = (artworksFallback.data || []) as ArtworkMetricRow[];
  } else {
    allArtworks = (artworksWithSoldAt.data || []) as ArtworkMetricRow[];
  }

  const soldRecords = allArtworks
    .filter((artwork) => artwork.status === 'sold')
    .map((artwork) => {
      const soldDate = resolveSoldDate(artwork);
      if (!soldDate) return null;
      return {
        soldDate,
        price: parsePrice(artwork.price),
      };
    })
    .filter((item): item is SoldRecord => !!item);

  const visibleInventoryRecords = allArtworks.filter(
    (artwork) =>
      !artwork.is_hidden && (artwork.status === 'available' || artwork.status === 'reserved')
  );

  const lifetimeRevenue = sumRevenue(soldRecords);
  const lifetimeSoldCount = soldRecords.length;
  const lifetimeAveragePrice =
    lifetimeSoldCount > 0 ? Math.round(lifetimeRevenue / lifetimeSoldCount) : 0;
  const inventoryValue = visibleInventoryRecords.reduce(
    (sum, artwork) => sum + parsePrice(artwork.price),
    0
  );

  const periodStart = getPeriodStart(periodKey, now, soldRecords);
  const periodEnd = getPeriodEnd(periodKey, now);
  const bucket = getBucketGranularity(periodKey);

  const periodRecords = soldRecords.filter(
    (record) => record.soldDate >= periodStart && record.soldDate <= periodEnd
  );
  const periodRevenue = sumRevenue(periodRecords);
  const periodSoldCount = periodRecords.length;
  const periodAveragePrice = periodSoldCount > 0 ? Math.round(periodRevenue / periodSoldCount) : 0;

  let previousRevenue = 0;
  let comparedTo: string | null = null;
  let previousPeriodRecords: SoldRecord[] = [];
  let mapPreviousRecordDate: ((date: Date) => Date) | undefined;

  if (periodKey.startsWith('year_')) {
    const prevYearStart = addYearsClamped(periodStart, -1);
    const prevYearEnd = addYearsClamped(periodEnd, -1);

    previousPeriodRecords = soldRecords.filter(
      (record) => record.soldDate >= prevYearStart && record.soldDate <= prevYearEnd
    );
    previousRevenue = sumRevenue(previousPeriodRecords);
    comparedTo = `${toDateKey(prevYearStart)} ~ ${toDateKey(prevYearEnd)}`;
    mapPreviousRecordDate = (date) => {
      return addYearsClamped(date, 1);
    };
  } else if (periodKey !== 'all') {
    const periodDays = PERIOD_DAY_WINDOWS[periodKey as FixedDashboardPeriodKey];
    const previousStart = addDays(periodStart, -periodDays);
    const previousEnd = addDays(periodStart, -1);

    previousPeriodRecords = soldRecords.filter(
      (record) => record.soldDate >= previousStart && record.soldDate <= previousEnd
    );

    previousRevenue = sumRevenue(previousPeriodRecords);
    comparedTo = `${toDateKey(previousStart)} ~ ${toDateKey(previousEnd)}`;
    mapPreviousRecordDate = (date) => addDays(date, periodDays);
  }

  const changeRatePct =
    periodKey === 'all'
      ? null
      : previousRevenue > 0
        ? Number((((periodRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1))
        : periodRevenue === 0
          ? 0
          : null;

  const fullTimeSeries = buildRevenueTimeSeries(
    periodRecords,
    periodStart,
    periodEnd,
    bucket,
    previousPeriodRecords,
    mapPreviousRecordDate
  );
  const shouldTruncateForAll =
    periodKey === 'all' && fullTimeSeries.length > MAX_REVENUE_BUCKETS_FOR_ALL;
  const timeSeries = shouldTruncateForAll
    ? fullTimeSeries.slice(-MAX_REVENUE_BUCKETS_FOR_ALL)
    : fullTimeSeries;

  const materialMap = new Map<string, number>();
  allArtworks.forEach((artwork) => {
    const material = artwork.material || '미분류';
    materialMap.set(material, (materialMap.get(material) || 0) + 1);
  });

  const materialDistribution = Array.from(materialMap.entries())
    .map(([material, count]) => ({ material, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const thirtyDaysAgo = addDays(startOfDay(now), -30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const { data: recentArtistsRaw, error: recentArtistsError } = await supabase
    .from('artists')
    .select('created_at')
    .gte('created_at', thirtyDaysAgoIso);

  if (recentArtistsError) throw recentArtistsError;

  const recentArtistsForTrend = (recentArtistsRaw || [])
    .map((artist) => artist.created_at)
    .filter((createdAt): createdAt is string => typeof createdAt === 'string')
    .map((createdAt) => ({ created_at: createdAt }));

  const recentArtworksForTrend = allArtworks
    .map((artwork) => artwork.created_at)
    .filter((createdAt): createdAt is string => typeof createdAt === 'string')
    .filter((createdAt) => {
      const createdDate = toValidDate(createdAt);
      return !!createdDate && createdDate >= thirtyDaysAgo;
    })
    .map((createdAt) => ({ created_at: createdAt }));

  const dailyArtists = groupByDate(recentArtistsForTrend, thirtyDaysAgo, now);
  const dailyArtworks = groupByDate(recentArtworksForTrend, thirtyDaysAgo, now);

  return {
    period: {
      key: periodKey,
      label: periodKey.startsWith('year_')
        ? `${periodKey.replace('year_', '')}년`
        : PERIOD_LABEL_MAP[periodKey as FixedDashboardPeriodKey | 'all'],
      startDate: toDateKey(periodStart),
      endDate: toDateKey(periodEnd),
      comparedTo,
      bucket,
    },
    artists: {
      totalRegistered: totalArtistsResult.count || 0,
      linkedAccounts: linkedArtistsResult.count || 0,
      unlinkedAccounts: Math.max(
        0,
        (totalArtistsResult.count || 0) - (linkedArtistsResult.count || 0)
      ),
      pendingApplications: pendingApplicationsCount,
      suspendedAccounts: suspendedArtistAccountsResult.count || 0,
    },
    artworks: {
      total: totalArtworksResult.count || 0,
      visible: visibleArtworksResult.count || 0,
      hidden: hiddenArtworksResult.count || 0,
      statusVisible: {
        available: availableVisibleResult.count || 0,
        reserved: reservedVisibleResult.count || 0,
        sold: soldVisibleResult.count || 0,
      },
      statusTotal: {
        available: availableTotalResult.count || 0,
        reserved: reservedTotalResult.count || 0,
        sold: soldTotalResult.count || 0,
      },
    },
    revenue: {
      lifetime: {
        totalRevenue: lifetimeRevenue,
        inventoryValue,
        soldCount: lifetimeSoldCount,
        averagePrice: lifetimeAveragePrice,
      },
      period: {
        totalRevenue: periodRevenue,
        soldCount: periodSoldCount,
        averagePrice: periodAveragePrice,
        previousRevenue,
        changeRatePct,
      },
      timeSeries,
      timeSeriesMeta: {
        totalBuckets: fullTimeSeries.length,
        displayedBuckets: timeSeries.length,
        truncated: shouldTruncateForAll,
        maxBuckets: shouldTruncateForAll ? MAX_REVENUE_BUCKETS_FOR_ALL : null,
      },
    },
    materialDistribution,
    trends: {
      dailyArtists,
      dailyArtworks,
    },
    recentApplications: recentPendingApplicationsRaw.map((application) => {
      const profile = profileMap.get(application.user_id);
      return {
        id: application.user_id,
        name: application.artist_name || profile?.name || '(이름 없음)',
        email: profile?.email || '',
        contact: application.contact || '',
        created_at: application.created_at,
        status: profile?.status || 'pending',
      };
    }),
    recentArtworks: (recentArtworksRaw || []).map((artwork) => {
      const artistsValue = artwork.artists as
        | { name_ko: string | null }
        | Array<{ name_ko: string | null }>
        | null;
      const artistName = Array.isArray(artistsValue)
        ? artistsValue[0]?.name_ko || '알 수 없음'
        : artistsValue?.name_ko || '알 수 없음';
      return {
        id: artwork.id,
        title: artwork.title,
        artist_name: artistName,
        created_at: artwork.created_at,
      };
    }),
  };
}

const getCachedDashboardStats = unstable_cache(
  async (period: DashboardPeriodKey) => computeDashboardStats(period),
  ['admin-dashboard-stats'],
  {
    revalidate: 30,
    tags: ['admin-dashboard'],
  }
);

export async function getDashboardStats(
  period: DashboardPeriodKey = '30d'
): Promise<DashboardStats> {
  await requireAdmin();
  return getCachedDashboardStats(period);
}
