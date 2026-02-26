import crypto from 'node:crypto';
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
const DEFAULT_MANUAL_MIRROR_PURGE_WINDOW_HOURS = 72;
const DEFAULT_MANUAL_MIRROR_IMPORT_DATE = '2026-02-15';
const DEFAULT_FAILED_ORDER_RETRY_LIMIT = 30;
const FAILED_ORDER_UPSERT_CHUNK_SIZE = 100;
const VOID_REASON_MAX_LENGTH = 250;

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
  last_synced_void_at: string | null;
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
  source_detail: 'cafe24_api';
  external_order_id: string;
  external_order_item_code: string;
  external_payload: JsonRecord;
};

type FailedOrderQueueRow = {
  mall_id: string;
  order_id: string;
  retry_count: number;
};

type OrderContext = {
  orderId: string;
  paidAt: string | null;
  orderedAt: string | null;
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
  filterAnchorMs: number | null;
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
  duplicateProductNos: number[];
};

type SoldOutLockResult = {
  synced: number;
  failed: number;
  errors: string[];
};

type ManualMirrorPurgeResult = {
  purged: number;
  errors: string[];
};

type VoidedSaleResult = {
  voided: number;
  affectedArtworkIds: string[];
  errors: string[];
};

type VoidCandidateRow = {
  orderId: string | null;
  orderItemCode: string | null;
  reason: string;
  payload: JsonRecord;
  voidedAt: string;
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
  voided: number;
  duplicateSkipped: number;
  skippedNoProductNo: number;
  skippedNoArtworkMapping: number;
  skippedOutsideWindow: number;
  failedOrders: number;
  backfilledProductNos: number;
  backfillProductNoFailures: number;
  manualMirrorPurged: number;
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

function isCafe24NoApiFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    message?: string;
  };

  return candidate.message?.toLowerCase().includes('no api found') ?? false;
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

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const obj = value as JsonRecord;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
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

function isItemConsideredSold(order: OrderContext, item: JsonRecord): boolean {
  const orderStatusValues = collectStatusValues(order.raw)
    .map((value) => normalizeStatusToken(value))
    .filter((value) => value.length > 0);
  const itemStatusValues = collectStatusValues(item)
    .map((value) => normalizeStatusToken(value))
    .filter((value) => value.length > 0);

  if (containsStatusKeyword(itemStatusValues, NORMALIZED_SALE_EXCLUDED_KEYWORDS)) {
    return false;
  }

  if (containsStatusKeyword(itemStatusValues, NORMALIZED_SALE_RECOGNIZED_KEYWORDS)) {
    return true;
  }

  if (
    itemStatusValues.length === 0 &&
    containsStatusKeyword(orderStatusValues, NORMALIZED_SALE_EXCLUDED_KEYWORDS)
  ) {
    return false;
  }

  if (containsStatusKeyword(orderStatusValues, NORMALIZED_SALE_RECOGNIZED_KEYWORDS)) {
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

function resolveMaxOrderPages(): number {
  const raw = process.env.CAFE24_SALES_MAX_ORDER_PAGES?.trim();
  if (!raw) return MAX_ORDER_PAGES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return MAX_ORDER_PAGES;
  return Math.min(200, parsed);
}

function resolveManualMirrorPurgeWindowHours(): number {
  const raw = process.env.CAFE24_MANUAL_MIRROR_PURGE_WINDOW_HOURS?.trim();
  if (!raw) return DEFAULT_MANUAL_MIRROR_PURGE_WINDOW_HOURS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MANUAL_MIRROR_PURGE_WINDOW_HOURS;
  return Math.min(parsed, 24 * 14);
}

function resolveManualMirrorImportDateToken(): string {
  const raw = process.env.CAFE24_MANUAL_MIRROR_IMPORT_DATE?.trim();
  if (!raw) return DEFAULT_MANUAL_MIRROR_IMPORT_DATE;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : DEFAULT_MANUAL_MIRROR_IMPORT_DATE;
}

function resolveFailedOrderRetryLimit(): number {
  const raw = process.env.CAFE24_FAILED_ORDER_RETRY_LIMIT?.trim();
  if (!raw) return DEFAULT_FAILED_ORDER_RETRY_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_FAILED_ORDER_RETRY_LIMIT;
  return Math.min(parsed, 200);
}

function trimVoidReason(reason: string): string {
  if (!reason) return '취소/환불 상태';
  return reason.length > VOID_REASON_MAX_LENGTH
    ? `${reason.slice(0, VOID_REASON_MAX_LENGTH)}...`
    : reason;
}

function resolveNextCursorIso(previousIso: string | null, candidateMs: number): string {
  const previousMs = isoToMs(previousIso) || 0;
  const nextMs = Math.max(previousMs, candidateMs);
  return new Date(nextMs).toISOString();
}

function resolvePaidCursorAfterRun(input: {
  previousIso: string | null;
  windowToMs: number;
  ordersFetched: number;
  failedOrders: number;
  maxSuccessfulAnchorMs: number | null;
}): string | null {
  const { previousIso, windowToMs, ordersFetched, failedOrders, maxSuccessfulAnchorMs } = input;

  if (failedOrders > 0) {
    if (maxSuccessfulAnchorMs === null) {
      return previousIso;
    }
    return resolveNextCursorIso(previousIso, Math.min(maxSuccessfulAnchorMs, windowToMs));
  }

  if (ordersFetched === 0 && maxSuccessfulAnchorMs === null) {
    return resolveNextCursorIso(previousIso, windowToMs);
  }

  if (maxSuccessfulAnchorMs !== null) {
    return resolveNextCursorIso(previousIso, Math.min(maxSuccessfulAnchorMs, windowToMs));
  }

  return resolveNextCursorIso(previousIso, windowToMs);
}

function buildVoidReasonFromRemote(kind: 'cancellation' | 'refund', payload: JsonRecord): string {
  const reason =
    pickString(payload, [
      'reason',
      'reason_text',
      'reason_type',
      'status',
      'refund_status',
      'cancel_status',
    ]) || '취소/환불 상태';
  return trimVoidReason(`${kind}:${reason}`);
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
      'mall_id, cutoff_paid_at, last_synced_paid_at, last_synced_void_at, last_sync_started_at, last_sync_completed_at, last_error, created_at, updated_at'
    )
    .eq('mall_id', mallId)
    .single();

  if (error || !data) {
    throw new Error(`Cafe24 판매 동기화 상태 조회 실패: ${error?.message || 'not_found'}`);
  }

  return data as SyncStateRow;
}

async function beginSyncRun(
  mallId: string,
  previousStartedAt: string | null,
  runStartedAt: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  let query = supabase
    .from('cafe24_sales_sync_state')
    .update({
      last_sync_started_at: runStartedAt,
      last_error: null,
      updated_at: nowIso,
    })
    .eq('mall_id', mallId);

  query = previousStartedAt
    ? query.eq('last_sync_started_at', previousStartedAt)
    : query.is('last_sync_started_at', null);

  const { data, error } = await query.select('mall_id');
  if (error) {
    throw new Error(`Cafe24 판매 동기화 시작 잠금 실패: ${error.message}`);
  }

  return Array.isArray(data) && data.length === 1;
}

async function updateSyncStateForRun(
  mallId: string,
  runStartedAt: string,
  patch: Partial<Omit<SyncStateRow, 'mall_id' | 'created_at'>>
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('cafe24_sales_sync_state')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('mall_id', mallId)
    .eq('last_sync_started_at', runStartedAt)
    .select('mall_id');

  if (error) {
    throw new Error(`Cafe24 판매 동기화 상태 업데이트 실패: ${error.message}`);
  }

  return Array.isArray(data) && data.length === 1;
}

async function listQueuedFailedOrders(
  mallId: string,
  limit: number
): Promise<FailedOrderQueueRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('cafe24_sales_sync_failed_orders')
    .select('mall_id, order_id, retry_count')
    .eq('mall_id', mallId)
    .is('resolved_at', null)
    .order('last_failed_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`실패주문 큐 조회 실패: ${error.message}`);
  }

  return (data || []) as FailedOrderQueueRow[];
}

