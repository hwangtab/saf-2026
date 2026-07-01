import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveAndSyncArtworkStatus } from '@/lib/artworks/status';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import {
  releaseReservedArtworksIfUnowned,
  type ReleaseReservedArtworksResult,
} from '@/lib/orders/reservations';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { Database } from '@/types/supabase';

export type RefundCancelClient = SupabaseClient<Database>;

export type RefundedOrderLifecycleOrder = {
  id: string;
  order_no: string;
  artwork_id?: string | null;
  order_items?: unknown;
};

export type RefundedOrderLifecyclePayment = {
  id?: string | null;
  payment_key?: string | null;
  status?: string | null;
};

export type MarkOrderRefundedWarning =
  | { code: 'PAYMENT_UPDATE_FAILED'; error: string }
  | { code: 'ARTWORK_SALES_VOID_FAILED'; error: string }
  | { code: 'RESERVATION_RELEASE_FAILED'; errors: ReleaseReservedArtworksResult['errors'] };

export type MarkOrderRefundedAfterCancelInput = {
  supabase: RefundCancelClient;
  order: RefundedOrderLifecycleOrder;
  payment?: RefundedOrderLifecyclePayment | null;
  now: string;
  sourceStatuses: Array<'paid' | 'preparing' | 'refund_requested'>;
  voidReason: string;
};

export type MarkOrderRefundedAfterCancelOutcome =
  | { ok: true; artworkIds: string[]; warnings: MarkOrderRefundedWarning[] }
  | { ok: false; code: 'ORDER_UPDATE_FAILED'; error: string }
  | { ok: false; code: 'ORDER_STATE_MISMATCH' };

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
}

function getArtworkIds(order: RefundedOrderLifecycleOrder) {
  const lineItems = extractLineItems(order);
  const ids =
    lineItems.length > 0
      ? lineItems.map((item) => item.artwork_id)
      : order.artwork_id
        ? [order.artwork_id]
        : [];

  return Array.from(new Set(ids.filter(Boolean)));
}

export async function markOrderRefundedAfterCancel({
  supabase,
  order,
  payment,
  now,
  sourceStatuses,
  voidReason,
}: MarkOrderRefundedAfterCancelInput): Promise<MarkOrderRefundedAfterCancelOutcome> {
  const warnings: MarkOrderRefundedWarning[] = [];

  // Order update FIRST — fail early before touching the payment record.
  // This prevents the stuck-order scenario where payment is CANCELED in DB
  // but the order stays in paid/preparing with no UI recovery path.
  const { data: updatedOrders, error: orderUpdateError } = await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: now })
    .eq('id', order.id)
    .in('status', sourceStatuses)
    .select('id');

  if (orderUpdateError) {
    return { ok: false, code: 'ORDER_UPDATE_FAILED', error: errorMessage(orderUpdateError) };
  }

  if (!updatedOrders || updatedOrders.length === 0) {
    return { ok: false, code: 'ORDER_STATE_MISMATCH' };
  }

  // Payment record sync after order is confirmed refunded — best-effort only.
  if (payment?.id && payment.status !== 'CANCELED') {
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({ status: 'CANCELED', cancelled_at: now })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      warnings.push({
        code: 'PAYMENT_UPDATE_FAILED',
        error: errorMessage(paymentUpdateError),
      });
    }
  }

  const artworkIds = getArtworkIds(order);

  const { error: voidError } = await supabase
    .from('artwork_sales')
    .update({ voided_at: now, void_reason: voidReason })
    .eq('order_id', order.id)
    .is('voided_at', null);

  if (voidError) {
    warnings.push({
      code: 'ARTWORK_SALES_VOID_FAILED',
      error: errorMessage(voidError),
    });
  }

  for (const artworkId of artworkIds) {
    await deriveAndSyncArtworkStatus(supabase, artworkId);
  }

  const releaseResult = await releaseReservedArtworksIfUnowned(supabase, artworkIds, now);
  if (releaseResult.errors) {
    warnings.push({ code: 'RESERVATION_RELEASE_FAILED', errors: releaseResult.errors });
  }

  for (const artworkId of artworkIds) {
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }
  if (artworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
  }

  return { ok: true, artworkIds, warnings };
}
