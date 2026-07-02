import type { SupabaseClient } from '@supabase/supabase-js';

import type { OrderStatus } from '@/lib/integrations/toss/types';
import {
  formatRepresentativeTitle,
  getRepresentativeArtwork,
} from '@/lib/orders/representative-artwork';
import type { Database } from '@/types/supabase';

export type AdminOrderReadClient = SupabaseClient<Database>;

export type AdminOrderListItem = {
  id: string;
  order_no: string;
  status: OrderStatus;
  total_amount: number;
  buyer_name: string | null;
  buyer_phone: string | null;
  created_at: string;
  paid_at: string | null;
  artwork_id: string | null;
  artwork_title: string | null;
  artwork_image: string | null;
  artist_name: string | null;
  payment_method: string | null;
  escalated_at: string | null;
  sla_overdue: boolean;
};

export type OrderLineItem = {
  artwork_id: string | null;
  artwork_title: string | null;
  artist_name: string | null;
  quantity: number;
  unit_price: number | null;
};

export type OrderDetail = AdminOrderListItem & {
  line_items: OrderLineItem[];
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_address_detail: string | null;
  shipping_memo: string | null;
  item_amount: number;
  shipping_amount: number;
  cancelled_at: string | null;
  refunded_at: string | null;
  payment_key: string | null;
  payment_status: string | null;
  payment_method_detail: string | null;
  payment_provider: string | null;
  payment_easypay_provider: string | null;
  deposit_auto_cancel_paused: boolean;
  approved_at: string | null;
  virtual_account_number: string | null;
  virtual_account_bank: string | null;
  virtual_account_due_date: string | null;
  sale_id: string | null;
  sale_voided: boolean;
  shipping_carrier: string | null;
  tracking_number: string | null;
};

export type OrderFilters = {
  status?: string;
  q?: string;
};

export type AdminReadModelOptions = {
  now?: Date;
};

const SLA_HOURS = 72;

function getSlaThreshold(now = new Date()) {
  return new Date(now.getTime() - SLA_HOURS * 3600 * 1000);
}

