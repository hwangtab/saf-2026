const KST_TIME_ZONE = 'Asia/Seoul';

const KST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type RevenueSource = 'manual' | 'toss';
export type RevenueChannel = 'offline' | 'online';

type SalesAggregate = {
  revenue: number;
  soldCount: number;
};

type SourceBreakdown = Record<RevenueSource, SalesAggregate>;
type ChannelBreakdown = Record<RevenueChannel, SalesAggregate>;

export type RevenueSalesRecordRow = {
  id: string;
  artwork_id: string;
  order_id: string | null;
  external_order_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  sale_price: number;
  quantity: number;
  sold_at: string;
  source: string | null;
  source_detail: string | null;
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
  orders:
    | {
        order_no: string | null;
      }
    | Array<{
        order_no: string | null;
      }>
    | null;
};

type MonthlyAccumulator = {
  revenue: number;
  soldCount: number;
};

export type RankedArtist = {
  artistId: string | null;
  artistFilterId: string;
  artistName: string;
  revenue: number;
  soldCount: number;
};

export type RankedBuyer = {
  buyerName: string;
  buyerPhone: string | null;
  revenue: number;
  soldCount: number;
  purchaseCount: number;
};

export type RankedArtwork = {
  artworkId: string;
  title: string;
  artistName: string;
  soldAtKst: string;
  revenue: number;
};

export type RevenueEntry = {
  saleId: string;
  orderId: string | null;
  orderNo: string | null;
  externalOrderId: string | null;
  artworkId: string;
  title: string;
  buyerName: string | null;
  buyerPhone: string | null;
  artistId: string | null;
  artistFilterId: string;
  artistName: string;
  soldAtUtc: string;
  soldAtKstDate: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
  source: RevenueSource;
  sourceDetail: string | null;
  channel: RevenueChannel;
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
  manualRevenue: number;
  tossRevenue: number;
  manualSoldCount: number;
  tossSoldCount: number;
  offlineRevenue: number;
  onlineRevenue: number;
  offlineSoldCount: number;
  onlineSoldCount: number;
};

export type RevenueDrilldownFilters = {
  buyerName?: string | null;
  buyerPhone?: string | null;
  artistId?: string | null;
};

