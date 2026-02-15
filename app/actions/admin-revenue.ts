'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';

const KST_TIME_ZONE = 'Asia/Seoul';

const KST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type RevenueQueryInput = {
  year?: string | null;
  month?: string | null;
};

type SalesRecordRow = {
  id: string;
  artwork_id: string;
  sale_price: number;
  quantity: number;
  sold_at: string;
  artworks: {
    title: string;
    artist_id: string | null;
    artists:
      | {
          name_ko: string | null;
        }
      | Array<{
          name_ko: string | null;
        }>
      | null;
  } | null;
};

type MonthlyAccumulator = {
  revenue: number;
  soldCount: number;
};

type RankedArtist = {
  artistId: string | null;
  artistName: string;
  revenue: number;
  soldCount: number;
};

type RankedArtwork = {
  artworkId: string;
  title: string;
  artistName: string;
  soldAtKst: string;
  revenue: number;
};

type RevenueEntry = {
  artworkId: string;
  title: string;
  artistId: string | null;
  artistName: string;
  soldAtUtc: string;
  soldAtKstDate: string;
  revenue: number;
};

export type RevenueMonthlyRow = {
  month: number;
  label: string;
  revenue: number;
  soldCount: number;
  averagePrice: number;
  previousMonthRevenue: number;
  previousYearRevenue: number;
  momChangeRatePct: number | null;
  yoyChangeRatePct: number | null;
  cumulativeRevenue: number;
};

export type RevenueAnalytics = {
  filter: {
    timezone: string;
    selectedYear: number;
    selectedMonth: number | 'all';
    availableYears: number[];
  };
  summary: {
    periodLabel: string;
    totalRevenue: number;
    soldCount: number;
    averagePrice: number;
    comparedToLabel: string;
    comparedToRevenue: number;
    changeRatePct: number | null;
  };
  focusMonth: {
    month: number;
    revenue: number;
    soldCount: number;
    averagePrice: number;
    previousMonthRevenue: number;
    previousYearRevenue: number;
    momChangeRatePct: number | null;
    yoyChangeRatePct: number | null;
  } | null;
  yearly: {
    totalRevenue: number;
    soldCount: number;
    averagePrice: number;
    previousYearRevenue: number;
    yoyChangeRatePct: number | null;
  };
  monthly: RevenueMonthlyRow[];
  chart: Array<{
    label: string;
    revenue: number;
    soldCount: number;
    averagePrice: number;
  }>;
  topArtists: RankedArtist[];
  topArtworks: RankedArtwork[];
  entries: RevenueEntry[];
  dataQuality: {
    soldWithoutSoldAtCount: number;
  };
};

function getKstDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = KST_PARTS_FORMATTER.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error('KST 날짜를 계산할 수 없습니다.');
  }

  return { year, month, day };
}

function getKstCurrentYear(now: Date): number {
  return getKstDateParts(now).year;
}

function getYearStartUtcIso(year: number): string {
  return new Date(Date.UTC(year, 0, 1, -9, 0, 0, 0)).toISOString();
}

function createYearOptions(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  for (let cursor = maxYear; cursor >= minYear; cursor -= 1) {
    years.push(cursor);
  }
  return years;
}

function normalizeMonth(raw: string | null | undefined): number | 'all' {
  if (!raw || raw === 'all') return 'all';
  const month = Number(raw);
  if (!Number.isInteger(month) || month < 1 || month > 12) return 'all';
  return month;
}

function normalizeYear(raw: string | null | undefined, minYear: number, maxYear: number): number {
  const year = Number(raw);
  if (!Number.isInteger(year)) return maxYear;
  if (year < minYear || year > maxYear) return maxYear;
  return year;
}

