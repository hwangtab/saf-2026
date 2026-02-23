import { createSupabaseAdminClient } from '@/lib/auth/server';
import { createCafe24AdminApiClient, getCafe24Config } from './client';
import { syncArtworkToCafe24 } from './sync-artwork';

const CAFE24_SYNC_NOTE = 'Cafe24 주문 자동 동기화';
const DEFAULT_ORDER_PAGE_LIMIT = 100;
const MAX_ORDER_PAGES = 40;
const DEFAULT_CURSOR_OVERLAP_MINUTES = 180;
const EXISTING_CODE_CHUNK_SIZE = 400;
const INSERT_CHUNK_SIZE = 200;
const PRODUCT_NO_BACKFILL_CHUNK_SIZE = 40;
const MAX_CAFE24_LOCK_SYNC_CONCURRENCY = 4;

const STATUS_FIELD_CANDIDATES = [
  'order_status',
  'order_status_text',
  'order_status_code',
  'order_state',
  'order_state_text',
  'shipping_status',
  'shipping_status_text',
  'shipping_status_code',
  'delivery_status',
  'delivery_status_text',
  'delivery_status_code',
  'payment_status',
  'payment_state',
  'pay_status',
  'paid',
  'status',
  'status_text',
  'status_code',
  'item_status',
  'item_status_text',
  'item_status_code',
  'fulfillment_status',
] as const;

const SALE_RECOGNIZED_STATUS_KEYWORDS = [
  '입금전',
  '입금대기',
  '미입금',
  '결제대기',
  '주문완료',
  '상품준비',
  '배송준비',
  '배송중',
  '배송완료',
  '출고완료',
  '구매확정',
  'processing',
  'preparing',
  'ready',
  'shipped',
  'delivered',
  'completed',
  'pendingpayment',
  'awaitingpayment',
  'unpaid',
] as const;

const SALE_EXCLUDED_STATUS_KEYWORDS = [
  '취소',
  '주문취소',
  '환불',
  '반품',
  '교환',
  'cancel',
  'cancelled',
  'canceled',
  'refund',
  'return',
  'returned',
  'exchange',
  'void',
  'chargeback',
  'failed',
  'failure',
] as const;

type JsonRecord = Record<string, unknown>;

type SyncStateRow = {
  mall_id: string;
  cutoff_paid_at: string;
  last_synced_paid_at: string | null;
  last_sync_started_at: string | null;
  last_sync_completed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type PreparedSaleRow = {
  artwork_id: string;
  sale_price: number;
  quantity: number;
  buyer_name: string | null;
  note: string;
  sold_at: string;
  source: 'cafe24';
  external_order_id: string;
  external_order_item_code: string;
  external_payload: JsonRecord;
};

type OrderContext = {
  orderId: string;
  paidAt: string | null;
  buyerName: string | null;
  paid: boolean;
  raw: JsonRecord;
};

type OrderItemContext = {
  orderItemCode: string;
  productNo: number;
  quantity: number;
  salePrice: number;
  soldAt: string;
  soldAtMs: number;
  payload: JsonRecord;
};

type PageFetchResult = {
  payload: unknown;
  dateType: string | null;
};

type InsertResult = {
  inserted: number;
  duplicateSkipped: number;
  failed: number;
  errors: string[];
};

type ProductNoBackfillResult = {
  updated: number;
  failed: number;
};

type ArtworkProductMapResult = {
  mapping: Map<number, string>;
  backfill: ProductNoBackfillResult;
};

type SoldOutLockResult = {
  synced: number;
  failed: number;
  errors: string[];
};

export type Cafe24SalesSyncOptions = {
  forceWindowFromIso?: string | null;
  forceWindowToIso?: string | null;
};

export type Cafe24SalesSyncResult = {
  ok: boolean;
  mallId: string;
  windowFrom: string;
  windowTo: string;
  dateType: string | null;
  ordersFetched: number;
  ordersPaid: number;
  orderItemsFetched: number;
  mappedItems: number;
  inserted: number;
  duplicateSkipped: number;
  skippedNoProductNo: number;
  skippedNoArtworkMapping: number;
  skippedOutsideWindow: number;
  failedOrders: number;
  backfilledProductNos: number;
  backfillProductNoFailures: number;
  soldOutLockedSynced: number;
  soldOutLockFailed: number;
  errors: string[];
  reason?: string;
};

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const NORMALIZED_SALE_RECOGNIZED_KEYWORDS = SALE_RECOGNIZED_STATUS_KEYWORDS.map((keyword) =>
  normalizeStatusToken(keyword)
);
const NORMALIZED_SALE_EXCLUDED_KEYWORDS = SALE_EXCLUDED_STATUS_KEYWORDS.map((keyword) =>
  normalizeStatusToken(keyword)
);

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JsonRecord => !!item && typeof item === 'object');
}

