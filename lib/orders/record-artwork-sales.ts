import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type ArtworkSaleLine = { artwork_id: string; quantity: number; unit_price: number };

export type RecordSalesParams = {
  orderId: string;
  orderNo: string | null;
  lineItems: ArtworkSaleLine[];
  source: 'toss';
  sourceDetail: string; // 'toss_widget' | 'toss_api'
  buyerName: string | null;
  buyerPhone: string | null;
  soldAt: string; // ISO
};

export type RecordSalesResult =
  | { inserted: true; rows: number }
  | { inserted: false; reason: 'already_recorded' | 'no_line_items' }
  | { inserted: false; reason: 'error'; error: string };

/**
 * order_items 라인별로 artwork_sales를 멱등 INSERT.
 *
 * 멱등성: 동일 order_id에 active(voided_at IS NULL) 매출이 이미 있으면 skip.
 * 결제 confirm·webhook이 동일 주문에 대해 중복 호출돼도 매출이 두 번 기록되지 않도록 보장.
 *
 * sale_price는 라인 합계(`unit_price * quantity`, 배송비 제외)로 기록.
 */
export async function recordOrderArtworkSales(
  supabase: SupabaseClient<Database>,
  params: RecordSalesParams
): Promise<RecordSalesResult> {
  const { orderId, orderNo, lineItems, source, sourceDetail, buyerName, buyerPhone, soldAt } =
    params;

  if (lineItems.length === 0) {
    return { inserted: false, reason: 'no_line_items' };
  }

  // 멱등 체크: 이미 active 매출이 있으면 skip
  const { data: existing, error: existingError } = await supabase
    .from('artwork_sales')
    .select('id')
    .eq('order_id', orderId)
    .is('voided_at', null)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { inserted: false, reason: 'error', error: existingError.message };
  }
  if (existing) {
    return { inserted: false, reason: 'already_recorded' };
  }

  const rows = lineItems.map((item) => ({
    artwork_id: item.artwork_id,
    sale_price: item.unit_price * item.quantity,
    quantity: item.quantity,
    source,
    source_detail: sourceDetail,
    order_id: orderId,
    external_order_id: orderNo,
    buyer_name: buyerName,
    buyer_phone: buyerPhone,
    sold_at: soldAt,
  }));

  const { error: insertError } = await supabase.from('artwork_sales').insert(rows);

  if (insertError) {
    return { inserted: false, reason: 'error', error: insertError.message };
  }

  return { inserted: true, rows: lineItems.length };
}
