import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cancelAwaitingDepositOrder,
  type CancelAwaitingDepositWarning,
} from '@/lib/commerce/refund-cancel/cancel-awaiting-order';
import {
  markOrderRefundedAfterCancel,
  type MarkOrderRefundedWarning,
} from '@/lib/commerce/refund-cancel/mark-order-refunded';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import type { Database } from '@/types/supabase';

export type BuyerCancelMutationClient = SupabaseClient<Database>;

export type BuyerCancelOrderRow = {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  artwork_id: string | null;
  buyer_email: string | null;
  buyer_user_id: string | null;
  buyer_name: string | null;
  metadata: unknown;
  order_items?: Array<{
    artwork_id: string;
    quantity: number;
    unit_price: number;
  }> | null;
};

export type BuyerCancelPaymentRow = {
  id: string;
  payment_key: string | null;
  method: string | null;
};

export type CancelBuyerOrderMutationInput = {
  orderNo: string;
  buyerEmail: string;
  sessionUserId: string | null;
  cancelReason: string;
  now: string;
};

export type CancelBuyerOrderMutationResult =
  | {
      success: true;
      kind: 'awaiting_deposit';
      order: BuyerCancelOrderRow;
      warnings: CancelAwaitingDepositWarning[];
    }
  | {
      success: true;
      kind: 'paid';
      order: BuyerCancelOrderRow;
      payment: BuyerCancelPaymentRow;
      warnings: MarkOrderRefundedWarning[];
    }
  | {
      success: false;
      error:
        | 'REQUIRED'
        | 'INVALID_INPUT'
        | 'NOT_FOUND'
        | 'INVALID_STATUS'
        | 'NO_PAYMENT'
        | 'ORDER_CANCEL_FAILED'
        | `TOSS_CANCEL_FAILED: ${string}`;
      syncFailure?: {
        order: BuyerCancelOrderRow;
        payment: BuyerCancelPaymentRow;
        code: 'ORDER_UPDATE_FAILED' | 'ORDER_STATE_MISMATCH';
        syncError: string;
      };
    };

function getTossCancelErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

export async function cancelBuyerOrderMutation(
  supabase: BuyerCancelMutationClient,
  { orderNo, buyerEmail, sessionUserId, cancelReason, now }: CancelBuyerOrderMutationInput
): Promise<CancelBuyerOrderMutationResult> {
  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();
  const trimmedReason = cancelReason.trim();

  if (!trimmedOrderNo || (!trimmedEmail && !sessionUserId) || !trimmedReason) {
    return { success: false, error: 'REQUIRED' };
  }

  if (trimmedOrderNo.length > 50 || trimmedEmail.length > 254 || trimmedReason.length > 500) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, artwork_id, buyer_email, buyer_user_id, buyer_name, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('order_no', trimmedOrderNo)
    .maybeSingle();

  if (error || !order) return { success: false, error: 'NOT_FOUND' };

  const orderRow = order as BuyerCancelOrderRow;
  const isOwner = !!sessionUserId && orderRow.buyer_user_id === sessionUserId;

  if (!isOwner && !trimmedEmail) return { success: false, error: 'NOT_FOUND' };
  if (!isOwner && orderRow.buyer_email?.toLowerCase() !== trimmedEmail) {
    return { success: false, error: 'NOT_FOUND' };
  }
  if (orderRow.status !== 'paid' && orderRow.status !== 'awaiting_deposit') {
    return { success: false, error: 'INVALID_STATUS' };
  }

  if (orderRow.status === 'awaiting_deposit') {
    const cancelOutcome = await cancelAwaitingDepositOrder({
      supabase,
      order: orderRow,
      now,
    });

    if (!cancelOutcome.ok) {
      return { success: false, error: 'ORDER_CANCEL_FAILED' };
    }

    return {
      success: true,
      kind: 'awaiting_deposit',
      order: orderRow,
      warnings: cancelOutcome.warnings,
    };
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, payment_key, method')
    .eq('order_id', orderRow.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const paymentRow = payment as BuyerCancelPaymentRow | null;
  if (!paymentRow?.payment_key) return { success: false, error: 'NO_PAYMENT' };

  const provider = resolveOrderProvider(orderRow.metadata);
  const cancelResult = await cancelPayment(
    paymentRow.payment_key,
    { cancelReason: trimmedReason },
    `buyer-cancel-${orderRow.order_no}`,
    provider
  );

  if (!cancelResult.success) {
    return {
      success: false,
      error: `TOSS_CANCEL_FAILED: ${getTossCancelErrorMessage(cancelResult.error)}`,
    };
  }

  const refundOutcome = await markOrderRefundedAfterCancel({
    supabase,
    order: orderRow,
    payment: paymentRow,
    now,
    sourceStatuses: ['paid'],
    voidReason: trimmedReason,
  });

  if (!refundOutcome.ok) {
    return {
      success: false,
      error: 'ORDER_CANCEL_FAILED',
      syncFailure: {
        order: orderRow,
        payment: paymentRow,
        code: refundOutcome.code,
        syncError:
          refundOutcome.code === 'ORDER_UPDATE_FAILED'
            ? refundOutcome.error
            : 'orders update affected 0 rows',
      },
    };
  }

  return {
    success: true,
    kind: 'paid',
    order: orderRow,
    payment: paymentRow,
    warnings: refundOutcome.warnings,
  };
}
