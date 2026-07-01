import type { SupabaseClient } from '@supabase/supabase-js';

import {
  markOrderRefundedAfterCancel,
  type MarkOrderRefundedWarning,
} from '@/lib/commerce/refund-cancel/mark-order-refunded';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import type { Database } from '@/types/supabase';

export type AdminRefundMutationClient = SupabaseClient<Database>;

export type AdminRefundOrderRow = {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  artwork_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  metadata: unknown;
  order_items?: Array<{
    artwork_id: string;
    quantity: number;
    unit_price: number;
  }> | null;
};

export type AdminRefundPaymentRow = {
  id: string;
  payment_key: string | null;
  method: string | null;
  status: string | null;
};

export type RefundOrderMutationInput = {
  orderId: string;
  cancelReason: string;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
  now: string;
};

export type RefundOrderMutationResult =
  | {
      success: true;
      order: AdminRefundOrderRow;
      payment: AdminRefundPaymentRow | null;
      hasTossPayment: boolean;
      warnings: MarkOrderRefundedWarning[];
    }
  | {
      success: false;
      error: 'ORDER_REFUND_SYNC_FAILED';
      syncFailure: {
        order: AdminRefundOrderRow;
        payment: AdminRefundPaymentRow | null;
        code: 'ORDER_UPDATE_FAILED' | 'ORDER_STATE_MISMATCH';
        syncError: string;
        hasTossPayment: boolean;
        cancelReason: string;
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

export async function refundOrderMutation(
  supabase: AdminRefundMutationClient,
  { orderId, cancelReason, refundReceiveAccount, now }: RefundOrderMutationInput
): Promise<RefundOrderMutationResult> {
  const trimmedReason = cancelReason.trim();
  if (!trimmedReason) throw new Error('취소 사유를 입력해 주세요.');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, artwork_id, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('주문을 찾을 수 없습니다.');

  const orderRow = order as AdminRefundOrderRow;
  if (!['paid', 'preparing', 'refund_requested'].includes(orderRow.status)) {
    throw new Error(`환불 가능한 상태가 아닙니다. (현재 상태: ${orderRow.status})`);
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, payment_key, method, status')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const paymentRow = payment as AdminRefundPaymentRow | null;
  const hasTossPayment = !!paymentRow?.payment_key;
  const tossAlreadyCanceled = paymentRow?.status === 'CANCELED';

  if (hasTossPayment && !tossAlreadyCanceled) {
    const provider = resolveOrderProvider(orderRow.metadata);
    const cancelResult = await cancelPayment(
      paymentRow.payment_key!,
      {
        cancelReason: trimmedReason,
        ...(refundReceiveAccount ? { refundReceiveAccount } : {}),
      },
      `refund-${orderRow.order_no}`,
      provider
    );

    if (!cancelResult.success) {
      throw new Error(`TossPayments 취소 실패: ${getTossCancelErrorMessage(cancelResult.error)}`);
    }
  }

  const refundOutcome = await markOrderRefundedAfterCancel({
    supabase,
    order: orderRow,
    payment: paymentRow,
    now,
    sourceStatuses: ['paid', 'preparing', 'refund_requested'],
    voidReason: trimmedReason,
  });

  if (!refundOutcome.ok) {
    return {
      success: false,
      error: 'ORDER_REFUND_SYNC_FAILED',
      syncFailure: {
        order: orderRow,
        payment: paymentRow,
        code: refundOutcome.code,
        syncError:
          refundOutcome.code === 'ORDER_UPDATE_FAILED'
            ? refundOutcome.error
            : 'orders update affected 0 rows',
        hasTossPayment,
        cancelReason: trimmedReason,
      },
    };
  }

  return {
    success: true,
    order: orderRow,
    payment: paymentRow,
    hasTossPayment,
    warnings: refundOutcome.warnings,
  };
}
