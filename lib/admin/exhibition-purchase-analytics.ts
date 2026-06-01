export type ExhibitionSaleDetailInput =
  | {
      purchase_channel: string | null;
      delivery_status: string | null;
      shipping_required: string | null;
      paid_status: string | null;
      release_status: string | null;
    }
  | null
  | Array<{
      purchase_channel: string | null;
      delivery_status: string | null;
      shipping_required: string | null;
      paid_status: string | null;
      release_status: string | null;
    }>;

export type ExhibitionPurchaseSaleInput = {
  id: string;
  artwork_id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  sale_price: number;
  quantity: number;
  sold_at: string;
  exhibition_sale_details: ExhibitionSaleDetailInput;
};

export type ExhibitionBuyerAnalyticsRow = {
  buyerName: string;
  buyerPhone: string | null;
  revenue: number;
  purchaseCount: number;
  artworkCount: number;
  averagePurchaseAmount: number;
  channels: string[];
  deliverySummary: string;
  paidSummary: string;
  releaseSummary: string;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  saleIds: string[];
};

export type ExhibitionPurchaseAnalytics = {
  summary: {
    totalRevenue: number;
    saleQuantity: number;
    uniqueBuyerCount: number;
    averageCustomerRevenue: number;
    repeatBuyerCount: number;
    twoPlusArtworkBuyerCount: number;
  };
  operational: {
    shippingRequiredCount: number;
    shippingCompletedCount: number;
    shippingUnknownCount: number;
  };
  purchaseChannels: Array<{ label: string; revenue: number; quantity: number; buyerCount: number }>;
  deliveryStatuses: Array<{ label: string; count: number }>;
  paidStatuses: Array<{ label: string; count: number }>;
  releaseStatuses: Array<{ label: string; count: number }>;
  purchaseBuckets: Array<{ label: string; buyerCount: number }>;
  buyers: ExhibitionBuyerAnalyticsRow[];
};

type ResolvedDetail = Exclude<ExhibitionSaleDetailInput, null | unknown[]> | null;

function resolveDetail(sale: ExhibitionPurchaseSaleInput): ResolvedDetail {
  const detail = sale.exhibition_sale_details;
  if (Array.isArray(detail)) return detail[0] || null;
  return detail;
}

function normalizeLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || '확인 중';
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() || '';
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().normalize('NFC') || '';
}

function addCount(map: Map<string, number>, label: string, count: number) {
  map.set(label, (map.get(label) || 0) + count);
}

function sortCountEntries(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
}

function buildSummary(map: Map<string, number>) {
  const entries = sortCountEntries(map);
  if (entries.length === 0) return '확인 중';
  return entries.map((entry) => `${entry.label} ${entry.count}건`).join(' · ');
}

function isShippingRequired(value: string | null | undefined) {
  const label = value?.trim().toLowerCase();
  if (!label) return false;
  return !['없음', '현장수령', '직접수령', '반출', '해당없음', '아니오', 'no', 'n'].includes(label);
}

function isShippingCompleted(value: string | null | undefined) {
  const label = value?.trim();
  return !!label && /완료|배송완료|발송완료|수령완료/.test(label);
}

function normalizePaidStatus(detail: ResolvedDetail, sale: ExhibitionPurchaseSaleInput) {
  const status = normalizeText(detail?.paid_status);
  if (!status) {
    return sale.sale_price > 0 ? '결제완료(방식 미기록)' : '확인 중';
  }

  const hasCash = status.includes('현금');
  const hasCard = status.includes('카드');
  if (hasCash && hasCard) return '혼합 결제';
  if (status.includes('미입금')) return '미입금';
  if (hasCard) return '카드';
  if (hasCash) return '현금';
  if (status.includes('입금')) return '계좌입금';
  return detail?.paid_status?.trim() || '확인 중';
}

function normalizeReleaseStatus(detail: ResolvedDetail) {
  const releaseStatus = normalizeText(detail?.release_status);
  const deliveryStatus = normalizeText(detail?.delivery_status);
  const combined = `${releaseStatus} ${deliveryStatus}`;

  if (combined.includes('직접반출') || combined.includes('직접불출')) {
    return '직접반출';
  }
  if (releaseStatus.includes('반출')) return '직접반출';
  if (
    deliveryStatus.includes('배송완료') ||
    deliveryStatus.includes('배달완료') ||
    deliveryStatus.includes('택배') ||
    deliveryStatus.includes('직접 배송 완료') ||
    deliveryStatus.includes('직접배송완료') ||
    deliveryStatus.includes('작가 직접 배달 완료') ||
    deliveryStatus.includes('작가가 직접배송완료')
  ) {
    return '배송/전달 완료';
  }

  return detail?.release_status?.trim() || '확인 중';
}

