'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import {
  buildRevenueAnalyticsFromRows,
  type RevenueAnalytics,
  type RevenueSalesRecordRow,
} from '@/lib/admin/revenue-analytics';

const KST_TIME_ZONE = 'Asia/Seoul';

const KST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type {
  RevenueAnalytics,
  RevenueChannel,
  RevenueEntry,
  RevenueMonthlyRow,
  RevenueSource,
} from '@/lib/admin/revenue-analytics';

export type RevenueQueryInput = {
  year?: string | null;
  month?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  artistId?: string | null;
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

function isMissingVoidedAtColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const merged = `${candidate.message || ''} ${candidate.details || ''} ${candidate.hint || ''}`
    .toLowerCase()
    .trim();

  return candidate.code === '42703' && merged.includes('voided_at');
}

export async function getRevenueAnalytics(
  input: RevenueQueryInput = {}
): Promise<RevenueAnalytics> {
  await requireAdmin();
  return getRevenueAnalyticsForAuthorizedUser(input);
}

async function fetchBoundarySoldDate(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  ascending: boolean
) {
  let result = await supabase
    .from('artwork_sales')
    .select('sold_at')
    .not('sold_at', 'is', null)
    .is('voided_at', null)
    .order('sold_at', { ascending })
    .limit(1)
    .maybeSingle();
  if (result.error && isMissingVoidedAtColumnError(result.error)) {
    result = await supabase
      .from('artwork_sales')
      .select('sold_at')
      .not('sold_at', 'is', null)
      .order('sold_at', { ascending })
      .limit(1)
      .maybeSingle();
  }
  return result;
}

async function fetchSoldWithoutSoldAtCount(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>
) {
  let result = await supabase
    .from('artwork_sales')
    .select('id', { count: 'exact', head: true })
    .is('sold_at', null)
    .is('voided_at', null);

  if (result.error && isMissingVoidedAtColumnError(result.error)) {
    result = await supabase
      .from('artwork_sales')
      .select('id', { count: 'exact', head: true })
      .is('sold_at', null);
  }

  return result;
}

function buildSalesSelect() {
  return `
    id,
    artwork_id,
    order_id,
    external_order_id,
    buyer_name,
    buyer_phone,
    sale_price,
    quantity,
    sold_at,
    source,
    source_detail,
    artworks!inner (
      title,
      artist_id,
      artists (
        name_ko
      )
    ),
    orders (
      order_no
    )
  `;
}

export async function getRevenueAnalyticsForAuthorizedUser(
  input: RevenueQueryInput = {}
): Promise<RevenueAnalytics> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const now = new Date();
  const currentKstYear = getKstCurrentYear(now);

  const [firstSoldResult, latestSoldResult, soldWithoutSoldAtResult] = await Promise.all([
    fetchBoundarySoldDate(supabase, true),
    fetchBoundarySoldDate(supabase, false),
    fetchSoldWithoutSoldAtCount(supabase),
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

  let soldRowsResult = await supabase
    .from('artwork_sales')
    .select(buildSalesSelect())
    .gte('sold_at', rangeStartIso)
    .lt('sold_at', rangeEndIso)
    .is('voided_at', null)
    .order('sold_at', { ascending: true });

  if (soldRowsResult.error && isMissingVoidedAtColumnError(soldRowsResult.error)) {
    soldRowsResult = await supabase
      .from('artwork_sales')
      .select(buildSalesSelect())
      .gte('sold_at', rangeStartIso)
      .lt('sold_at', rangeEndIso)
      .order('sold_at', { ascending: true });
  }

  const { data: soldRows, error: soldRowsError } = soldRowsResult;

  if (soldRowsError) throw soldRowsError;

  return buildRevenueAnalyticsFromRows({
    rows: (soldRows || []) as unknown as RevenueSalesRecordRow[],
    selectedYear,
    selectedMonth,
    availableYears,
    soldWithoutSoldAtCount: soldWithoutSoldAtResult.count || 0,
    drilldown: {
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      artistId: input.artistId,
    },
  });
}