function calcChangeRate(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function createMonthlyAccumulator(): MonthlyAccumulator[] {
  return Array.from({ length: 12 }, () => ({
    revenue: 0,
    soldCount: 0,
  }));
}

export async function getRevenueAnalytics(
  input: RevenueQueryInput = {}
): Promise<RevenueAnalytics> {
  await requireAdmin();
  return getRevenueAnalyticsForAuthorizedUser(input);
}

export async function getRevenueAnalyticsForAuthorizedUser(
  input: RevenueQueryInput = {}
): Promise<RevenueAnalytics> {
  const supabase = await createSupabaseAdminOrServerClient();

  const now = new Date();
  const currentKstYear = getKstCurrentYear(now);

  const [firstSoldResult, latestSoldResult, soldWithoutSoldAtResult] = await Promise.all([
    supabase
      .from('artwork_sales')
      .select('sold_at')
      .order('sold_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('artwork_sales')
      .select('sold_at')
      .order('sold_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('artwork_sales').select('id', { count: 'exact', head: true }).is('sold_at', null),
  ]);

  if (firstSoldResult.error) throw firstSoldResult.error;
  if (latestSoldResult.error) throw latestSoldResult.error;
  if (soldWithoutSoldAtResult.error) throw soldWithoutSoldAtResult.error;

  const minYear = firstSoldResult.data?.sold_at
    ? getKstDateParts(new Date(firstSoldResult.data.sold_at)).year
    : currentKstYear;
  const maxYearFromData = latestSoldResult.data?.sold_at
    ? getKstDateParts(new Date(latestSoldResult.data.sold_at)).year
    : currentKstYear;
  const maxYear = Math.max(currentKstYear, maxYearFromData);

  const availableYears = createYearOptions(minYear, maxYear);
  const selectedYear = normalizeYear(input.year, minYear, maxYear);
  const selectedMonth = normalizeMonth(input.month);

  const rangeStartIso = getYearStartUtcIso(selectedYear - 1);
  const rangeEndIso = getYearStartUtcIso(selectedYear + 1);

  const { data: soldRows, error: soldRowsError } = await supabase
    .from('artwork_sales')
    .select(
      `
      id,
      artwork_id,
      sale_price,
      quantity,
      sold_at,
      artworks!inner (
        title,
        artist_id,
        artists (
          name_ko
        )
      )
    `
    )
    .gte('sold_at', rangeStartIso)
    .lt('sold_at', rangeEndIso)
    .order('sold_at', { ascending: true });

  if (soldRowsError) throw soldRowsError;

  const currentYearMonthly = createMonthlyAccumulator();
  const previousYearMonthly = createMonthlyAccumulator();
  const focusArtistMap = new Map<string, RankedArtist>();
  const focusEntries: RevenueEntry[] = [];

  for (const row of (soldRows || []) as unknown as SalesRecordRow[]) {
    const soldDate = new Date(row.sold_at);
    if (Number.isNaN(soldDate.getTime())) continue;

    const { year, month, day } = getKstDateParts(soldDate);
    // Use sale_price directly (integer)
    const price = row.sale_price * row.quantity;
    const monthIndex = month - 1;

    if (monthIndex < 0 || monthIndex > 11) continue;

    if (year === selectedYear) {
      currentYearMonthly[monthIndex].revenue += price;
      currentYearMonthly[monthIndex].soldCount += row.quantity;
    } else if (year === selectedYear - 1) {
      previousYearMonthly[monthIndex].revenue += price;
      previousYearMonthly[monthIndex].soldCount += row.quantity;
    }

    const isInFocusPeriod =
      selectedMonth === 'all'
        ? year === selectedYear
        : year === selectedYear && month === selectedMonth;

    if (!isInFocusPeriod) continue;

    const artistValue = row.artworks?.artists;
    const artistName = Array.isArray(artistValue)
      ? artistValue[0]?.name_ko || '알 수 없음'
      : artistValue?.name_ko || '알 수 없음';
    const artistId = row.artworks?.artist_id || null;
    const artistKey = artistId || `unknown:${artistName}`;

    const currentArtist = focusArtistMap.get(artistKey) || {
      artistId,
      artistName,
      revenue: 0,
      soldCount: 0,
    };

    focusArtistMap.set(artistKey, {
      ...currentArtist,
      revenue: currentArtist.revenue + price,
      soldCount: currentArtist.soldCount + row.quantity,
    });

    focusEntries.push({
      artworkId: row.artwork_id,
      title: row.artworks?.title || 'Unknown',
      artistId,
      artistName,
      soldAtUtc: row.sold_at,
      soldAtKstDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      revenue: price,
    });
  }

  const monthly: RevenueMonthlyRow[] = [];
  let cumulativeRevenue = 0;

  for (let month = 1; month <= 12; month += 1) {
    const index = month - 1;
    const current = currentYearMonthly[index];
    const previousYear = previousYearMonthly[index];
    const previousMonthRevenue =
      month === 1 ? previousYearMonthly[11].revenue : currentYearMonthly[index - 1].revenue;
    const averagePrice =
      current.soldCount > 0 ? Math.round(current.revenue / current.soldCount) : 0;

    cumulativeRevenue += current.revenue;

    monthly.push({
      month,
      label: `${month}월`,
      revenue: current.revenue,
      soldCount: current.soldCount,
      averagePrice,
      previousMonthRevenue,
      previousYearRevenue: previousYear.revenue,
      momChangeRatePct: calcChangeRate(current.revenue, previousMonthRevenue),
      yoyChangeRatePct: calcChangeRate(current.revenue, previousYear.revenue),
      cumulativeRevenue,
    });
  }

  const yearTotalRevenue = monthly.reduce((sum, month) => sum + month.revenue, 0);
  const yearTotalSoldCount = monthly.reduce((sum, month) => sum + month.soldCount, 0);
  const yearAveragePrice =
    yearTotalSoldCount > 0 ? Math.round(yearTotalRevenue / yearTotalSoldCount) : 0;
  const previousYearTotalRevenue = previousYearMonthly.reduce(
    (sum, month) => sum + month.revenue,
    0
  );
  const yearYoyChangeRate = calcChangeRate(yearTotalRevenue, previousYearTotalRevenue);

  const summary =
    selectedMonth === 'all'
      ? {
          periodLabel: `${selectedYear}년`,
          totalRevenue: yearTotalRevenue,
          soldCount: yearTotalSoldCount,
          averagePrice: yearAveragePrice,
          comparedToLabel: `${selectedYear - 1}년`,
          comparedToRevenue: previousYearTotalRevenue,
          changeRatePct: yearYoyChangeRate,
        }
      : (() => {
          const selectedRow = monthly[selectedMonth - 1];
          return {
            periodLabel: `${selectedYear}년 ${selectedMonth}월`,
            totalRevenue: selectedRow.revenue,
            soldCount: selectedRow.soldCount,
            averagePrice: selectedRow.averagePrice,
            comparedToLabel: `${selectedYear - 1}년 ${selectedMonth}월`,
            comparedToRevenue: selectedRow.previousYearRevenue,
            changeRatePct: selectedRow.yoyChangeRatePct,
          };
        })();

  const focusMonth =
    selectedMonth === 'all'
      ? null
      : (() => {
          const selectedRow = monthly[selectedMonth - 1];
          return {
            month: selectedMonth,
            revenue: selectedRow.revenue,
            soldCount: selectedRow.soldCount,
            averagePrice: selectedRow.averagePrice,
            previousMonthRevenue: selectedRow.previousMonthRevenue,
            previousYearRevenue: selectedRow.previousYearRevenue,
            momChangeRatePct: selectedRow.momChangeRatePct,
            yoyChangeRatePct: selectedRow.yoyChangeRatePct,
          };
        })();

  const topArtists = Array.from(focusArtistMap.values())
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.soldCount - a.soldCount;
    })
    .slice(0, 8);

  const topArtworks = [...focusEntries]
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.soldAtUtc.localeCompare(a.soldAtUtc);
    })
    .map((entry) => ({
      artworkId: entry.artworkId,
      title: entry.title,
      artistName: entry.artistName,
      soldAtKst: entry.soldAtKstDate,
      revenue: entry.revenue,
    }))
    .slice(0, 10);

  const entries = [...focusEntries].sort((a, b) => a.soldAtUtc.localeCompare(b.soldAtUtc));

  return {
    filter: {
      timezone: KST_TIME_ZONE,
      selectedYear,
      selectedMonth,
      availableYears,
    },
    summary,
    focusMonth,
    yearly: {
      totalRevenue: yearTotalRevenue,
      soldCount: yearTotalSoldCount,
      averagePrice: yearAveragePrice,
      previousYearRevenue: previousYearTotalRevenue,
      yoyChangeRatePct: yearYoyChangeRate,
    },
    monthly,
    chart: monthly.map((month) => ({
      label: month.label,
      revenue: month.revenue,
      soldCount: month.soldCount,
      averagePrice: month.averagePrice,
    })),
    topArtists,
    topArtworks,
    entries,
    dataQuality: {
      soldWithoutSoldAtCount: soldWithoutSoldAtResult.count || 0,
    },
  };
}
