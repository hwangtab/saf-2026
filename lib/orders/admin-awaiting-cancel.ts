import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cancelAwaitingDepositOrder,
  type CancelAwaitingDepositWarning,
} from '@/lib/commerce/refund-cancel/cancel-awaiting-order';
import type { Database } from '@/types/supabase';

export type AdminAwaitingCancelMutationClient = SupabaseClient<Database>;

export type AdminAwaitingCancelOrderRow = {
  id: string;
  order_no: string;
  status: string;
  artwork_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  total_amount: number;
  metadata: unknown;
  order_items?: Array<{
    artwork_id: string;
    quantity: number;
    unit_price: number;
  }> | null;
};

export type CancelAwaitingOrderMutationInput = {
  orderId: string;
  now: string;
};

export type CancelAwaitingOrderMutationResult = {
  order: AdminAwaitingCancelOrderRow;
  warnings: CancelAwaitingDepositWarning[];
};

export async function cancelAwaitingOrderMutation(
  supabase: AdminAwaitingCancelMutationClient,
  { orderId, now }: CancelAwaitingOrderMutationInput
): Promise<CancelAwaitingOrderMutationResult> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, artwork_id, buyer_name, buyer_phone, buyer_email, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');

  const orderRow = order as AdminAwaitingCancelOrderRow;
  if (orderRow.status !== 'awaiting_deposit') {
    throw new Error(`입금 대기 상태에서만 취소할 수 있습니다. (현재 상태: ${orderRow.status})`);
  }

  const cancelOutcome = await cancelAwaitingDepositOrder({
    supabase,
    order: orderRow,
    now,
  });

  if (!cancelOutcome.ok) {
    if (cancelOutcome.code === 'ORDER_UPDATE_FAILED') {
      throw new Error(cancelOutcome.error);
    }
    throw new Error('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  }

  return {
    order: orderRow,
    warnings: cancelOutcome.warnings,
  };
}