async function queueFailedOrders(
  mallId: string,
  rows: Array<{ orderId: string; message: string }>
): Promise<string[]> {
  if (rows.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const orderIds = uniqueStable(rows.map((row) => row.orderId).filter((id) => !!id));
  const { data: existing, error: existingError } = await supabase
    .from('cafe24_sales_sync_failed_orders')
    .select('order_id, retry_count')
    .eq('mall_id', mallId)
    .in('order_id', orderIds);

  if (existingError) {
    return [`실패주문 큐 기존건 조회 실패: ${existingError.message}`];
  }

  const retryMap = new Map<string, number>();
  for (const row of existing || []) {
    const retryCount = typeof row.retry_count === 'number' ? row.retry_count : 0;
    retryMap.set(row.order_id, retryCount);
  }

  const nowIso = new Date().toISOString();
  const payload = rows.map((row) => ({
    mall_id: mallId,
    order_id: row.orderId,
    retry_count: Math.max(1, (retryMap.get(row.orderId) || 0) + 1),
    last_error: row.message,
    last_failed_at: nowIso,
    resolved_at: null,
    updated_at: nowIso,
    metadata: {
      source: 'cafe24_sync_sales',
      order_id: row.orderId,
    },
  }));

  const errors: string[] = [];
  for (const batch of chunk(payload, FAILED_ORDER_UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase
      .from('cafe24_sales_sync_failed_orders')
      .upsert(batch, { onConflict: 'mall_id,order_id' });
    if (error) {
      errors.push(`실패주문 큐 적재 실패: ${error.message}`);
    }
  }

  return errors;
}

async function resolveQueuedFailedOrders(mallId: string, orderIds: string[]): Promise<string[]> {
  const uniqueOrderIds = uniqueStable(
    orderIds.filter((orderId) => typeof orderId === 'string' && orderId)
  );
  if (uniqueOrderIds.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('cafe24_sales_sync_failed_orders')
    .update({
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('mall_id', mallId)
    .in('order_id', uniqueOrderIds)
    .is('resolved_at', null);

  if (error) {
    return [`실패주문 큐 resolve 실패: ${error.message}`];
  }

  return [];
}

function buildOrderContext(order: JsonRecord): OrderContext | null {
  const orderId = pickString(order, ['order_id', 'order_no']);
  if (!orderId) return null;

  const paidAt =
    normalizeToIso(
      pickString(order, ['paid_date', 'pay_date', 'payment_date', 'first_payment_date'])
    ) || null;
  const orderedAt =
    normalizeToIso(
      pickString(order, ['order_date', 'ordered_date', 'register_date', 'created_date'])
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
    orderedAt,
    buyerName: pickString(order, ['buyer_name', 'order_name', 'member_name', 'receiver_name']),
    paid: paidFlag ?? !!paidAt,
    raw: order,
  };
}

function resolveOrderItemCode(orderId: string, item: JsonRecord): string {
  const explicit =
    pickString(item, [
      'order_item_code',
      'item_code',
      'order_product_code',
      'product_code',
      'order_item_no',
      'line_item_id',
    ]) || null;
  if (explicit) return explicit;

  const fallbackSeed: JsonRecord = {
    product_no: parseInteger(item.product_no) ?? parseInteger(item.item_no),
    variant_code: pickString(item, ['variant_code', 'option_code']),
    option_value: pickString(item, ['option_value', 'option_name']),
    product_name: pickString(item, ['product_name', 'item_name']),
    quantity: parseInteger(item.quantity ?? item.product_quantity ?? item.amount),
    payment_amount: parseMoney(item.payment_amount),
    order_item_price: parseMoney(item.order_item_price),
    total_price: parseMoney(item.total_price),
  };

  const digest = crypto.createHash('sha1').update(stableStringify(fallbackSeed)).digest('hex');
  return `${orderId}:${digest.slice(0, 16)}`;
}

function resolveOrderItemPrice(
  item: JsonRecord,
  order: JsonRecord,
  quantity: number,
  orderItemCount: number
): number {
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
  ];
  for (const total of totalCandidates) {
    if (total === null) continue;
    if (quantity <= 1) return total;
    return Math.max(0, Math.round(total / quantity));
  }

  if (orderItemCount === 1) {
    const orderLevelTotals = [
      parseMoney(order.payment_amount),
      parseMoney(order.order_price_amount),
      parseMoney(order.total_price),
    ];
    for (const total of orderLevelTotals) {
      if (total === null) continue;
      if (quantity <= 1) return total;
      return Math.max(0, Math.round(total / quantity));
    }
  }

  return 0;
}

function buildOrderItemContext(
  orderContext: OrderContext,
  item: JsonRecord,
  orderItemCount: number
): OrderItemContext | null {
  const productNo = parseInteger(item.product_no) ?? parseInteger(item.item_no);
  if (!productNo || productNo <= 0) return null;

  const quantity = parsePositiveInteger(item.quantity ?? item.product_quantity ?? item.amount, 1);
  const salePrice = resolveOrderItemPrice(item, orderContext.raw, quantity, orderItemCount);
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
    orderContext.orderedAt ||
    new Date().toISOString();
  const filterAnchorIso =
    normalizeToIso(pickString(item, ['paid_date', 'pay_date', 'payment_date', 'updated_date'])) ||
    orderContext.paidAt ||
    null;
  const soldAtMs = isoToMs(soldAt);
  if (!soldAtMs) return null;
  const filterAnchorMs = isoToMs(filterAnchorIso);

  const orderItemCode = resolveOrderItemCode(orderContext.orderId, item);
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
    filterAnchorMs,
    payload,
  };
}

async function fetchOrdersInRange(
  client: ReturnType<typeof createCafe24AdminApiClient>,
  windowFromIso: string,
  windowToIso: string
): Promise<{ orders: JsonRecord[]; dateType: string | null; maxPageLimitHit: boolean }> {
  const startDate = toKstDateString(windowFromIso);
  const endDate = toKstDateString(windowToIso);
  const pageLimit = DEFAULT_ORDER_PAGE_LIMIT;
  const maxPages = resolveMaxOrderPages();
  const allOrders: JsonRecord[] = [];
  let offset = 0;
  let selectedDateType: string | null = null;
  let maxPageLimitHit = false;

  for (let page = 0; page < maxPages; page += 1) {
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
    if (page === maxPages - 1) {
      maxPageLimitHit = true;
      break;
    }
    offset += pageLimit;
  }

  return {
    orders: allOrders,
    dateType: selectedDateType,
    maxPageLimitHit,
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

async function fetchVoidEventsFromEndpoint(
  client: ReturnType<typeof createCafe24AdminApiClient>,
  endpoint: '/refunds' | '/cancellation',
  windowFromIso: string,
  windowToIso: string
): Promise<{ rows: VoidCandidateRow[]; maxPageLimitHit: boolean }> {
  const startDate = toKstDateString(windowFromIso);
  const endDate = toKstDateString(windowToIso);
  const pageLimit = DEFAULT_ORDER_PAGE_LIMIT;
  const maxPages = resolveMaxOrderPages();

  const rows: VoidCandidateRow[] = [];
  let offset = 0;
  let maxPageLimitHit = false;

  for (let page = 0; page < maxPages; page += 1) {
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      limit: String(pageLimit),
      offset: String(offset),
    });
    const payload = await client.request(`${endpoint}?${query.toString()}`, {
      method: 'GET',
    });

    const records = extractArrayByKeyCandidates(
      payload,
      endpoint === '/refunds'
        ? ['refunds', 'refund_list', 'data']
        : ['cancellations', 'cancellation', 'cancel_list', 'data'],
      ['order_id', 'order_no', 'order_item_code', 'item_code']
    );

    if (records.length === 0) break;

    for (const record of records) {
      const orderId = pickString(record, ['order_id', 'order_no']);
      const orderItemCode =
        pickString(record, [
          'order_item_code',
          'item_code',
          'order_product_code',
          'product_code',
        ]) || null;
      const voidedAt =
        normalizeToIso(
          pickString(record, [
            'refund_date',
            'cancel_date',
            'updated_date',
            'modified_date',
            'created_date',
            'created_at',
          ])
        ) || windowToIso;

      if (!orderId && !orderItemCode) continue;

      rows.push({
        orderId,
        orderItemCode,
        reason: buildVoidReasonFromRemote(
          endpoint === '/refunds' ? 'refund' : 'cancellation',
          record
        ),
        payload: {
          endpoint,
          ...record,
        },
        voidedAt,
      });
    }

    if (records.length < pageLimit) break;
    if (page === maxPages - 1) {
      maxPageLimitHit = true;
      break;
    }

    offset += pageLimit;
  }

  return {
    rows,
    maxPageLimitHit,
  };
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
    .or('cafe24_product_no.not.is.null,shop_url.not.is.null');

  if (error) {
    throw new Error(`작품 매핑 조회 실패: ${error.message}`);
  }

  const mapping = new Map<number, string>();
  const duplicateProductNos = new Set<number>();
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
    const existingArtworkId = mapping.get(resolvedProductNo);
    if (!existingArtworkId) {
      mapping.set(resolvedProductNo, row.id);
    } else if (existingArtworkId !== row.id) {
      duplicateProductNos.add(resolvedProductNo);
    }

    if (!productNoFromColumn && productNoFromShopUrl) {
      backfillCandidates.push({ id: row.id, productNo: productNoFromShopUrl });
    }
  }

  const backfill = await backfillArtworkProductNos(backfillCandidates);
  for (const duplicateProductNo of duplicateProductNos) {
    mapping.delete(duplicateProductNo);
  }

  return {
    mapping,
    backfill,
    duplicateProductNos: Array.from(duplicateProductNos).sort((a, b) => a - b),
  };
}

async function filterExistingOrderItemCodes(rows: PreparedSaleRow[]): Promise<{
  filtered: PreparedSaleRow[];
  duplicateSkipped: number;
  restored: number;
  restoredArtworkIds: string[];
  errors: string[];
}> {
  const supabase = createSupabaseAdminClient();
  const codes = uniqueStable(rows.map((row) => row.external_order_item_code).filter(Boolean));
  if (codes.length === 0) {
    return { filtered: rows, duplicateSkipped: 0, restored: 0, restoredArtworkIds: [], errors: [] };
  }

  const existingByCode = new Map<
    string,
    {
      id: string;
      artwork_id: string;
      voided_at: string | null;
    }
  >();
  for (const codeChunk of chunk(codes, EXISTING_CODE_CHUNK_SIZE)) {
    let { data, error } = await supabase
      .from('artwork_sales')
      .select('id, artwork_id, external_order_item_code, voided_at')
      .eq('source', 'cafe24')
      .in('external_order_item_code', codeChunk);

    if (error && error.message.includes('voided_at')) {
      const fallback = await supabase
        .from('artwork_sales')
        .select('id, artwork_id, external_order_item_code')
        .eq('source', 'cafe24')
        .in('external_order_item_code', codeChunk);
      data = (fallback.data || []).map((row) => ({ ...row, voided_at: null }));
      error = fallback.error;
    }

    if (error) {
      throw new Error(`기존 동기화 코드 조회 실패: ${error.message}`);
    }

    for (const row of (data || []) as Array<{
      id: string;
      artwork_id: string;
      external_order_item_code: string | null;
      voided_at: string | null;
    }>) {
      if (typeof row.external_order_item_code === 'string' && row.external_order_item_code) {
        existingByCode.set(row.external_order_item_code, {
          id: row.id,
          artwork_id: row.artwork_id,
          voided_at: row.voided_at,
        });
      }
    }
  }

  let duplicateSkipped = 0;
  let restored = 0;
  const errors: string[] = [];
  const restoredArtworkIds = new Set<string>();
  const filtered: PreparedSaleRow[] = [];

  for (const row of rows) {
    const existing = existingByCode.get(row.external_order_item_code);
    if (!existing) {
      filtered.push(row);
      continue;
    }

    if (!existing.voided_at) {
      duplicateSkipped += 1;
      continue;
    }

    const { error } = await supabase
      .from('artwork_sales')
      .update({
        artwork_id: row.artwork_id,
        sale_price: row.sale_price,
        quantity: row.quantity,
        buyer_name: row.buyer_name,
        note: row.note,
        sold_at: row.sold_at,
        source_detail: row.source_detail,
        external_order_id: row.external_order_id,
        external_payload: row.external_payload,
        voided_at: null,
        void_reason: null,
      })
      .eq('id', existing.id);

    if (error) {
      errors.push(`void 해제 실패(${row.external_order_item_code}): ${error.message}`);
      continue;
    }

    restored += 1;
    restoredArtworkIds.add(row.artwork_id);
  }

  return {
    filtered,
    duplicateSkipped,
    restored,
    restoredArtworkIds: Array.from(restoredArtworkIds),
    errors,
  };
}

async function purgeHistoricalManualMirrors(
  rows: PreparedSaleRow[]
): Promise<ManualMirrorPurgeResult> {
  if (rows.length === 0) {
    return {
      purged: 0,
      errors: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const artworkIds = uniqueStable(rows.map((row) => row.artwork_id));
  const importDateToken = resolveManualMirrorImportDateToken();
  const windowMs = resolveManualMirrorPurgeWindowHours() * 60 * 60 * 1000;

  const { data, error } = await supabase
    .from('artwork_sales')
    .select(
      'id, artwork_id, sale_price, quantity, sold_at, created_at, buyer_name, note, source, external_order_id, external_order_item_code'
    )
    .in('artwork_id', artworkIds)
    .neq('source', 'cafe24')
    .is('external_order_item_code', null);

  if (error) {
    return {
      purged: 0,
      errors: [`수동 판매 중복후보 조회 실패: ${error.message}`],
    };
  }

  const candidates = (data || []).filter((row) => {
    if (typeof row.created_at !== 'string' || !row.created_at.startsWith(importDateToken)) {
      return false;
    }
    if (typeof row.buyer_name === 'string' && row.buyer_name.trim()) {
      return false;
    }
    const note = typeof row.note === 'string' ? row.note.trim() : '';
    if (note && !note.startsWith('2026 씨앗페 판매')) {
      return false;
    }
    return true;
  }) as Array<{
    id: string;
    artwork_id: string;
    sale_price: number | null;
    quantity: number | null;
    sold_at: string | null;
  }>;

  if (candidates.length === 0) {
    return {
      purged: 0,
      errors: [],
    };
  }

  const usedCandidateIds = new Set<string>();
  const purgeIds: string[] = [];
  for (const row of rows) {
    const soldAtMs = isoToMs(row.sold_at);
    if (soldAtMs === null) continue;
    const matches = candidates
      .filter((candidate) => {
        if (usedCandidateIds.has(candidate.id)) return false;
        if (candidate.artwork_id !== row.artwork_id) return false;
        if ((candidate.sale_price || 0) !== row.sale_price) return false;
        if ((candidate.quantity || 1) !== row.quantity) return false;
        const candidateSoldAtMs = isoToMs(candidate.sold_at);
        if (candidateSoldAtMs === null) return false;
        return Math.abs(candidateSoldAtMs - soldAtMs) <= windowMs;
      })
      .sort((a, b) => {
        const aDiff = Math.abs((isoToMs(a.sold_at) || 0) - soldAtMs);
        const bDiff = Math.abs((isoToMs(b.sold_at) || 0) - soldAtMs);
        return aDiff - bDiff;
      });

    const picked = matches[0];
    if (!picked) continue;
    usedCandidateIds.add(picked.id);
    purgeIds.push(picked.id);
  }

  if (purgeIds.length === 0) {
    return {
      purged: 0,
      errors: [],
    };
  }

  const { error: deleteError } = await supabase.from('artwork_sales').delete().in('id', purgeIds);
  if (deleteError) {
    return {
      purged: 0,
      errors: [`수동 판매 중복 정리 실패: ${deleteError.message}`],
    };
  }

  return {
    purged: purgeIds.length,
    errors: [],
  };
}

function buildVoidReason(order: OrderContext, item: JsonRecord): string {
  const itemStatus = collectStatusValues(item).slice(0, 3).join(',') || '-';
  const orderStatus = collectStatusValues(order.raw).slice(0, 3).join(',') || '-';
  return trimVoidReason(`취소/환불 상태(item=${itemStatus}, order=${orderStatus})`);
}

async function voidCanceledCafe24Sales(rows: VoidCandidateRow[]): Promise<VoidedSaleResult> {
  if (rows.length === 0) {
    return {
      voided: 0,
      affectedArtworkIds: [],
      errors: [],
    };
  }

  const supabase = createSupabaseAdminClient();
  const uniqueByCode = new Map<
    string,
    {
      orderId: string | null;
      reason: string;
      payload: JsonRecord;
      voidedAt: string;
    }
  >();
  const uniqueByOrderId = new Map<
    string,
    {
      reason: string;
      payload: JsonRecord;
      voidedAt: string;
    }
  >();

  for (const row of rows) {
    if (!row.orderId && !row.orderItemCode) continue;

    if (row.orderItemCode && !uniqueByCode.has(row.orderItemCode)) {
      uniqueByCode.set(row.orderItemCode, {
        orderId: row.orderId,
        reason: trimVoidReason(row.reason),
        payload: row.payload,
        voidedAt: row.voidedAt,
      });
    }

    if (row.orderId && !uniqueByOrderId.has(row.orderId)) {
      uniqueByOrderId.set(row.orderId, {
        reason: trimVoidReason(row.reason),
        payload: row.payload,
        voidedAt: row.voidedAt,
      });
    }
  }

  const codes = Array.from(uniqueByCode.keys());
  const orderIds = Array.from(uniqueByOrderId.keys());
  if (codes.length === 0 && orderIds.length === 0) {
    return {
      voided: 0,
      affectedArtworkIds: [],
      errors: [],
    };
  }

  const existing: Array<{
    id: string;
    artwork_id: string;
    external_order_id: string | null;
    external_order_item_code: string | null;
    voided_at: string | null;
  }> = [];

  if (codes.length > 0) {
    for (const codeChunk of chunk(codes, EXISTING_CODE_CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('artwork_sales')
        .select('id, artwork_id, external_order_id, external_order_item_code, voided_at')
        .eq('source', 'cafe24')
        .in('external_order_item_code', codeChunk);

      if (error) {
        return {
          voided: 0,
          affectedArtworkIds: [],
          errors: [`취소/환불 대상 조회 실패: ${error.message}`],
        };
      }

      existing.push(
        ...((data || []) as Array<{
          id: string;
          artwork_id: string;
          external_order_id: string | null;
          external_order_item_code: string | null;
          voided_at: string | null;
        }>)
      );
    }
  }

  if (orderIds.length > 0) {
    for (const orderIdChunk of chunk(orderIds, EXISTING_CODE_CHUNK_SIZE)) {
      const { data, error } = await supabase
        .from('artwork_sales')
        .select('id, artwork_id, external_order_id, external_order_item_code, voided_at')
        .eq('source', 'cafe24')
        .in('external_order_id', orderIdChunk);

      if (error) {
        return {
          voided: 0,
          affectedArtworkIds: [],
          errors: [`취소/환불 대상(order_id) 조회 실패: ${error.message}`],
        };
      }

      existing.push(
        ...((data || []) as Array<{
          id: string;
          artwork_id: string;
          external_order_id: string | null;
          external_order_item_code: string | null;
          voided_at: string | null;
        }>)
      );
    }
  }

  let voided = 0;
  const affectedArtworkIds = new Set<string>();
  const errors: string[] = [];

  const visitedSaleIds = new Set<string>();

  for (const saleRow of existing) {
    if (visitedSaleIds.has(saleRow.id)) continue;
    visitedSaleIds.add(saleRow.id);
    if (saleRow.voided_at) continue;

    const targetByCode = saleRow.external_order_item_code
      ? uniqueByCode.get(saleRow.external_order_item_code)
      : null;
    const targetByOrderId = saleRow.external_order_id
      ? uniqueByOrderId.get(saleRow.external_order_id)
      : null;
    const target = targetByCode || targetByOrderId;

    if (!target) continue;

    const { error } = await supabase
      .from('artwork_sales')
      .update({
        voided_at: target.voidedAt,
        void_reason: target.reason,
        external_payload: target.payload,
      })
      .eq('id', saleRow.id);

    if (error) {
      errors.push(
        `취소/환불 반영 실패(${saleRow.external_order_item_code || saleRow.external_order_id || saleRow.id}): ${error.message}`
      );
      continue;
    }

    voided += 1;
    affectedArtworkIds.add(saleRow.artwork_id);
  }

  return {
    voided,
    affectedArtworkIds: Array.from(affectedArtworkIds),
    errors,
  };
}

async function refreshArtworkStatusesFromSales(artworkIds: string[]): Promise<string[]> {
  const uniqueArtworkIds = uniqueStable(artworkIds.filter((id) => typeof id === 'string' && id));
  if (uniqueArtworkIds.length === 0) return [];

  const supabase = createSupabaseAdminClient();

  const { data: artworks, error: artworkError } = await supabase
    .from('artworks')
    .select('id, status, sold_at, edition_type, edition_limit')
    .in('id', uniqueArtworkIds);
  if (artworkError) {
    return [`작품 상태 재계산 대상 조회 실패: ${artworkError.message}`];
  }

  let { data: salesRows, error: salesError } = await supabase
    .from('artwork_sales')
    .select('artwork_id, quantity')
    .in('artwork_id', uniqueArtworkIds)
    .not('sold_at', 'is', null)
    .is('voided_at', null);
  if (salesError && salesError.message.includes('voided_at')) {
    ({ data: salesRows, error: salesError } = await supabase
      .from('artwork_sales')
      .select('artwork_id, quantity')
      .in('artwork_id', uniqueArtworkIds)
      .not('sold_at', 'is', null));
  }
  if (salesError) {
    return [`작품 상태 재계산 판매조회 실패: ${salesError.message}`];
  }

  const soldQuantityByArtwork = new Map<string, number>();
  for (const row of salesRows || []) {
    const artworkId = row.artwork_id;
    if (!artworkId) continue;
    const qty =
      typeof row.quantity === 'number' && Number.isFinite(row.quantity) ? row.quantity : 1;
    soldQuantityByArtwork.set(
      artworkId,
      (soldQuantityByArtwork.get(artworkId) || 0) + Math.max(1, qty)
    );
  }

  const errors: string[] = [];
  for (const artwork of (artworks || []) as Array<{
    id: string;
    status: string | null;
    sold_at: string | null;
    edition_type: string | null;
    edition_limit: number | null;
  }>) {
    const soldQuantity = soldQuantityByArtwork.get(artwork.id) || 0;
    const editionType = artwork.edition_type || 'unique';
    const isSold =
      editionType === 'unique'
        ? soldQuantity >= 1
        : editionType === 'limited' && !!artwork.edition_limit
          ? soldQuantity >= artwork.edition_limit
          : false;

    if (isSold && artwork.status !== 'sold') {
      const { error } = await supabase
        .from('artworks')
        .update({
          status: 'sold',
          sold_at: artwork.sold_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artwork.id);
      if (error) {
        errors.push(`작품 상태 sold 반영 실패(${artwork.id}): ${error.message}`);
      }
      continue;
    }

    if (!isSold && artwork.status === 'sold') {
      const { error } = await supabase
        .from('artworks')
        .update({
          status: 'available',
          sold_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', artwork.id);
      if (error) {
        errors.push(`작품 상태 available 복원 실패(${artwork.id}): ${error.message}`);
      }
    }
  }

  return errors;
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
      voided: 0,
      duplicateSkipped: 0,
      skippedNoProductNo: 0,
      skippedNoArtworkMapping: 0,
      skippedOutsideWindow: 0,
      failedOrders: 0,
      backfilledProductNos: 0,
      backfillProductNoFailures: 0,
      manualMirrorPurged: 0,
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
  const runStartedAt = nowIso;
  const lockAcquired = await beginSyncRun(mallId, state.last_sync_started_at, runStartedAt);

  if (!lockAcquired) {
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
      voided: 0,
      duplicateSkipped: 0,
      skippedNoProductNo: 0,
      skippedNoArtworkMapping: 0,
      skippedOutsideWindow: 0,
      failedOrders: 0,
      backfilledProductNos: 0,
      backfillProductNoFailures: 0,
      manualMirrorPurged: 0,
      soldOutLockedSynced: 0,
      soldOutLockFailed: 0,
      errors: [],
      reason: '이미 실행 중인 Cafe24 판매 동기화 작업이 있어 이번 실행을 건너뛰었습니다.',
    };
  }

  if (windowFromMs >= windowToMs) {
    const stateUpdated = await updateSyncStateForRun(mallId, runStartedAt, {
      last_synced_paid_at: resolveNextCursorIso(state.last_synced_paid_at, windowToMs),
      last_synced_void_at: resolveNextCursorIso(
        state.last_synced_void_at || state.last_synced_paid_at,
        windowToMs
      ),
      last_sync_completed_at: new Date().toISOString(),
      last_error: null,
    });
    const warnings = stateUpdated
      ? []
      : ['동기화 상태 저장 경쟁이 감지되어 커서 업데이트를 건너뛰었습니다.'];
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
      voided: 0,
      duplicateSkipped: 0,
      skippedNoProductNo: 0,
      skippedNoArtworkMapping: 0,
      skippedOutsideWindow: 0,
      failedOrders: 0,
      backfilledProductNos: 0,
      backfillProductNoFailures: 0,
      manualMirrorPurged: 0,
      soldOutLockedSynced: 0,
      soldOutLockFailed: 0,
      errors: warnings,
      reason: warnings.length > 0 ? '일부 경고가 있습니다.' : undefined,
    };
  }

  const blockingErrors: string[] = [];
  const warningErrors: string[] = [];
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
  let voided = 0;
  let dateTypeUsed: string | null = null;
  let backfilledProductNos = 0;
  let backfillProductNoFailures = 0;
  let manualMirrorPurged = 0;
  let soldOutLockedSynced = 0;
  let soldOutLockFailed = 0;
  let maxSuccessfulAnchorMs: number | null = null;
  let voidEndpointMaxAnchorMs: number | null = null;
  let voidEndpointFetchFailed = false;

  const trackSuccessfulAnchor = (anchorMs: number | null) => {
    if (anchorMs === null || !Number.isFinite(anchorMs)) return;
    const bounded = Math.min(anchorMs, windowToMs);
    maxSuccessfulAnchorMs =
      maxSuccessfulAnchorMs === null ? bounded : Math.max(maxSuccessfulAnchorMs, bounded);
  };

  const trackVoidEndpointAnchor = (anchorMs: number | null) => {
    if (anchorMs === null || !Number.isFinite(anchorMs)) return;
    const bounded = Math.min(anchorMs, windowToMs);
    voidEndpointMaxAnchorMs =
      voidEndpointMaxAnchorMs === null ? bounded : Math.max(voidEndpointMaxAnchorMs, bounded);
  };

  try {
    let queuedFailedOrders: FailedOrderQueueRow[] = [];
    try {
      queuedFailedOrders = await listQueuedFailedOrders(mallId, resolveFailedOrderRetryLimit());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warningErrors.push(message);
    }

    const client = createCafe24AdminApiClient();
    const [orderResult, artworkMapResult] = await Promise.all([
      fetchOrdersInRange(client, windowFromIso, windowToIso),
      loadArtworkMapByProductNo(),
    ]);

    const artworkByProductNo = artworkMapResult.mapping;
    backfilledProductNos = artworkMapResult.backfill.updated;
    backfillProductNoFailures = artworkMapResult.backfill.failed;
    if (artworkMapResult.duplicateProductNos.length > 0) {
      const sample = artworkMapResult.duplicateProductNos.slice(0, 10).join(', ');
      const suffix =
        artworkMapResult.duplicateProductNos.length > 10
          ? ` 외 ${artworkMapResult.duplicateProductNos.length - 10}건`
          : '';
      blockingErrors.push(`중복 product_no 매핑 감지: ${sample}${suffix}`);
    }

    ordersFetched = orderResult.orders.length;
    dateTypeUsed = orderResult.dateType;
    if (orderResult.maxPageLimitHit) {
      blockingErrors.push(
        `주문 조회 페이지 상한에 도달했습니다. CAFE24_SALES_MAX_ORDER_PAGES(현재=${resolveMaxOrderPages()})를 점검하세요.`
      );
    }

    const queuedOrderIdSet = new Set(queuedFailedOrders.map((row) => row.order_id));
    const ordersById = new Map<string, JsonRecord>();
    for (const orderRaw of orderResult.orders) {
      const order = buildOrderContext(orderRaw);
      if (!order) continue;
      if (!ordersById.has(order.orderId)) {
        ordersById.set(order.orderId, orderRaw);
      }
    }
    for (const queued of queuedFailedOrders) {
      if (!ordersById.has(queued.order_id)) {
        ordersById.set(queued.order_id, {
          order_id: queued.order_id,
          paid: 'true',
        });
      }
    }
    if (ordersById.size > orderResult.orders.length) {
      warningErrors.push(
        `실패주문 재시도 대상 ${ordersById.size - orderResult.orders.length}건을 추가 처리합니다.`
      );
    }

    let refundEvents: { rows: VoidCandidateRow[]; maxPageLimitHit: boolean } = {
      rows: [],
      maxPageLimitHit: false,
    };
    let cancellationEvents: { rows: VoidCandidateRow[]; maxPageLimitHit: boolean } = {
      rows: [],
      maxPageLimitHit: false,
    };

    try {
      refundEvents = await fetchVoidEventsFromEndpoint(
        client,
        '/refunds',
        windowFromIso,
        windowToIso
      );
    } catch (error) {
      voidEndpointFetchFailed = true;
      const message = error instanceof Error ? error.message : String(error);
      warningErrors.push(`환불 역동기화 조회 실패: ${message}`);
    }

    try {
      cancellationEvents = await fetchVoidEventsFromEndpoint(
        client,
        '/cancellation',
        windowFromIso,
        windowToIso
      );
    } catch (error) {
      if (!isCafe24NoApiFoundError(error)) {
        voidEndpointFetchFailed = true;
        const message = error instanceof Error ? error.message : String(error);
        warningErrors.push(`취소 역동기화 조회 실패: ${message}`);
      }
    }

    if (refundEvents.maxPageLimitHit || cancellationEvents.maxPageLimitHit) {
      warningErrors.push(
        `환불/취소 조회 페이지 상한에 도달했습니다. CAFE24_SALES_MAX_ORDER_PAGES(현재=${resolveMaxOrderPages()})를 점검하세요.`
      );
    }

    const endpointRows = [...refundEvents.rows, ...cancellationEvents.rows];
    for (const row of endpointRows) {
      trackVoidEndpointAnchor(isoToMs(row.voidedAt));
      if (!row.orderId) continue;
      if (ordersById.has(row.orderId)) continue;
      ordersById.set(row.orderId, {
        order_id: row.orderId,
        paid: 'true',
      });
    }

    if (endpointRows.length > 0) {
      warningErrors.push(`환불/취소 역동기화 대상 ${endpointRows.length}건을 감지했습니다.`);
    }

    const preparedRows: PreparedSaleRow[] = [];
    const localDedup = new Set<string>();
    const failedOrderQueueCandidates: Array<{ orderId: string; message: string }> = [];
    const resolvedQueuedOrderIds: string[] = [];
    const voidCandidates: VoidCandidateRow[] = [];

    for (const orderRaw of ordersById.values()) {
      const order = buildOrderContext(orderRaw);
      if (!order) {
        warningErrors.push('order_id가 없는 주문을 건너뛰었습니다.');
        continue;
      }

      try {
        const items = await fetchOrderItems(client, order.orderId);
        orderItemsFetched += items.length;
        trackSuccessfulAnchor(isoToMs(order.paidAt || order.orderedAt));
        let hasSoldItemInOrder = false;
        items.forEach((item) => {
          const isSoldItem = isItemConsideredSold(order, item);

          if (!isSoldItem) {
            const resolvedVoidedAt =
              normalizeToIso(
                pickString(item, ['updated_date', 'cancel_date', 'refund_date', 'order_date'])
              ) || new Date().toISOString();

            voidCandidates.push({
              orderId: order.orderId,
              orderItemCode: resolveOrderItemCode(order.orderId, item),
              reason: buildVoidReason(order, item),
              payload: {
                order_id: order.orderId,
                order_status: collectStatusValues(order.raw),
                item_status: collectStatusValues(item),
              },
              voidedAt: resolvedVoidedAt,
            });
            trackSuccessfulAnchor(isoToMs(resolvedVoidedAt));
            return;
          }
          hasSoldItemInOrder = true;

          const itemContext = buildOrderItemContext(order, item, items.length);
          if (!itemContext) {
            skippedNoProductNo += 1;
            return;
          }

          trackSuccessfulAnchor(itemContext.filterAnchorMs ?? itemContext.soldAtMs);

          if (itemContext.filterAnchorMs !== null) {
            if (
              itemContext.filterAnchorMs < windowFromMs ||
              itemContext.filterAnchorMs > windowToMs + 60_000
            ) {
              skippedOutsideWindow += 1;
              return;
            }
          } else if (itemContext.soldAtMs > windowToMs + 60_000) {
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
            source_detail: 'cafe24_api',
            external_order_id: order.orderId,
            external_order_item_code: itemContext.orderItemCode,
            external_payload: itemContext.payload,
          });
        });

        if (hasSoldItemInOrder) {
          ordersPaid += 1;
        }
        if (queuedOrderIdSet.has(order.orderId)) {
          resolvedQueuedOrderIds.push(order.orderId);
        }
      } catch (error) {
        failedOrders += 1;
        const message = error instanceof Error ? error.message : String(error);
        warningErrors.push(`주문 ${order.orderId} 아이템 조회 실패(재시도 큐 적재): ${message}`);
        failedOrderQueueCandidates.push({ orderId: order.orderId, message });
      }
    }

    if (failedOrderQueueCandidates.length > 0) {
      const queueErrors = await queueFailedOrders(mallId, failedOrderQueueCandidates);
      if (queueErrors.length > 0) {
        blockingErrors.push(...queueErrors);
      }
    }
    if (resolvedQueuedOrderIds.length > 0) {
      const resolveErrors = await resolveQueuedFailedOrders(mallId, resolvedQueuedOrderIds);
      if (resolveErrors.length > 0) {
        warningErrors.push(...resolveErrors);
      }
    }

    const dedupedByDb = await filterExistingOrderItemCodes(preparedRows);
    duplicateSkipped += dedupedByDb.duplicateSkipped;
    if (dedupedByDb.errors.length > 0) {
      warningErrors.push(...dedupedByDb.errors);
    }

    const insertResult = await insertPreparedSales(dedupedByDb.filtered);
    inserted = insertResult.inserted;
    duplicateSkipped += insertResult.duplicateSkipped;
    if (insertResult.failed > 0) {
      blockingErrors.push(...insertResult.errors);
    }

    const voidResult = await voidCanceledCafe24Sales(voidCandidates);
    voided = voidResult.voided;
    if (voidResult.errors.length > 0) {
      warningErrors.push(...voidResult.errors);
    }

    if (insertResult.failed === 0 && dedupedByDb.filtered.length > 0) {
      const purgeResult = await purgeHistoricalManualMirrors(dedupedByDb.filtered);
      manualMirrorPurged = purgeResult.purged;
      if (purgeResult.purged > 0) {
        warningErrors.push(`Cafe24 중복 수동판매 정리: ${purgeResult.purged}건`);
      }
      if (purgeResult.errors.length > 0) {
        warningErrors.push(...purgeResult.errors);
      }
    }

    const affectedArtworkIds = uniqueStable([
      ...dedupedByDb.filtered.map((row) => row.artwork_id),
      ...dedupedByDb.restoredArtworkIds,
      ...voidResult.affectedArtworkIds,
    ]);
    const refreshStatusErrors = await refreshArtworkStatusesFromSales(affectedArtworkIds);
    if (refreshStatusErrors.length > 0) {
      warningErrors.push(...refreshStatusErrors);
    }
    const lockResult = await lockSoldOutArtworksOnCafe24(affectedArtworkIds);
    soldOutLockedSynced = lockResult.synced;
    soldOutLockFailed = lockResult.failed;
    if (lockResult.failed > 0) {
      warningErrors.push(...lockResult.errors);
    }
    if (backfillProductNoFailures > 0) {
      warningErrors.push(`product_no 백필 실패: ${backfillProductNoFailures}건`);
    }

    const syncSucceeded = blockingErrors.length === 0;
    const nextPaidCursorIso = syncSucceeded
      ? resolvePaidCursorAfterRun({
          previousIso: state.last_synced_paid_at,
          windowToMs,
          ordersFetched,
          failedOrders,
          maxSuccessfulAnchorMs,
        })
      : state.last_synced_paid_at;
    const nextVoidCursorIso = syncSucceeded
      ? voidEndpointFetchFailed
        ? state.last_synced_void_at
        : resolveNextCursorIso(
            state.last_synced_void_at || state.last_synced_paid_at,
            voidEndpointMaxAnchorMs ?? windowToMs
          )
      : state.last_synced_void_at;

    const stateUpdated = await updateSyncStateForRun(mallId, runStartedAt, {
      last_synced_paid_at: nextPaidCursorIso,
      last_synced_void_at: nextVoidCursorIso,
      last_sync_completed_at: new Date().toISOString(),
      last_error: syncSucceeded ? null : blockingErrors.join(' | ').slice(0, 2000),
    });
    if (!stateUpdated) {
      warningErrors.push('동기화 상태 저장 경쟁이 감지되어 커서 업데이트를 건너뛰었습니다.');
    }

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
      voided,
      duplicateSkipped,
      skippedNoProductNo,
      skippedNoArtworkMapping,
      skippedOutsideWindow,
      failedOrders,
      backfilledProductNos,
      backfillProductNoFailures,
      manualMirrorPurged,
      soldOutLockedSynced,
      soldOutLockFailed,
      errors: [...blockingErrors, ...warningErrors],
      reason: syncSucceeded
        ? warningErrors.length > 0
          ? '일부 경고가 있습니다.'
          : undefined
        : '일부 주문 동기화에 실패했습니다.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallbackErrors: string[] = [];
    try {
      const updated = await updateSyncStateForRun(mallId, runStartedAt, {
        last_sync_completed_at: new Date().toISOString(),
        last_error: message.slice(0, 2000),
      });
      if (!updated) {
        fallbackErrors.push('동기화 상태 저장 경쟁이 감지되어 실패 상태 반영을 건너뛰었습니다.');
      }
    } catch (stateUpdateError) {
      const stateUpdateMessage =
        stateUpdateError instanceof Error ? stateUpdateError.message : String(stateUpdateError);
      fallbackErrors.push(`실패 상태 기록 저장 실패: ${stateUpdateMessage}`);
    }

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
      voided,
      duplicateSkipped,
      skippedNoProductNo,
      skippedNoArtworkMapping,
      skippedOutsideWindow,
      failedOrders,
      backfilledProductNos,
      backfillProductNoFailures,
      manualMirrorPurged,
      soldOutLockedSynced,
      soldOutLockFailed,
      errors: [...blockingErrors, ...warningErrors, message, ...fallbackErrors],
      reason: message,
    };
  }
}
