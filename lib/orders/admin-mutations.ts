import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type AdminOrderMutationClient = SupabaseClient<Database>;

export type AdminOrderMutationRow = {
  id: string;
  order_no: string;
  status: string;
  buyer_name?: string | null;
  total_amount?: number | null;
};

export type UpdateTrackingInfoMutationInput = {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  now: string;
};

export type UpdateTrackingInfoMutationResult = {
  order: AdminOrderMutationRow;
};

export type SetDepositAutoCancelPausedMutationInput = {
  orderId: string;
  paused: boolean;
  now: string;
};

export type SetDepositAutoCancelPausedMutationResult = {
  order: AdminOrderMutationRow;
};

export type SetOrderEscalationMutationInput = {
  orderId: string;
  note: string | null;
  expectedEscalatedAt: string | null;
  now: string;
};

export type SetOrderEscalationMutationResult = {
  orderNo: string;
  escalatedAt: string | null;
};

export async function updateTrackingInfoMutation(
  supabase: AdminOrderMutationClient,
  { orderId, carrier, trackingNumber, now }: UpdateTrackingInfoMutationInput
): Promise<UpdateTrackingInfoMutationResult> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_no, status')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (!['shipped', 'delivered'].includes(order.status)) {
    throw new Error('배송 중 또는 배송 완료 상태인 주문만 운송장 정보를 수정할 수 있습니다.');
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      shipping_carrier: carrier || null,
      tracking_number: trackingNumber || null,
      updated_at: now,
    })
    .eq('id', orderId)
    .in('status', ['shipped', 'delivered']);

  if (updateError) throw updateError;

  return { order: order as AdminOrderMutationRow };
}

export async function setDepositAutoCancelPausedMutation(
  supabase: AdminOrderMutationClient,
  { orderId, paused, now }: SetDepositAutoCancelPausedMutationInput
): Promise<SetDepositAutoCancelPausedMutationResult> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_no, status, buyer_name, total_amount')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (order.status !== 'awaiting_deposit') {
    throw new Error(
      `자동취소 보류는 입금 대기 상태에서만 가능합니다. (현재 상태: ${order.status})`
    );
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update({ deposit_auto_cancel_paused: paused, updated_at: now })
    .eq('id', orderId)
    .eq('status', 'awaiting_deposit')
    .select('id');

  if (updateError) throw updateError;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  }

  return { order: order as AdminOrderMutationRow };
}

export async function setOrderEscalationMutation(
  supabase: AdminOrderMutationClient,
  { orderId, note, expectedEscalatedAt, now }: SetOrderEscalationMutationInput
): Promise<SetOrderEscalationMutationResult> {
  const escalatedAt = note ? now : null;

  let query = supabase.from('orders').update({ escalated_at: escalatedAt }).eq('id', orderId);

  if (expectedEscalatedAt === null) {
    query = query.is('escalated_at', null);
  } else {
    query = query.eq('escalated_at', expectedEscalatedAt);
  }

  const { data, error } = await query.select('order_no').maybeSingle();

  if (error) throw error;
  if (!data)
    throw new Error('주문 상태가 변경되었습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');

  if (note) {
    const { error: noteError } = await supabase
      .from('order_admin_notes')
      .upsert({ order_id: orderId, note, updated_at: now });
    if (noteError) throw noteError;
  } else {
    const { error: deleteError } = await supabase
      .from('order_admin_notes')
      .delete()
      .eq('order_id', orderId);
    if (deleteError) throw deleteError;
  }

  return {
    orderNo: data.order_no,
    escalatedAt,
  };
}