export function buildExhibitionPurchaseAnalytics(
  sales: ExhibitionPurchaseSaleInput[]
): ExhibitionPurchaseAnalytics {
  const channelMap = new Map<string, { revenue: number; quantity: number; buyers: Set<string> }>();
  const deliveryStatusMap = new Map<string, number>();
  const paidStatusMap = new Map<string, number>();
  const releaseStatusMap = new Map<string, number>();
  const buyerMap = new Map<
    string,
    {
      buyerName: string;
      buyerPhone: string | null;
      revenue: number;
      purchaseCount: number;
      artworkIds: Set<string>;
      channels: Set<string>;
      deliveryStatuses: Map<string, number>;
      paidStatuses: Map<string, number>;
      releaseStatuses: Map<string, number>;
      firstPurchaseDate: string;
      lastPurchaseDate: string;
      saleIds: string[];
    }
  >();

  let totalRevenue = 0;
  let saleQuantity = 0;
  let shippingRequiredCount = 0;
  let shippingCompletedCount = 0;
  let shippingUnknownCount = 0;

  for (const sale of sales) {
    const detail = resolveDetail(sale);
    if (!detail) continue;

    const buyerName = normalizeName(sale.buyer_name);
    if (!buyerName) continue;

    const quantity = sale.quantity || 1;
    const revenue = sale.sale_price * quantity;
    const channel = normalizeLabel(detail.purchase_channel);
    const deliveryStatus = normalizeLabel(detail.delivery_status || detail.shipping_required);
    const paidStatus = normalizePaidStatus(detail, sale);
    const releaseStatus = normalizeReleaseStatus(detail);

    totalRevenue += revenue;
    saleQuantity += quantity;
    addCount(deliveryStatusMap, deliveryStatus, quantity);
    addCount(paidStatusMap, paidStatus, quantity);
    addCount(releaseStatusMap, releaseStatus, quantity);

    if (isShippingRequired(detail.shipping_required)) shippingRequiredCount += quantity;
    if (isShippingCompleted(detail.delivery_status)) shippingCompletedCount += quantity;
    if (deliveryStatus === '확인 중') shippingUnknownCount += quantity;

    const channelEntry = channelMap.get(channel) || {
      revenue: 0,
      quantity: 0,
      buyers: new Set<string>(),
    };
    channelEntry.revenue += revenue;
    channelEntry.quantity += quantity;
    channelEntry.buyers.add(buyerName);
    channelMap.set(channel, channelEntry);

    const existing = buyerMap.get(buyerName);
    const buyer =
      existing ||
      ({
        buyerName,
        buyerPhone: sale.buyer_phone?.trim() || null,
        revenue: 0,
        purchaseCount: 0,
        artworkIds: new Set<string>(),
        channels: new Set<string>(),
        deliveryStatuses: new Map<string, number>(),
        paidStatuses: new Map<string, number>(),
        releaseStatuses: new Map<string, number>(),
        firstPurchaseDate: sale.sold_at,
        lastPurchaseDate: sale.sold_at,
        saleIds: [],
      } satisfies NonNullable<ReturnType<typeof buyerMap.get>>);

    buyer.revenue += revenue;
    buyer.purchaseCount += quantity;
    buyer.artworkIds.add(sale.artwork_id);
    buyer.channels.add(channel);
    buyer.saleIds.push(sale.id);
    if (!buyer.buyerPhone && sale.buyer_phone?.trim()) buyer.buyerPhone = sale.buyer_phone.trim();
    if (sale.sold_at < buyer.firstPurchaseDate) buyer.firstPurchaseDate = sale.sold_at;
    if (sale.sold_at > buyer.lastPurchaseDate) buyer.lastPurchaseDate = sale.sold_at;
    addCount(buyer.deliveryStatuses, deliveryStatus, quantity);
    addCount(buyer.paidStatuses, paidStatus, quantity);
    addCount(buyer.releaseStatuses, releaseStatus, quantity);
    buyerMap.set(buyerName, buyer);
  }

  const buyers = Array.from(buyerMap.values())
    .map((buyer) => ({
      buyerName: buyer.buyerName,
      buyerPhone: buyer.buyerPhone,
      revenue: buyer.revenue,
      purchaseCount: buyer.purchaseCount,
      artworkCount: buyer.artworkIds.size,
      averagePurchaseAmount: Math.round(buyer.revenue / Math.max(1, buyer.purchaseCount)),
      channels: Array.from(buyer.channels).sort((a, b) => a.localeCompare(b, 'ko')),
      deliverySummary: buildSummary(buyer.deliveryStatuses),
      paidSummary: buildSummary(buyer.paidStatuses),
      releaseSummary: buildSummary(buyer.releaseStatuses),
      firstPurchaseDate: buyer.firstPurchaseDate,
      lastPurchaseDate: buyer.lastPurchaseDate,
      saleIds: buyer.saleIds,
    }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.purchaseCount !== a.purchaseCount) return b.purchaseCount - a.purchaseCount;
      return a.buyerName.localeCompare(b.buyerName, 'ko');
    });

  return {
    summary: {
      totalRevenue,
      saleQuantity,
      uniqueBuyerCount: buyers.length,
      averageCustomerRevenue: Math.round(totalRevenue / Math.max(1, buyers.length)),
      repeatBuyerCount: buyers.filter((buyer) => buyer.saleIds.length >= 2).length,
      twoPlusArtworkBuyerCount: buyers.filter((buyer) => buyer.purchaseCount >= 2).length,
    },
    operational: {
      shippingRequiredCount,
      shippingCompletedCount,
      shippingUnknownCount,
    },
    purchaseChannels: Array.from(channelMap.entries())
      .map(([label, entry]) => ({
        label,
        revenue: entry.revenue,
        quantity: entry.quantity,
        buyerCount: entry.buyers.size,
      }))
      .sort((a, b) => b.revenue - a.revenue || a.label.localeCompare(b.label, 'ko')),
    deliveryStatuses: sortCountEntries(deliveryStatusMap),
    paidStatuses: sortCountEntries(paidStatusMap),
    releaseStatuses: sortCountEntries(releaseStatusMap),
    purchaseBuckets: [
      { label: '2점 이상', buyerCount: buyers.filter((buyer) => buyer.purchaseCount >= 2).length },
      { label: '1점', buyerCount: buyers.filter((buyer) => buyer.purchaseCount === 1).length },
    ],
    buyers,
  };
}