export type RevenueAnalytics = {
  filter: {
    timezone: string;
    selectedYear: number;
    selectedMonth: number | 'all';
    availableYears: number[];
    buyerName: string | null;
    buyerPhone: string | null;
    artistId: string | null;
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
  summaryBySource: SourceBreakdown;
  summaryByChannel: ChannelBreakdown & {
    onlineRevenueSharePct: number | null;
    onlineSoldSharePct: number | null;
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
    offlineRevenue: number;
    onlineRevenue: number;
    offlineSoldCount: number;
    onlineSoldCount: number;
  }>;
  topArtists: RankedArtist[];
  topBuyers: RankedBuyer[];
  topArtworks: RankedArtwork[];
  entries: RevenueEntry[];
  dataQuality: {
    soldWithoutSoldAtCount: number;
  };
};

export type BuildRevenueAnalyticsInput = {
  rows: RevenueSalesRecordRow[];
  selectedYear: number;
  selectedMonth: number | 'all';
  availableYears: number[];
  soldWithoutSoldAtCount: number;
  drilldown?: RevenueDrilldownFilters;
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

function calcChangeRate(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function calcShare(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Number(((part / total) * 100).toFixed(1));
}

function createSalesAggregate(): SalesAggregate {
  return {
    revenue: 0,
    soldCount: 0,
  };
}

function createMonthlyAccumulator(): MonthlyAccumulator[] {
  return Array.from({ length: 12 }, () => ({
    revenue: 0,
    soldCount: 0,
  }));
}

function createSourceBreakdown(): SourceBreakdown {
  return {
    manual: createSalesAggregate(),
    toss: createSalesAggregate(),
  };
}

function createChannelBreakdown(): ChannelBreakdown {
  return {
    offline: createSalesAggregate(),
    online: createSalesAggregate(),
  };
}

function createMonthlySourceBreakdown(): SourceBreakdown[] {
  return Array.from({ length: 12 }, () => createSourceBreakdown());
}

function normalizeRevenueSource(source: string | null | undefined): RevenueSource {
  if (source === 'toss' || source === 'cafe24') return 'toss';
  return 'manual';
}

function mapSourceToChannel(source: RevenueSource): RevenueChannel {
  if (source === 'toss') return 'online';
  return 'offline';
}

function addToAggregate(target: SalesAggregate, revenue: number, soldCount: number) {
  target.revenue += revenue;
  target.soldCount += soldCount;
}

function resolveArtistName(
  artists: RevenueSalesRecordRow['artworks'] extends infer Artwork
    ? Artwork extends { artists: infer Artists }
      ? Artists
      : never
    : never
) {
  if (Array.isArray(artists)) return artists[0]?.name_ko || '알 수 없음';
  return artists?.name_ko || '알 수 없음';
}

function resolveOrderNo(orders: RevenueSalesRecordRow['orders']) {
  const order = Array.isArray(orders) ? orders[0] : orders;
  return order?.order_no || null;
}

function normalizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getBuyerKey(entry: Pick<RevenueEntry, 'buyerName' | 'buyerPhone'>) {
  if (!entry.buyerName) return null;
  return `${entry.buyerName}\u0000${entry.buyerPhone || ''}`;
}

function getArtistFilterId(artistId: string | null, artistName: string) {
  return artistId || `name:${artistName}`;
}

function createEntry(row: RevenueSalesRecordRow): RevenueEntry | null {
  const soldDate = new Date(row.sold_at);
  if (Number.isNaN(soldDate.getTime())) return null;

  const { year, month, day } = getKstDateParts(soldDate);
  const source = normalizeRevenueSource(row.source);
  const artistName = resolveArtistName(row.artworks?.artists ?? null);
  const artistId = row.artworks?.artist_id || null;
  const quantity = Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1;
  const unitPrice = Number.isFinite(row.sale_price) ? row.sale_price : 0;

  return {
    saleId: row.id,
    orderId: row.order_id || null,
    orderNo: resolveOrderNo(row.orders),
    externalOrderId: row.external_order_id || null,
    artworkId: row.artwork_id,
    title: row.artworks?.title || 'Unknown',
    buyerName: normalizeNullableText(row.buyer_name),
    buyerPhone: normalizeNullableText(row.buyer_phone),
    artistId,
    artistFilterId: getArtistFilterId(artistId, artistName),
    artistName,
    soldAtUtc: row.sold_at,
    soldAtKstDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    quantity,
    unitPrice,
    revenue: unitPrice * quantity,
    source,
    sourceDetail: row.source_detail || null,
    channel: mapSourceToChannel(source),
  };
}

function isInPeriod(entry: RevenueEntry, selectedYear: number, selectedMonth: number | 'all') {
  const [yearText, monthText] = entry.soldAtKstDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (selectedMonth === 'all') return year === selectedYear;
  return year === selectedYear && month === selectedMonth;
}

function matchesDrilldown(entry: RevenueEntry, drilldown: Required<RevenueDrilldownFilters>) {
  if (drilldown.buyerName) {
    if (entry.buyerName !== drilldown.buyerName) return false;
    if (drilldown.buyerPhone && entry.buyerPhone !== drilldown.buyerPhone) return false;
    if (!drilldown.buyerPhone && entry.buyerPhone) return false;
  }

  if (drilldown.artistId && entry.artistFilterId !== drilldown.artistId) {
    return false;
  }

  return true;
}

export function buildRevenueAnalyticsFromRows({
  rows,
  selectedYear,
  selectedMonth,
  availableYears,
  soldWithoutSoldAtCount,
  drilldown,
}: BuildRevenueAnalyticsInput): RevenueAnalytics {
  const currentYearMonthly = createMonthlyAccumulator();
  const previousYearMonthly = createMonthlyAccumulator();
  const currentYearMonthlyBySource = createMonthlySourceBreakdown();
  const allPeriodEntries: RevenueEntry[] = [];

  for (const row of rows) {
    const entry = createEntry(row);
    if (!entry) continue;

    const soldDate = new Date(entry.soldAtUtc);
    const { year, month } = getKstDateParts(soldDate);
    const monthIndex = month - 1;
    if (monthIndex < 0 || monthIndex > 11) continue;

    if (year === selectedYear) {
      currentYearMonthly[monthIndex].revenue += entry.revenue;
      currentYearMonthly[monthIndex].soldCount += entry.quantity;
      addToAggregate(
        currentYearMonthlyBySource[monthIndex][entry.source],
        entry.revenue,
        entry.quantity
      );
    } else if (year === selectedYear - 1) {
      previousYearMonthly[monthIndex].revenue += entry.revenue;
      previousYearMonthly[monthIndex].soldCount += entry.quantity;
    }

    if (isInPeriod(entry, selectedYear, selectedMonth)) {
      allPeriodEntries.push(entry);
    }
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
    const manualRevenue = currentYearMonthlyBySource[index].manual.revenue;
    const manualSoldCount = currentYearMonthlyBySource[index].manual.soldCount;
    const tossRevenue = currentYearMonthlyBySource[index].toss.revenue;
    const tossSoldCount = currentYearMonthlyBySource[index].toss.soldCount;

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
      manualRevenue,
      tossRevenue,
      manualSoldCount,
      tossSoldCount,
      offlineRevenue: manualRevenue,
      onlineRevenue: tossRevenue,
      offlineSoldCount: manualSoldCount,
      onlineSoldCount: tossSoldCount,
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

  const periodSummaryEntries =
    selectedMonth === 'all' ? allPeriodEntries : allPeriodEntries.filter(Boolean);
  const periodTotalRevenue = periodSummaryEntries.reduce((sum, entry) => sum + entry.revenue, 0);
  const periodSoldCount = periodSummaryEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const selectedMonthRow = selectedMonth === 'all' ? null : monthly[selectedMonth - 1];
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
      : {
          periodLabel: `${selectedYear}년 ${selectedMonth}월`,
          totalRevenue: selectedMonthRow?.revenue ?? periodTotalRevenue,
          soldCount: selectedMonthRow?.soldCount ?? periodSoldCount,
          averagePrice: selectedMonthRow?.averagePrice ?? 0,
          comparedToLabel: `${selectedYear - 1}년 ${selectedMonth}월`,
          comparedToRevenue: selectedMonthRow?.previousYearRevenue ?? 0,
          changeRatePct: selectedMonthRow?.yoyChangeRatePct ?? null,
        };

  const normalizedDrilldown: Required<RevenueDrilldownFilters> = {
    buyerName: normalizeNullableText(drilldown?.buyerName) || null,
    buyerPhone: normalizeNullableText(drilldown?.buyerPhone) || null,
    artistId: normalizeNullableText(drilldown?.artistId) || null,
  };
  const entries = allPeriodEntries
    .filter((entry) => matchesDrilldown(entry, normalizedDrilldown))
    .sort((a, b) => b.soldAtUtc.localeCompare(a.soldAtUtc));

  const periodSourceBreakdown = createSourceBreakdown();
  const periodChannelBreakdown = createChannelBreakdown();
  const focusArtistMap = new Map<string, RankedArtist>();
  const focusBuyerMap = new Map<string, RankedBuyer>();

  for (const entry of allPeriodEntries) {
    addToAggregate(periodSourceBreakdown[entry.source], entry.revenue, entry.quantity);
    addToAggregate(periodChannelBreakdown[entry.channel], entry.revenue, entry.quantity);
  }

  for (const entry of entries) {
    const artistKey = entry.artistFilterId;
    const currentArtist = focusArtistMap.get(artistKey) || {
      artistId: entry.artistId,
      artistFilterId: entry.artistFilterId,
      artistName: entry.artistName,
      revenue: 0,
      soldCount: 0,
    };
    focusArtistMap.set(artistKey, {
      ...currentArtist,
      revenue: currentArtist.revenue + entry.revenue,
      soldCount: currentArtist.soldCount + entry.quantity,
    });

    const buyerKey = getBuyerKey(entry);
    if (buyerKey) {
      const currentBuyer = focusBuyerMap.get(buyerKey) || {
        buyerName: entry.buyerName || '확인 중',
        buyerPhone: entry.buyerPhone,
        revenue: 0,
        soldCount: 0,
        purchaseCount: 0,
      };
      focusBuyerMap.set(buyerKey, {
        ...currentBuyer,
        revenue: currentBuyer.revenue + entry.revenue,
        soldCount: currentBuyer.soldCount + entry.quantity,
        purchaseCount: currentBuyer.purchaseCount + 1,
      });
    }
  }

  const topArtists = Array.from(focusArtistMap.values())
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.soldCount - a.soldCount;
    })
    .slice(0, 8);

  const topBuyers = Array.from(focusBuyerMap.values())
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.soldCount !== a.soldCount) return b.soldCount - a.soldCount;
      return a.buyerName.localeCompare(b.buyerName, 'ko');
    })
    .slice(0, 8);

  const topArtworks = [...entries]
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

  const focusMonth =
    selectedMonth === 'all'
      ? null
      : (() => {
          const row = monthly[selectedMonth - 1];
          return {
            month: selectedMonth,
            revenue: row.revenue,
            soldCount: row.soldCount,
            averagePrice: row.averagePrice,
            previousMonthRevenue: row.previousMonthRevenue,
            previousYearRevenue: row.previousYearRevenue,
            momChangeRatePct: row.momChangeRatePct,
            yoyChangeRatePct: row.yoyChangeRatePct,
          };
        })();

  return {
    filter: {
      timezone: KST_TIME_ZONE,
      selectedYear,
      selectedMonth,
      availableYears,
      buyerName: normalizedDrilldown.buyerName,
      buyerPhone: normalizedDrilldown.buyerPhone,
      artistId: normalizedDrilldown.artistId,
    },
    summary,
    summaryBySource: periodSourceBreakdown,
    summaryByChannel: {
      ...periodChannelBreakdown,
      onlineRevenueSharePct: calcShare(periodChannelBreakdown.online.revenue, summary.totalRevenue),
      onlineSoldSharePct: calcShare(periodChannelBreakdown.online.soldCount, summary.soldCount),
    },
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
      offlineRevenue: month.offlineRevenue,
      onlineRevenue: month.onlineRevenue,
      offlineSoldCount: month.offlineSoldCount,
      onlineSoldCount: month.onlineSoldCount,
    })),
    topArtists,
    topBuyers,
    topArtworks,
    entries,
    dataQuality: {
      soldWithoutSoldAtCount,
    },
  };
}