function parseInteger(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw !== 'string') return null;
  const stripped = raw.trim().replace(/[^\d-]/g, '');
  if (!stripped) return null;
  const parsed = Number.parseInt(stripped, 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function parsePositiveInteger(raw: unknown, fallback: number): number {
  const parsed = parseInteger(raw);
  if (!parsed || parsed <= 0) return fallback;
  return parsed;
}

function parseMoney(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw < 0 ? 0 : Math.round(raw);
  }

  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed < 0 ? 0 : Math.round(parsed);
}

function pickString(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseBooleanFlag(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw > 0;
  if (typeof raw !== 'string') return null;

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  if (
    ['t', 'true', 'y', 'yes', 'paid', 'complete', 'completed', 'done', '1'].includes(normalized)
  ) {
    return true;
  }
  if (['f', 'false', 'n', 'no', 'cancel', 'cancelled', 'canceled', '0'].includes(normalized)) {
    return false;
  }
  return null;
}

function normalizeToIso(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const epochMs = raw > 1_000_000_000_000 ? raw : raw * 1000;
    const date = new Date(epochMs);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00+09:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const normalized = value.replace(' ', 'T');
    const parsed = new Date(`${normalized}+09:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isoToMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function toKstDateString(iso: string): string {
  return KST_DATE_FORMATTER.format(new Date(iso));
}

function uniqueStable<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, i + size));
  }
  return result;
}

function extractArrayByKeyCandidates(
  payload: unknown,
  keyCandidates: string[],
  fallbackKeys: string[]
): JsonRecord[] {
  const root = asRecord(payload);
  if (root) {
    for (const key of keyCandidates) {
      const rows = asRecordArray(root[key]);
      if (rows.length > 0) return rows;
    }
  }

  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (Array.isArray(current)) {
      const rows = asRecordArray(current);
      if (rows.length > 0) {
        const matched = rows.some((row) => fallbackKeys.some((key) => row[key] !== undefined));
        if (matched) return rows;
      }
      for (const item of current) stack.push(item);
      continue;
    }

    for (const value of Object.values(current as JsonRecord)) {
      stack.push(value);
    }
  }

  return [];
}

function isUniqueViolation(error: unknown): boolean {
  const code =
    asRecord(error)?.code ||
    (asRecord(asRecord(error)?.details)?.code as unknown) ||
    (asRecord(asRecord(error)?.error)?.code as unknown);
  if (code === '23505') return true;

  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.toLowerCase().includes('duplicate key');
}

function extractProductNoFromShopUrl(shopUrl: string | null): number | null {
  if (!shopUrl || typeof shopUrl !== 'string') return null;

  const surlMatch = shopUrl.match(/\/surl\/O\/(\d+)/i);
  if (surlMatch?.[1]) {
    const parsed = Number.parseInt(surlMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const productNoMatch = shopUrl.match(/[?&]product_no=(\d+)/i);
  if (productNoMatch?.[1]) {
    const parsed = Number.parseInt(productNoMatch[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeStatusToken(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, '');
}

function collectStatusValues(record: JsonRecord): string[] {
  const collected: string[] = [];

  for (const key of STATUS_FIELD_CANDIDATES) {
    const raw = record[key];
    if (raw === null || raw === undefined) continue;

    if (typeof raw === 'string' && raw.trim()) {
      collected.push(raw.trim());
      continue;
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      collected.push(String(raw));
      continue;
    }

    if (typeof raw === 'boolean') {
      collected.push(raw ? 'true' : 'false');
      continue;
    }

    const nested = asRecord(raw);
    if (!nested) continue;

    for (const nestedKey of ['code', 'name', 'status', 'value', 'text']) {
      const nestedValue = nested[nestedKey];
      if (typeof nestedValue === 'string' && nestedValue.trim()) {
        collected.push(nestedValue.trim());
      } else if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) {
        collected.push(String(nestedValue));
      }
    }
  }

  return collected;
}

function containsStatusKeyword(normalizedValues: string[], normalizedKeywords: string[]): boolean {
  return normalizedValues.some((value) =>
    normalizedKeywords.some((keyword) => value.includes(keyword))
  );
}

function isOrderConsideredSold(order: OrderContext, items: JsonRecord[]): boolean {
  const statusValues: string[] = [...collectStatusValues(order.raw)];
  for (const item of items) {
    statusValues.push(...collectStatusValues(item));
  }

  const normalizedStatusValues = statusValues
    .map((value) => normalizeStatusToken(value))
    .filter((value) => value.length > 0);

  if (containsStatusKeyword(normalizedStatusValues, NORMALIZED_SALE_EXCLUDED_KEYWORDS)) {
    return false;
  }

  if (containsStatusKeyword(normalizedStatusValues, NORMALIZED_SALE_RECOGNIZED_KEYWORDS)) {
    return true;
  }

  return order.paid;
}

function resolveInitialCutoff(nowIso: string): string {
  const envRaw = process.env.CAFE24_SALES_SYNC_CUTOFF_AT?.trim();
  if (!envRaw) return nowIso;
  const parsed = normalizeToIso(envRaw);
  return parsed || nowIso;
}

function resolveCursorOverlapMinutes(): number {
  const raw = process.env.CAFE24_SALES_SYNC_OVERLAP_MINUTES?.trim();
  if (!raw) return DEFAULT_CURSOR_OVERLAP_MINUTES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_CURSOR_OVERLAP_MINUTES;
  return Math.min(parsed, 24 * 60);
}

function resolveNextCursorIso(previousIso: string | null, candidateMs: number): string {
  const previousMs = isoToMs(previousIso) || 0;
  const nextMs = Math.max(previousMs, candidateMs);
  return new Date(nextMs).toISOString();
}

async function ensureSyncState(mallId: string, initialCutoffIso: string): Promise<SyncStateRow> {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { error: insertError } = await supabase.from('cafe24_sales_sync_state').insert({
    mall_id: mallId,
    cutoff_paid_at: initialCutoffIso,
    updated_at: nowIso,
  });
  if (insertError && !isUniqueViolation(insertError)) {
    throw new Error(`Cafe24 판매 동기화 상태 초기화 실패: ${insertError.message}`);
  }

  const { data, error } = await supabase
    .from('cafe24_sales_sync_state')
    .select(
      'mall_id, cutoff_paid_at, last_synced_paid_at, last_sync_started_at, last_sync_completed_at, last_error, created_at, updated_at'
    )
    .eq('mall_id', mallId)
    .single();

  if (error || !data) {
    throw new Error(`Cafe24 판매 동기화 상태 조회 실패: ${error?.message || 'not_found'}`);
  }

  return data as SyncStateRow;
}

async function updateSyncState(
  mallId: string,
  patch: Partial<Omit<SyncStateRow, 'mall_id' | 'created_at'>>
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('cafe24_sales_sync_state')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('mall_id', mallId);

  if (error) {
    throw new Error(`Cafe24 판매 동기화 상태 업데이트 실패: ${error.message}`);
  }
}

function buildOrderContext(order: JsonRecord): OrderContext | null {
  const orderId = pickString(order, ['order_id', 'order_no']);
  if (!orderId) return null;

  const paidAt =
    normalizeToIso(
      pickString(order, [
        'paid_date',
        'pay_date',
        'payment_date',
        'first_payment_date',
        'order_date',
        'ordered_date',
      ])
    ) || null;

  const paidFlag = parseBooleanFlag(
    pickString(order, ['paid', 'payment_status', 'payment_state', 'is_paid']) ||
      order.paid ||
      order.payment_status ||
      order.payment_state
  );

  return {
    orderId,
    paidAt,
    buyerName: pickString(order, ['buyer_name', 'order_name', 'member_name', 'receiver_name']),
    paid: paidFlag ?? !!paidAt,
    raw: order,
  };
}

function resolveOrderItemCode(orderId: string, item: JsonRecord, index: number): string {
  const explicit =
    pickString(item, ['order_item_code', 'item_code', 'order_product_code', 'product_code']) ||
    null;
  if (explicit) return explicit;

  const fallbackProduct = parseInteger(item.product_no) ?? parseInteger(item.item_no) ?? 0;
  const fallbackVariant =
    pickString(item, ['variant_code', 'option_code', 'option_value', 'option_name']) || 'base';
  return `${orderId}:${fallbackProduct}:${fallbackVariant}:${index}`;
}

function resolveOrderItemPrice(item: JsonRecord, order: JsonRecord, quantity: number): number {
  const unitCandidates = [
    'product_price',
    'sale_price',
    'selling_price',
    'product_sale_price',
    'price',
    'item_price',
  ];
  for (const key of unitCandidates) {
    const money = parseMoney(item[key]);
    if (money !== null) return money;
  }

  const totalCandidates = [
    parseMoney(item.payment_amount),
    parseMoney(item.order_item_price),
    parseMoney(item.total_price),
    parseMoney(order.payment_amount),
    parseMoney(order.order_price_amount),
  ];
  for (const total of totalCandidates) {
    if (total === null) continue;
    if (quantity <= 1) return total;
    return Math.max(0, Math.round(total / quantity));
  }

  return 0;
}

function buildOrderItemContext(
  orderContext: OrderContext,
  item: JsonRecord,
  index: number
): OrderItemContext | null {
  const productNo = parseInteger(item.product_no) ?? parseInteger(item.item_no);
  if (!productNo || productNo <= 0) return null;

  const quantity = parsePositiveInteger(item.quantity ?? item.product_quantity ?? item.amount, 1);
  const salePrice = resolveOrderItemPrice(item, orderContext.raw, quantity);
  const soldAt =
    normalizeToIso(
      pickString(item, [
        'paid_date',
        'pay_date',
        'payment_date',
        'order_date',
        'ordered_date',
        'updated_date',
      ])
    ) ||
    orderContext.paidAt ||
    new Date().toISOString();
  const soldAtMs = isoToMs(soldAt);
  if (!soldAtMs) return null;

  const orderItemCode = resolveOrderItemCode(orderContext.orderId, item, index);
  const payload: JsonRecord = {
    order_id: orderContext.orderId,
    order_item_code: orderItemCode,
    product_no: productNo,
    quantity,
    sale_price: salePrice,
    sold_at: soldAt,
    product_name: pickString(item, ['product_name', 'item_name']),
    order_status: pickString(item, ['order_status', 'order_status_text', 'order_status_code']),
    shipping_status: pickString(item, [
      'shipping_status',
      'shipping_status_text',
      'delivery_status',
      'delivery_status_text',
    ]),
    payment_status: pickString(item, ['payment_status', 'payment_state', 'paid']),
  };

  return {
    orderItemCode,
    productNo,
    quantity,
    salePrice,
    soldAt,
    soldAtMs,
    payload,
  };
}

async function fetchOrdersInRange(
  client: ReturnType<typeof createCafe24AdminApiClient>,
  windowFromIso: string,
  windowToIso: string
): Promise<{ orders: JsonRecord[]; dateType: string | null }> {
  const startDate = toKstDateString(windowFromIso);
  const endDate = toKstDateString(windowToIso);
  const pageLimit = DEFAULT_ORDER_PAGE_LIMIT;
  const allOrders: JsonRecord[] = [];
  let offset = 0;
  let selectedDateType: string | null = null;

  for (let page = 0; page < MAX_ORDER_PAGES; page += 1) {
    const pageResult = await fetchOrdersPage(client, {
      startDate,
      endDate,
      limit: pageLimit,
      offset,
      preferredDateType: selectedDateType,
    });

    if (selectedDateType === null) {
      selectedDateType = pageResult.dateType;
    }

    const rows = extractArrayByKeyCandidates(
      pageResult.payload,
      ['orders', 'order_list', 'data'],
      ['order_id', 'order_no']
    );
    if (rows.length === 0) break;

    allOrders.push(...rows);
    if (rows.length < pageLimit) break;
    offset += pageLimit;
  }

  return {
    orders: allOrders,
    dateType: selectedDateType,
  };
}

async function fetchOrdersPage(
  client: ReturnType<typeof createCafe24AdminApiClient>,
  input: {
    startDate: string;
    endDate: string;
    limit: number;
    offset: number;
    preferredDateType: string | null;
  }
): Promise<PageFetchResult> {
  const tried: string[] = [];
  const variants = uniqueStable<string | null>([
    input.preferredDateType,
    'order_date',
    'pay_date',
    null,
  ]);

  for (const dateType of variants) {
    const query = new URLSearchParams({
      start_date: input.startDate,
      end_date: input.endDate,
      limit: String(input.limit),
      offset: String(input.offset),
    });
    if (dateType) {
      query.set('date_type', dateType);
    }

    const path = `/orders?${query.toString()}`;
    try {
      const payload = await client.request(path, { method: 'GET' });
      return { payload, dateType };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      tried.push(`${dateType || 'default'}: ${message}`);
    }
  }

  throw new Error(`Cafe24 주문 조회 실패: ${tried.join(' | ')}`);
}

async function fetchOrderItems(
  client: ReturnType<typeof createCafe24AdminApiClient>,
  orderId: string
): Promise<JsonRecord[]> {
  const payload = await client.request(`/orders/${encodeURIComponent(orderId)}/items`, {
    method: 'GET',
  });
  return extractArrayByKeyCandidates(
    payload,
    ['items', 'order_items', 'data'],
    ['order_item_code', 'item_code', 'product_no']
  );
}

async function backfillArtworkProductNos(
  rows: Array<{ id: string; productNo: number }>
): Promise<ProductNoBackfillResult> {
  const supabase = createSupabaseAdminClient();
  const patches = uniqueStable(rows.map((row) => `${row.id}:${row.productNo}`)).map((pair) => {
    const [id, productNoRaw] = pair.split(':');
    return { id, productNo: Number.parseInt(productNoRaw, 10) };
  });

  if (patches.length === 0) {
    return { updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed = 0;

  for (const batch of chunk(patches, PRODUCT_NO_BACKFILL_CHUNK_SIZE)) {
    const settled = await Promise.all(
      batch.map(async (patch) => {
        const { error } = await supabase
          .from('artworks')
          .update({
            cafe24_product_no: patch.productNo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', patch.id)
          .is('cafe24_product_no', null);

        return { ok: !error, error };
      })
    );

    for (const result of settled) {
      if (result.ok) {
        updated += 1;
      } else {
        failed += 1;
      }
    }
  }

  return { updated, failed };
}

async function loadArtworkMapByProductNo(): Promise<ArtworkProductMapResult> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('artworks')
    .select('id, cafe24_product_no, shop_url')
    .not('shop_url', 'is', null);

  if (error) {
    throw new Error(`작품 매핑 조회 실패: ${error.message}`);
  }

  const mapping = new Map<number, string>();
  const backfillCandidates: Array<{ id: string; productNo: number }> = [];

  for (const row of (data || []) as Array<{
    id: string;
    cafe24_product_no: number | string | null;
    shop_url: string | null;
  }>) {
    const productNoFromColumn =
      typeof row.cafe24_product_no === 'number'
        ? Math.trunc(row.cafe24_product_no)
        : parseInteger(row.cafe24_product_no);
    const productNoFromShopUrl = extractProductNoFromShopUrl(row.shop_url);
    const resolvedProductNo = productNoFromColumn || productNoFromShopUrl;

    if (!resolvedProductNo || resolvedProductNo <= 0) continue;
    if (!mapping.has(resolvedProductNo)) {
      mapping.set(resolvedProductNo, row.id);
    }

    if (!productNoFromColumn && productNoFromShopUrl) {
      backfillCandidates.push({ id: row.id, productNo: productNoFromShopUrl });
    }
  }

  const backfill = await backfillArtworkProductNos(backfillCandidates);

  return {
    mapping,
    backfill,
  };
}

async function filterExistingOrderItemCodes(rows: PreparedSaleRow[]): Promise<{
  filtered: PreparedSaleRow[];
  duplicateSkipped: number;
}> {
  const supabase = createSupabaseAdminClient();
  const codes = uniqueStable(rows.map((row) => row.external_order_item_code).filter(Boolean));
  if (codes.length === 0) {
    return { filtered: rows, duplicateSkipped: 0 };
  }

  const existing = new Set<string>();
  for (const codeChunk of chunk(codes, EXISTING_CODE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('artwork_sales')
      .select('external_order_item_code')
      .eq('source', 'cafe24')
      .in('external_order_item_code', codeChunk);

    if (error) {
      throw new Error(`기존 동기화 코드 조회 실패: ${error.message}`);
    }

    for (const row of (data || []) as Array<{ external_order_item_code: string | null }>) {
      if (typeof row.external_order_item_code === 'string' && row.external_order_item_code) {
        existing.add(row.external_order_item_code);
      }
    }
  }

  const filtered = rows.filter((row) => !existing.has(row.external_order_item_code));
  return {
    filtered,
    duplicateSkipped: rows.length - filtered.length,
  };
}

async function insertPreparedSales(rows: PreparedSaleRow[]): Promise<InsertResult> {
  const supabase = createSupabaseAdminClient();
  let inserted = 0;
  let duplicateSkipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const batch of chunk(rows, INSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from('artwork_sales').insert(batch);
    if (!error) {
      inserted += batch.length;
      continue;
    }

    if (!isUniqueViolation(error)) {
      failed += batch.length;
      errors.push(error.message);
      continue;
    }

    for (const row of batch) {
      const { error: singleError } = await supabase.from('artwork_sales').insert(row);
      if (!singleError) {
        inserted += 1;
        continue;
      }
      if (isUniqueViolation(singleError)) {
        duplicateSkipped += 1;
        continue;
      }
      failed += 1;
      errors.push(singleError.message);
    }
  }

  return {
    inserted,
    duplicateSkipped,
    failed,
    errors,
  };
}

async function lockSoldOutArtworksOnCafe24(artworkIds: string[]): Promise<SoldOutLockResult> {
  const uniqueArtworkIds = uniqueStable(artworkIds.filter((id) => typeof id === 'string' && id));
  if (uniqueArtworkIds.length === 0) {
    return {
      synced: 0,
      failed: 0,
      errors: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('artworks')
    .select('id, edition_type, status')
    .in('id', uniqueArtworkIds);

  if (error) {
    return {
      synced: 0,
      failed: uniqueArtworkIds.length,
      errors: [`판매잠금 대상 조회 실패: ${error.message}`],
    };
  }

  const targets = (
    (data || []) as Array<{ id: string; edition_type: string | null; status: string | null }>
  )
    .filter((row) => row.status === 'sold')
    .filter((row) => row.edition_type === 'unique' || row.edition_type === 'limited')
    .map((row) => row.id);

  if (targets.length === 0) {
    return {
      synced: 0,
      failed: 0,
      errors: [],
    };
  }

  let synced = 0;
  const errors: string[] = [];
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= targets.length) return;

      const artworkId = targets[index];
      const result = await syncArtworkToCafe24(artworkId);
      if (result.ok) {
        synced += 1;
      } else {
        errors.push(`${artworkId}: ${result.reason || '알 수 없는 오류'}`);
      }
    }
  };

  const workerCount = Math.min(MAX_CAFE24_LOCK_SYNC_CONCURRENCY, targets.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    synced,
    failed: errors.length,
    errors,
  };
}

export async function syncCafe24SalesFromOrders(
  options: Cafe24SalesSyncOptions = {}
): Promise<Cafe24SalesSyncResult> {
  const config = getCafe24Config();
  const nowIso = new Date().toISOString();

  if (!config) {
    return {
      ok: false,
      mallId: 'unknown',
      windowFrom: nowIso,
      windowTo: nowIso,
      dateType: null,
      ordersFetched: 0,
      ordersPaid: 0,
      orderItemsFetched: 0,
      mappedItems: 0,
      inserted: 0,
      duplicateSkipped: 0,
      skippedNoProductNo: 0,
      skippedNoArtworkMapping: 0,
      skippedOutsideWindow: 0,
      failedOrders: 0,
      backfilledProductNos: 0,
      backfillProductNoFailures: 0,
      soldOutLockedSynced: 0,
      soldOutLockFailed: 0,
      errors: [],
      reason: 'Cafe24 환경변수가 설정되지 않았습니다.',
    };
  }

  const mallId = config.mallId;
  const initialCutoff = resolveInitialCutoff(nowIso);
  const overlapMinutes = resolveCursorOverlapMinutes();
  const state = await ensureSyncState(mallId, initialCutoff);

  const cutoffMs = isoToMs(state.cutoff_paid_at) || Date.parse(initialCutoff);
  const baseCursorMs = isoToMs(state.last_synced_paid_at) || cutoffMs;
  const defaultWindowFromMs = Math.max(cutoffMs, baseCursorMs - overlapMinutes * 60 * 1000);

  const forcedWindowFromMs = isoToMs(normalizeToIso(options.forceWindowFromIso || null));
  const forcedWindowToMs = isoToMs(normalizeToIso(options.forceWindowToIso || null));

  const windowToMs = forcedWindowToMs ?? Date.parse(nowIso);
  const candidateFromMs = forcedWindowFromMs ?? defaultWindowFromMs;
  const windowFromMs = Math.min(candidateFromMs, windowToMs);

  const windowFromIso = new Date(windowFromMs).toISOString();
  const windowToIso = new Date(windowToMs).toISOString();

  await updateSyncState(mallId, {
    last_sync_started_at: nowIso,
    last_error: null,
  });

  if (windowFromMs >= windowToMs) {
    await updateSyncState(mallId, {
      last_synced_paid_at: resolveNextCursorIso(state.last_synced_paid_at, windowToMs),
      last_sync_completed_at: new Date().toISOString(),
      last_error: null,
    });
    return {
      ok: true,
      mallId,
      windowFrom: windowFromIso,
      windowTo: windowToIso,
      dateType: null,
      ordersFetched: 0,
      ordersPaid: 0,
      orderItemsFetched: 0,
      mappedItems: 0,
      inserted: 0,
      duplicateSkipped: 0,
      skippedNoProductNo: 0,
      skippedNoArtworkMapping: 0,
      skippedOutsideWindow: 0,
      failedOrders: 0,
      backfilledProductNos: 0,
      backfillProductNoFailures: 0,
      soldOutLockedSynced: 0,
      soldOutLockFailed: 0,
      errors: [],
    };
  }

  const errors: string[] = [];
  let ordersFetched = 0;
  let ordersPaid = 0;
  let orderItemsFetched = 0;
  let mappedItems = 0;
  let skippedNoProductNo = 0;
  let skippedNoArtworkMapping = 0;
  let skippedOutsideWindow = 0;
  let failedOrders = 0;
  let duplicateSkipped = 0;
  let inserted = 0;
  let dateTypeUsed: string | null = null;
  let backfilledProductNos = 0;
  let backfillProductNoFailures = 0;
  let soldOutLockedSynced = 0;
  let soldOutLockFailed = 0;

  try {
    const client = createCafe24AdminApiClient();
    const [orderResult, artworkMapResult] = await Promise.all([
      fetchOrdersInRange(client, windowFromIso, windowToIso),
      loadArtworkMapByProductNo(),
    ]);

    const artworkByProductNo = artworkMapResult.mapping;
    backfilledProductNos = artworkMapResult.backfill.updated;
    backfillProductNoFailures = artworkMapResult.backfill.failed;

    ordersFetched = orderResult.orders.length;
    dateTypeUsed = orderResult.dateType;

    const preparedRows: PreparedSaleRow[] = [];
    const localDedup = new Set<string>();

    for (const orderRaw of orderResult.orders) {
      const order = buildOrderContext(orderRaw);
      if (!order) {
        failedOrders += 1;
        errors.push('order_id가 없는 주문을 건너뛰었습니다.');
        continue;
      }

      try {
        const items = await fetchOrderItems(client, order.orderId);
        orderItemsFetched += items.length;

        if (!isOrderConsideredSold(order, items)) {
          continue;
        }

        ordersPaid += 1;

        items.forEach((item, index) => {
          const itemContext = buildOrderItemContext(order, item, index);
          if (!itemContext) {
            skippedNoProductNo += 1;
            return;
          }

          if (itemContext.soldAtMs < windowFromMs || itemContext.soldAtMs > windowToMs + 60_000) {
            skippedOutsideWindow += 1;
            return;
          }

          const artworkId = artworkByProductNo.get(itemContext.productNo);
          if (!artworkId) {
            skippedNoArtworkMapping += 1;
            return;
          }

          if (localDedup.has(itemContext.orderItemCode)) {
            duplicateSkipped += 1;
            return;
          }
          localDedup.add(itemContext.orderItemCode);

          mappedItems += 1;
          preparedRows.push({
            artwork_id: artworkId,
            sale_price: itemContext.salePrice,
            quantity: itemContext.quantity,
            buyer_name: order.buyerName,
            note: CAFE24_SYNC_NOTE,
            sold_at: itemContext.soldAt,
            source: 'cafe24',
            external_order_id: order.orderId,
            external_order_item_code: itemContext.orderItemCode,
            external_payload: itemContext.payload,
          });
        });
      } catch (error) {
        failedOrders += 1;
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`주문 ${order.orderId} 아이템 조회 실패: ${message}`);
      }
    }

    const dedupedByDb = await filterExistingOrderItemCodes(preparedRows);
    duplicateSkipped += dedupedByDb.duplicateSkipped;

    const insertResult = await insertPreparedSales(dedupedByDb.filtered);
    inserted = insertResult.inserted;
    duplicateSkipped += insertResult.duplicateSkipped;
    if (insertResult.failed > 0) {
      errors.push(...insertResult.errors);
    }

    const affectedArtworkIds = uniqueStable(dedupedByDb.filtered.map((row) => row.artwork_id));
    const lockResult = await lockSoldOutArtworksOnCafe24(affectedArtworkIds);
    soldOutLockedSynced = lockResult.synced;
    soldOutLockFailed = lockResult.failed;
    if (lockResult.failed > 0) {
      errors.push(...lockResult.errors);
    }

    const syncSucceeded = errors.length === 0;
    await updateSyncState(mallId, {
      last_synced_paid_at: syncSucceeded
        ? resolveNextCursorIso(state.last_synced_paid_at, windowToMs)
        : state.last_synced_paid_at,
      last_sync_completed_at: new Date().toISOString(),
      last_error: syncSucceeded ? null : errors.join(' | ').slice(0, 2000),
    });

    return {
      ok: syncSucceeded,
      mallId,
      windowFrom: windowFromIso,
      windowTo: windowToIso,
      dateType: dateTypeUsed,
      ordersFetched,
      ordersPaid,
      orderItemsFetched,
      mappedItems,
      inserted,
      duplicateSkipped,
      skippedNoProductNo,
      skippedNoArtworkMapping,
      skippedOutsideWindow,
      failedOrders,
      backfilledProductNos,
      backfillProductNoFailures,
      soldOutLockedSynced,
      soldOutLockFailed,
      errors,
      reason: syncSucceeded ? undefined : '일부 주문 동기화에 실패했습니다.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateSyncState(mallId, {
      last_sync_completed_at: new Date().toISOString(),
      last_error: message.slice(0, 2000),
    });

    return {
      ok: false,
      mallId,
      windowFrom: windowFromIso,
      windowTo: windowToIso,
      dateType: dateTypeUsed,
      ordersFetched,
      ordersPaid,
      orderItemsFetched,
      mappedItems,
      inserted,
      duplicateSkipped,
      skippedNoProductNo,
      skippedNoArtworkMapping,
      skippedOutsideWindow,
      failedOrders,
      backfilledProductNos,
      backfillProductNoFailures,
      soldOutLockedSynced,
      soldOutLockFailed,
      errors: [...errors, message],
      reason: message,
    };
  }
}
