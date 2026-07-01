import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveAndSyncArtworkStatus } from '@/lib/artworks/status';
import type { OrderStatus } from '@/lib/integrations/toss/types';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import {
  releaseReservedArtworksIfUnowned,
  type ReleaseReservedArtworksResult,
} from '@/lib/orders/reservations';
import type { Database } from '@/types/supabase';

export type OrderStatusTransitionClient = SupabaseClient<Database>;

export type OrderStatusTransitionOrder = {
  id: string;
  order_no: string;
  status: string;
  buyer_email?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  artwork_id?: string | null;
  metadata?: unknown;
  order_items?: unknown;
};

export type OrderStatusTransitionWarning =
  | { code: 'ARTWORK_SALES_VOID_FAILED'; error: unknown }
  | { code: 'RESERVATION_RELEASE_FAILED'; errors: ReleaseReservedArtworksResult['errors'] };

export type UpdateOrderStatusMutationInput = {
  orderId: string;
  newStatus: OrderStatus;
  trackingInfo?: { carrier: string; trackingNumber: string };
  now: string;
};

export type UpdateOrderStatusMutationResult = {
  order: OrderStatusTransitionOrder;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  artworkIds: string[];
  warnings: OrderStatusTransitionWarning[];
};

export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  awaiting_deposit: ['paid', 'cancelled'],
  paid: ['preparing'],
  preparing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  refund_requested: ['refunded'],
  refunded: [],
};

function getArtworkIds(order: OrderStatusTransitionOrder) {
  const lineItems = extractLineItems(order);
  return lineItems.length > 0
    ? lineItems.map((item) => item.artwork_id)
    : order.artwork_id
      ? [order.artwork_id]
      : [];
}

export async function updateOrderStatusMutation(
  supabase: OrderStatusTransitionClient,
  { orderId, newStatus, trackingInfo, now }: UpdateOrderStatusMutationInput
): Promise<UpdateOrderStatusMutationResult> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, buyer_email, buyer_name, buyer_phone, artwork_id, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');

  const orderRow = order as OrderStatusTransitionOrder;
  const fromStatus = orderRow.status as OrderStatus;
  const allowedNext = VALID_STATUS_TRANSITIONS[fromStatus] ?? [];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`${fromStatus} → ${newStatus} 전환은 허용되지 않습니다.`);
  }

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (newStatus === 'cancelled') {
    updatePayload.cancelled_at = now;
  }

  if (newStatus === 'shipped' && trackingInfo?.carrier) {
    updatePayload.shipping_carrier = trackingInfo.carrier;
    updatePayload.tracking_number = trackingInfo.trackingNumber || null;
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('status', fromStatus)
    .select('id');

  if (updateError) throw updateError;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  }

  const warnings: OrderStatusTransitionWarning[] = [];
  let artworkIds: string[] = [];

  if (fromStatus === 'paid' && newStatus === 'cancelled') {
    const { error: voidError } = await supabase
      .from('artwork_sales')
      .update({ voided_at: now, void_reason: 'admin_cancelled' })
      .eq('order_id', orderId)
      .is('voided_at', null);
    if (voidError) {
      warnings.push({ code: 'ARTWORK_SALES_VOID_FAILED', error: voidError });
    }

    artworkIds = getArtworkIds(orderRow);
    for (const artworkId of artworkIds) {
      await deriveAndSyncArtworkStatus(supabase, artworkId);
    }

    const releaseResult = await releaseReservedArtworksIfUnowned(supabase, artworkIds, now);
    if (releaseResult.errors) {
      warnings.push({ code: 'RESERVATION_RELEASE_FAILED', errors: releaseResult.errors });
    }
  }

  if (fromStatus === 'awaiting_deposit' && newStatus === 'cancelled') {
    artworkIds = getArtworkIds(orderRow);
    const releaseResult = await releaseReservedArtworksIfUnowned(supabase, artworkIds, now);
    if (releaseResult.errors) {
      warnings.push({ code: 'RESERVATION_RELEASE_FAILED', errors: releaseResult.errors });
    }
  }

  return {
    order: orderRow,
    fromStatus,
    toStatus: newStatus,
    artworkIds,
    warnings,
  };
}
