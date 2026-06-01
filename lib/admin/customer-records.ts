export type CustomerType = 'member_only' | 'buyer_only' | 'member_buyer';

export type CustomerProfileInput = {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  created_at: string | null;
};

type CustomerSaleArtworkInput = {
  title: string | null;
  artists: { name_ko: string | null } | null;
} | null;

type CustomerSaleDetailInput =
  | {
      purchase_channel: string | null;
      delivery_status: string | null;
      shipping_required: string | null;
    }
  | null
  | Array<{
      purchase_channel: string | null;
      delivery_status: string | null;
      shipping_required: string | null;
    }>;

export type CustomerSaleInput = {
  id: string;
  artwork_id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  sale_price: number;
  quantity: number;
  sold_at: string;
  source: string | null;
  source_detail: string | null;
  artworks: CustomerSaleArtworkInput;
  exhibition_sale_details: CustomerSaleDetailInput;
};

export type CustomerSaleSummary = {
  saleId: string;
  artworkId: string;
  artworkTitle: string | null;
  artistName: string | null;
  quantity: number;
  salePrice: number;
  soldAt: string;
  channel: string;
  deliveryStatus: string | null;
};

export type CustomerRecord = {
  id: string;
  customerName: string;
  customerType: CustomerType;
  profileId: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  joinedAt: string | null;
  purchaseCount: number;
  artworkCount: number;
  totalRevenue: number;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  channels: string[];
  deliverySummary: string;
  searchText: string;
  sales: CustomerSaleSummary[];
};

export type CustomerContactOverrideInput = {
  customer_key: string;
  phone: string | null;
  email: string | null;
};

type BuildCustomerRecordsInput = {
  profiles: CustomerProfileInput[];
  sales: CustomerSaleInput[];
  contactOverrides?: CustomerContactOverrideInput[];
};

export function customerTypeLabel(type: CustomerType) {
  if (type === 'member_buyer') return '회원+구매';
  if (type === 'member_only') return '회원';
  return '비회원';
}

function normalizeName(value: string | null | undefined): string {
  return (value || '').trim().normalize('NFC');
}

function resolveSaleDetail(sale: CustomerSaleInput) {
  const detail = sale.exhibition_sale_details;
  if (Array.isArray(detail)) return detail[0] || null;
  return detail || null;
}

function resolveChannel(sale: CustomerSaleInput): string {
  const detail = resolveSaleDetail(sale);
  if (detail?.purchase_channel?.trim()) return detail.purchase_channel.trim();
  if (sale.source === 'toss' || sale.source === 'cafe24') return '온라인';
  return '오프라인';
}

function buildDeliverySummary(sales: CustomerSaleSummary[]): string {
  const counts = new Map<string, number>();
  for (const sale of sales) {
    const status = sale.deliveryStatus?.trim();
    if (!status) continue;
    counts.set(status, (counts.get(status) || 0) + 1);
  }

  if (counts.size === 0) return '확인 중';

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
    .map(([status, count]) => `${status} ${count}건`)
    .join(' · ');
}

function createEmptyRecord(name: string, profile?: CustomerProfileInput): CustomerRecord {
  return {
    id: profile ? `profile:${profile.id}` : `buyer:${name}`,
    customerName: name,
    customerType: profile ? 'member_only' : 'buyer_only',
    profileId: profile?.id || null,
    email: profile?.email || null,
    phone: null,
    status: profile?.status || null,
    joinedAt: profile?.created_at || null,
    purchaseCount: 0,
    artworkCount: 0,
    totalRevenue: 0,
    firstPurchaseDate: null,
    lastPurchaseDate: null,
    channels: [],
    deliverySummary: '확인 중',
    searchText: '',
    sales: [],
  };
}

function finalizeRecord(record: CustomerRecord): CustomerRecord {
  const artworkIds = new Set(record.sales.map((sale) => sale.artworkId));
  const channels = Array.from(new Set(record.sales.map((sale) => sale.channel))).sort((a, b) =>
    a.localeCompare(b, 'ko')
  );
  const searchable = [
    record.customerName,
    record.email,
    record.phone,
    ...channels,
    ...record.sales.flatMap((sale) => [sale.artworkTitle, sale.artistName]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return {
    ...record,
    artworkCount: artworkIds.size,
    channels,
    deliverySummary: buildDeliverySummary(record.sales),
    searchText: searchable,
  };
}

export function buildCustomerRecords({
  profiles,
  sales,
  contactOverrides = [],
}: BuildCustomerRecordsInput): CustomerRecord[] {
  const byName = new Map<string, CustomerRecord>();
  const contactOverrideByKey = new Map(
    contactOverrides.map((override) => [override.customer_key, override])
  );

  for (const profile of profiles) {
    const name = normalizeName(profile.name) || profile.email?.trim() || '이름 없음';
    byName.set(name, createEmptyRecord(name, profile));
  }

  for (const sale of sales) {
    const buyerName = normalizeName(sale.buyer_name);
    if (!buyerName) continue;

    const detail = resolveSaleDetail(sale);
    const existing = byName.get(buyerName);
    const record = existing || createEmptyRecord(buyerName);
    if (record.profileId) {
      record.customerType = 'member_buyer';
    }

    const quantity = sale.quantity || 1;
    record.purchaseCount += quantity;
    record.totalRevenue += sale.sale_price * quantity;
    record.phone = record.phone || sale.buyer_phone?.trim() || null;
    record.firstPurchaseDate =
      !record.firstPurchaseDate || sale.sold_at < record.firstPurchaseDate
        ? sale.sold_at
        : record.firstPurchaseDate;
    record.lastPurchaseDate =
      !record.lastPurchaseDate || sale.sold_at > record.lastPurchaseDate
        ? sale.sold_at
        : record.lastPurchaseDate;
    record.sales.push({
      saleId: sale.id,
      artworkId: sale.artwork_id,
      artworkTitle: sale.artworks?.title || null,
      artistName: sale.artworks?.artists?.name_ko || null,
      quantity,
      salePrice: sale.sale_price,
      soldAt: sale.sold_at,
      channel: resolveChannel(sale),
      deliveryStatus: detail?.delivery_status?.trim() || detail?.shipping_required?.trim() || null,
    });

    byName.set(buyerName, record);
  }

  for (const record of byName.values()) {
    const override = contactOverrideByKey.get(record.id);
    if (override) {
      record.phone = override.phone;
      record.email = override.email;
    }
  }

  return Array.from(byName.values())
    .map(finalizeRecord)
    .sort((a, b) => {
      if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
      if ((b.lastPurchaseDate || '') !== (a.lastPurchaseDate || '')) {
        return (b.lastPurchaseDate || '').localeCompare(a.lastPurchaseDate || '');
      }
      return a.customerName.localeCompare(b.customerName, 'ko');
    });
}
