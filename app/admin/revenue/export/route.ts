import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  getRevenueAnalyticsForAuthorizedUser,
  type RevenueAnalytics,
  type RevenueMonthlyRow,
} from '@/app/actions/admin-revenue';

const CSV_DATE_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const CSV_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const escaped = raw.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function formatRate(value: number | null): string {
  if (value === null) return '';
  return value.toFixed(1);
}

function buildMonthlyRows(monthly: RevenueMonthlyRow[]): Array<Array<string | number>> {
  return monthly.map((month) => [
    month.month,
    month.revenue,
    month.soldCount,
    month.averagePrice,
    month.previousMonthRevenue,
    formatRate(month.momChangeRatePct),
    month.previousYearRevenue,
    formatRate(month.yoyChangeRatePct),
    month.cumulativeRevenue,
  ]);
}

function buildReportCsv(analytics: RevenueAnalytics): string {
  const selectedMonthLabel =
    analytics.filter.selectedMonth === 'all' ? '전체' : `${analytics.filter.selectedMonth}월`;
  const generatedAtKst = CSV_DATE_TIME_FORMATTER.format(new Date());

  const rows: Array<Array<string | number>> = [
    ['리포트', 'SAF 매출 현황 CSV'],
    ['생성 시각(KST)', generatedAtKst],
    ['집계 기준', 'status=sold AND sold_at IS NOT NULL'],
    ['시간대', analytics.filter.timezone],
    ['조회 연도', analytics.filter.selectedYear],
    ['조회 월', selectedMonthLabel],
    ['분석 기간', analytics.summary.periodLabel],
    ['비교 기준', analytics.summary.comparedToLabel],
    [],
    ['요약 항목', '값'],
    ['총 인식매출(원)', analytics.summary.totalRevenue],
    ['판매수량(점)', analytics.summary.soldCount],
    ['평균단가(원)', analytics.summary.averagePrice],
    ['비교 기준 매출(원)', analytics.summary.comparedToRevenue],
    ['증감률(%)', formatRate(analytics.summary.changeRatePct)],
    ['sold_at 누락 건수', analytics.dataQuality.soldWithoutSoldAtCount],
    [],
    [
      '월',
      '당월 인식매출(원)',
      '판매수량(점)',
      '평균단가(원)',
      '전월 매출(원)',
      '전월 대비(%)',
      '전년동월 매출(원)',
      '전년동월 대비(%)',
      '누계 YTD(원)',
    ],
    ...buildMonthlyRows(analytics.monthly),
    [],
    ['작가명', '매출(원)', '판매수량(점)'],
    ...analytics.topArtists.map((artist) => [artist.artistName, artist.revenue, artist.soldCount]),
    [],
    ['작품명', '작가명', '판매일(KST)', '매출(원)'],
    ...analytics.topArtworks.map((artwork) => [
      artwork.title,
      artwork.artistName,
      artwork.soldAtKst,
      artwork.revenue,
    ]),
  ];

  const body = rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\r\n');
  return `\uFEFF${body}`;
}

function buildAccountingTemplateCsv(analytics: RevenueAnalytics): string {
  const rows: Array<Array<string | number>> = [
    [
      '전표일자(KST)',
      '전표번호',
      '차변계정',
      '차변금액(원)',
      '대변계정',
      '대변금액(원)',
      '통화',
      '거래처(작가)',
      '적요',
      '프로젝트',
      '작품ID',
      '작품명',
      '판매시각(KST)',
      '판매시각(UTC)',
      '인식기준',
    ],
  ];

  const monthToken =
    analytics.filter.selectedMonth === 'all'
      ? '00'
      : String(analytics.filter.selectedMonth).padStart(2, '0');

  analytics.entries.forEach((entry, index) => {
    const soldAt = new Date(entry.soldAtUtc);
    const voucherDate = CSV_DATE_FORMATTER.format(soldAt);
    const soldAtKst = CSV_DATE_TIME_FORMATTER.format(soldAt);
    const voucherNo = `SAF-${analytics.filter.selectedYear}${monthToken}-${String(index + 1).padStart(4, '0')}`;

    rows.push([
      voucherDate,
      voucherNo,
      '매출채권',
      entry.revenue,
      '작품판매수익',
      entry.revenue,
      'KRW',
      entry.artistName,
      `${entry.title} 판매 인식`,
      'SAF 2026',
      entry.artworkId,
      entry.title,
      soldAtKst,
      entry.soldAtUtc,
      'status=sold and sold_at not null',
    ]);
  });

  const body = rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\r\n');
  return `\uFEFF${body}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return new Response('Failed to verify role', { status: 500 });
  }

  if (!profile || profile.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const year = request.nextUrl.searchParams.get('year');
  const month = request.nextUrl.searchParams.get('month');
  const formatParam = request.nextUrl.searchParams.get('format');
  const format = formatParam === 'report' ? 'report' : 'accounting';
  const analytics = await getRevenueAnalyticsForAuthorizedUser({
    year,
    month,
  });

  const monthToken =
    analytics.filter.selectedMonth === 'all'
      ? 'all'
      : String(analytics.filter.selectedMonth).padStart(2, '0');
  const fileName = `revenue-${analytics.filter.selectedYear}-${monthToken}-kst-${format}.csv`;
  const csvBody =
    format === 'report' ? buildReportCsv(analytics) : buildAccountingTemplateCsv(analytics);

  return new Response(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