function sanitizeOrderSearchQuery(q: string) {
  return q
    .trim()
    .slice(0, 100)
    .replace(/[,()"\\%_*]/g, '');
}

function getSingleArtwork(artworks: unknown) {
  return Array.isArray(artworks) ? artworks[0] : artworks;
}

function getArtistName(artists: unknown) {
  const artistRow = Array.isArray(artists) ? artists[0] : artists;
  return artistRow && typeof artistRow === 'object'
    ? ((artistRow as { name_ko?: string | null }).name_ko ?? null)
    : null;
}

function getImages(artwork: unknown) {
  return artwork &&
    typeof artwork === 'object' &&
    Array.isArray((artwork as { images?: unknown }).images)
    ? (artwork as { images: string[] }).images
    : [];
}

function isSlaOverdue(status: string, paidAt: string | null | undefined, slaThreshold: Date) {
  return (
    paidAt != null &&
    (status === 'paid' || status === 'preparing') &&
    new Date(paidAt) < slaThreshold
  );
}

function getPaymentProvider(metadata: unknown) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? ((metadata as { payment_provider?: string | null }).payment_provider ?? null)
    : null;
}

// 주문 목록 조회 상한. 초과 시 조용히 잘리지 않도록 UI가 이 상수로 절단 여부를 감지해 경고한다.
export const ADMIN_ORDERS_LIST_LIMIT = 2000;

export async function getAdminOrdersReadModel(
  supabase: AdminOrderReadClient,
  filters: OrderFilters = {},
  options: AdminReadModelOptions = {}
): Promise<AdminOrderListItem[]> {
  const slaThreshold = getSlaThreshold(options.now);

  let query = supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, buyer_name, buyer_phone, created_at, paid_at, escalated_at, artwork_id, artworks(title, images, artists(name_ko)), order_items(artworks(title, images, artists(name_ko)))'
    )
    .order('created_at', { ascending: false })
    .limit(ADMIN_ORDERS_LIST_LIMIT);

  const virtualStatusValues = new Set(['sla_overdue', 'escalated']);
  if (filters.status && !virtualStatusValues.has(filters.status)) {
    query = query.eq('status', filters.status);
  }

  if (filters.q) {
    const q = sanitizeOrderSearchQuery(filters.q);
    if (q) {
      query = query.or(
        `order_no.ilike.%${q}%,buyer_name.ilike.%${q}%,buyer_phone.ilike.%${q}%,buyer_email.ilike.%${q}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (
    (data as Array<{
      id: string;
      order_no: string;
      status: string;
      total_amount: number;
      buyer_name: string | null;
      buyer_phone: string | null;
      created_at: string;
      paid_at: string | null;
      escalated_at?: string | null;
      artwork_id: string | null;
      artworks?: unknown;
      order_items?: unknown;
    }> | null) ?? []
  ).map((row) => {
    const rep = getRepresentativeArtwork(row.order_items);
    const artwork = getSingleArtwork(row.artworks) as
      | { title?: string | null; images?: string[]; artists?: unknown }
      | null
      | undefined;
    const images = getImages(artwork);
    const singleArtistName = getArtistName(artwork?.artists);

    const artworkTitle =
      rep.count > 0 && rep.title
        ? formatRepresentativeTitle(rep.title, rep.count, 'ko')
        : (artwork?.title ?? null);
    const artworkImage = rep.count > 0 ? rep.image : (images[0] ?? null);
    const artistName = rep.count > 0 ? rep.artistName : singleArtistName;
    const status = row.status as OrderStatus;

    return {
      id: row.id,
      order_no: row.order_no,
      status,
      total_amount: row.total_amount,
      buyer_name: row.buyer_name,
      buyer_phone: row.buyer_phone,
      created_at: row.created_at,
      paid_at: row.paid_at,
      artwork_id: row.artwork_id,
      artwork_title: artworkTitle,
      artwork_image: artworkImage,
      artist_name: artistName,
      payment_method: null,
      escalated_at: row.escalated_at ?? null,
      sla_overdue: isSlaOverdue(status, row.paid_at, slaThreshold),
    };
  });
}

export async function getAdminOrderDetailReadModel(
  supabase: AdminOrderReadClient,
  orderId: string,
  options: AdminReadModelOptions = {}
): Promise<OrderDetail | null> {
  const slaThreshold = getSlaThreshold(options.now);

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, item_amount, shipping_amount, buyer_name, buyer_phone, shipping_name, shipping_phone, shipping_address, shipping_address_detail, shipping_memo, shipping_carrier, tracking_number, created_at, paid_at, cancelled_at, refunded_at, escalated_at, artwork_id, metadata, deposit_auto_cancel_paused, artworks(title, images, artists(name_ko)), order_items(quantity, unit_price, artwork_id, artworks(title, images, artists(name_ko)))'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return null;

  const [{ data: payment }, { data: sale }] = await Promise.all([
    supabase
      .from('payments')
      .select('payment_key, status, method, approved_at, confirm_response')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('artwork_sales')
      .select('id, voided_at')
      .eq('order_id', orderId)
      .limit(1)
      .maybeSingle(),
  ]);

  const orderRow = order as {
    id: string;
    order_no: string;
    status: string;
    total_amount: number;
    item_amount?: number | null;
    shipping_amount?: number | null;
    buyer_name?: string | null;
    buyer_phone?: string | null;
    shipping_name?: string | null;
    shipping_phone?: string | null;
    shipping_address?: string | null;
    shipping_address_detail?: string | null;
    shipping_memo?: string | null;
    shipping_carrier?: string | null;
    tracking_number?: string | null;
    created_at: string;
    paid_at?: string | null;
    cancelled_at?: string | null;
    refunded_at?: string | null;
    escalated_at?: string | null;
    artwork_id?: string | null;
    metadata?: unknown;
    deposit_auto_cancel_paused?: boolean | null;
    artworks?: unknown;
    order_items?: unknown;
  };
  const paymentRow = payment as {
    payment_key?: string | null;
    status?: string | null;
    method?: string | null;
    approved_at?: string | null;
    confirm_response?: unknown;
  } | null;
  const saleRow = sale as { id?: string | null; voided_at?: string | null } | null;

  const artwork = getSingleArtwork(orderRow.artworks) as
    | { title?: string | null; images?: string[]; artists?: unknown }
    | null
    | undefined;
  const images = getImages(artwork);
  const singleArtistName = getArtistName(artwork?.artists);

  const orderItems = Array.isArray(orderRow.order_items)
    ? orderRow.order_items
    : orderRow.order_items != null
      ? [orderRow.order_items]
      : [];
  const lineItems: OrderLineItem[] = orderItems.map((item) => {
    const orderItem = item as {
      artwork_id?: string | null;
      quantity?: number | null;
      unit_price?: number | null;
      artworks?: unknown;
    };
    const itemArtwork = getSingleArtwork(orderItem.artworks) as
      | { title?: string | null; artists?: unknown }
      | null
      | undefined;
    const itemArtistName = getArtistName(itemArtwork?.artists);
    return {
      artwork_id: orderItem.artwork_id ?? null,
      artwork_title: itemArtwork?.title ?? null,
      artist_name: itemArtistName,
      quantity: typeof orderItem.quantity === 'number' ? orderItem.quantity : 1,
      unit_price: typeof orderItem.unit_price === 'number' ? orderItem.unit_price : null,
    };
  });

  const rep = getRepresentativeArtwork(orderRow.order_items);
  const repArtworkTitle =
    rep.count > 0 && rep.title
      ? formatRepresentativeTitle(rep.title, rep.count, 'ko')
      : (artwork?.title ?? null);
  const repArtworkImage = rep.count > 0 ? rep.image : (images[0] ?? null);
  const repArtistName = rep.count > 0 ? rep.artistName : singleArtistName;

  const confirmResponse = (paymentRow?.confirm_response as Record<string, unknown> | null) ?? null;
  const virtualAccount =
    (confirmResponse?.virtualAccount as Record<string, unknown> | null) ?? null;
  const easyPay = (confirmResponse?.easyPay as Record<string, unknown> | null) ?? null;
  const easyPayProvider =
    typeof easyPay?.provider === 'string' && easyPay.provider.length > 0 ? easyPay.provider : null;

  return {
    id: orderRow.id,
    order_no: orderRow.order_no,
    status: orderRow.status as OrderStatus,
    total_amount: orderRow.total_amount,
    item_amount: orderRow.item_amount ?? orderRow.total_amount,
    shipping_amount: orderRow.shipping_amount ?? 0,
    buyer_name: orderRow.buyer_name ?? null,
    buyer_phone: orderRow.buyer_phone ?? null,
    shipping_name: orderRow.shipping_name ?? null,
    shipping_phone: orderRow.shipping_phone ?? null,
    shipping_address: orderRow.shipping_address ?? null,
    shipping_address_detail: orderRow.shipping_address_detail ?? null,
    shipping_memo: orderRow.shipping_memo ?? null,
    created_at: orderRow.created_at,
    paid_at: orderRow.paid_at ?? null,
    cancelled_at: orderRow.cancelled_at ?? null,
    refunded_at: orderRow.refunded_at ?? null,
    artwork_id: orderRow.artwork_id ?? null,
    artwork_title: repArtworkTitle,
    artwork_image: repArtworkImage,
    artist_name: repArtistName,
    line_items: lineItems,
    payment_key: paymentRow?.payment_key ?? null,
    payment_status: paymentRow?.status ?? null,
    payment_method: paymentRow?.method ?? null,
    payment_method_detail: paymentRow?.method ?? null,
    payment_provider: getPaymentProvider(orderRow.metadata),
    payment_easypay_provider: easyPayProvider,
    deposit_auto_cancel_paused: orderRow.deposit_auto_cancel_paused ?? false,
    approved_at: paymentRow?.approved_at ?? null,
    virtual_account_number:
      typeof virtualAccount?.accountNumber === 'string' ? virtualAccount.accountNumber : null,
    virtual_account_bank:
      typeof virtualAccount?.bankName === 'string' ? virtualAccount.bankName : null,
    virtual_account_due_date:
      typeof virtualAccount?.dueDate === 'string' ? virtualAccount.dueDate : null,
    sale_id: saleRow?.id ?? null,
    sale_voided: !!saleRow?.voided_at,
    shipping_carrier: orderRow.shipping_carrier ?? null,
    tracking_number: orderRow.tracking_number ?? null,
    escalated_at: orderRow.escalated_at ?? null,
    sla_overdue: isSlaOverdue(orderRow.status, orderRow.paid_at, slaThreshold),
  };
}
