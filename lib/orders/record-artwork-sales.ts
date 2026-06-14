import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type ArtworkSaleLine = { artwork_id: string; quantity: number; unit_price: number };

/**
 * 주문 조회 결과의 order_items 임베드를 ArtworkSaleLine[]로 추출.
 * Supabase 1:N 임베드는 배열이지만, 비배열/null로 추론되는 엣지에서 빈 배열로 방어.
 */
export function extractLineItems(order: { order_items?: unknown }): ArtworkSaleLine[] {
  return Array.isArray(order.order_items) ? (order.order_items as ArtworkSaleLine[]) : [];
}

export type RecordSalesParams = {
  orderId: string;
  orderNo: string | null;
  lineItems: ArtworkSaleLine[];
  source: 'toss' | 'manual';
  sourceDetail: string; // 'toss_widget' | 'toss_api' | 'bank_transfer'
  buyerName: string | null;
  buyerPhone: string | null;
  soldAt: string; // ISO
};

export type RecordSalesResult =
  | { inserted: true; rows: number }
  | { inserted: false; reason: 'already_recorded' | 'no_line_items' | 'artwork_taken' }
  | { inserted: false; reason: 'error'; error: string };

/**
 * order_items 라인별로 artwork_sales를 멱등 INSERT.
 *
 * 멱등성: 동일 order_id에 active(voided_at IS NULL) 매출이 이미 있으면 skip.
 * 결제 confirm·webhook이 동일 주문에 대해 중복 호출돼도 매출이 두 번 기록되지 않도록 보장.
 *
 * sale_price는 **단가(per-unit)** 로 기록한다(배송비 제외). 코드베이스 전 매출 소비처가
 * `sale_price * quantity`로 매출을 계산하는 관례를 따른다(admin 수동입력과 일치). 라인 합계를
 * 저장하면 소비처에서 다시 ×quantity 되어 수량>1 매출이 이중계산되므로 단가로 저장해야 한다.
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
    sale_price: item.unit_price,
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
    // 더블셀 차단: enforce_unique_edition_single_active_sale 트리거가, 다른 주문이 이 unique
    // 작품의 active 매출을 먼저 기록했을 때 INSERT를 막고 'UNIQUE_EDITION_TAKEN' 센티넬을 던진다.
    // 동일주문 멱등 충돌(23505)과 의미가 다르다 — 이쪽은 작품을 줄 수 없으므로 결제 후라면
    // 호출지가 환불해야 한다. (Postgres RAISE EXCEPTION이라 code는 P0001, 23505 아님 → 메시지로 식별.)
    if (insertError.message.includes('UNIQUE_EDITION_TAKEN')) {
      return { inserted: false, reason: 'artwork_taken' };
    }
    // 동시기록 레이스: confirm·webhook·reconcile이 같은 주문을 동시에 기록하려 할 때,
    // 멱등 SELECT를 둘 다 통과한 뒤 한쪽 INSERT가 (order_id, artwork_id) 유니크 위반(23505)으로
    // 실패할 수 있다. 데이터는 이긴 쪽이 이미 기록했으므로 이는 실패가 아니라 already_recorded다.
    // (호출지에서 'error'로 처리하면 허위 에러 이메일/크론 알림이 발생.)
    if (insertError.code === '23505') {
      return { inserted: false, reason: 'already_recorded' };
    }
    return { inserted: false, reason: 'error', error: insertError.message };
  }

  return { inserted: true, rows: lineItems.length };
}
