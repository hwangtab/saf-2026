import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { cancelPayment } from '@/lib/integrations/toss/cancel';
import type { PaymentProvider } from '@/lib/integrations/toss/config';
import type { TossConfirmResponse } from '@/lib/integrations/toss/types';
import { notifyEmail } from '@/lib/notify';
import {
  releaseReservedArtworksIfUnowned,
  reserveUniqueArtworksOrRollback,
} from '@/lib/orders/reservations';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import { runAllSettled } from '@/lib/server/after-response';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { Database, Json } from '@/types/supabase';

export type TossConfirmVirtualAccountPromotionClient = SupabaseClient<Database>;

export type TossConfirmVirtualAccountPromotionOrder = {
  id: string;
  metadata?: unknown;
};

export type TossConfirmVirtualAccountLineItem = {
  artwork_id: string;
};

export type TossConfirmVirtualAccountStatusSyncFailureLog = {
  orderId: string;
  orderNo: string;
  targetStatus: 'awaiting_deposit';
  latestStatus: string | null;
  error: string;
};

export type TossConfirmVirtualAccountPromotionResult =
  | { ok: true; status: 'promoted'; reservedArtworkIds: string[] }
  | { ok: true; status: 'already_promoted'; reservedArtworkIds: string[] }
  | { ok: false; code: 'PAYMENT_RECORD_FAILED'; error: string }
  | { ok: false; code: 'RESERVATION_FAILED'; failedArtworkId: string | null }
  | {
      ok: false;
      code: 'ORDER_STATUS_SYNC_FAILED';
      statusCode: 500 | 409;
      latestStatus: string | null;
      error: string;
    };

export type PromoteTossConfirmVirtualAccountInput = {
  supabase: TossConfirmVirtualAccountPromotionClient;
  order: TossConfirmVirtualAccountPromotionOrder;
  orderNo: string;
  paymentKey: string;
  tossPayment: TossConfirmResponse;
  provider: PaymentProvider;
  lineItems: TossConfirmVirtualAccountLineItem[];
  idempotencyKey: string;
  now: string;
  logOrderStatusSyncFailure: (
    input: TossConfirmVirtualAccountStatusSyncFailureLog
  ) => Promise<unknown> | unknown;
};

function metadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return { ...(metadata as Record<string, unknown>) };
}

function formatError(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function promoteTossConfirmVirtualAccount({
  supabase,
  order,
  orderNo,
  paymentKey,
  tossPayment,
  provider,
  lineItems,
  idempotencyKey,
  now,
  logOrderStatusSyncFailure,
}: PromoteTossConfirmVirtualAccountInput): Promise<TossConfirmVirtualAccountPromotionResult> {
  const paymentRecordResult = await ensureTossPaymentRecord({
    supabase,
    orderId: order.id,
    tossPayment,
    idempotencyKey,
  });

  if (!paymentRecordResult.ok) {
    return { ok: false, code: 'PAYMENT_RECORD_FAILED', error: paymentRecordResult.error };
  }

  const artworkIds = lineItems.map((item) => item.artwork_id);
  const reservationResult = await reserveUniqueArtworksOrRollback(supabase, artworkIds, now);

  if (!reservationResult.ok) {
    let cancelOk = false;
    let cancelError: unknown = null;
    try {
      const cancelResult = await cancelPayment(
        paymentKey,
        { cancelReason: '작품 예약 실패로 가상계좌 주문 자동 취소' },
        `auto-cancel-reservation-${orderNo}`,
        provider
      );
      cancelOk = cancelResult.success;
      if (!cancelResult.success) cancelError = cancelResult.error;
    } catch (err) {
      cancelError = err;
    }

    const cancelledAt = now;
    const { error: orderCancelError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: cancelledAt })
      .eq('id', order.id)
      .eq('status', 'pending_payment');
    if (orderCancelError) {
      console.error('[confirm] VA reservation failure order cancel failed:', orderCancelError);
    }

    if (cancelOk) {
      const { error: paymentCancelError } = await supabase
        .from('payments')
        .update({ status: 'CANCELED', cancelled_at: cancelledAt })
        .eq('order_id', order.id);
      if (paymentCancelError) {
        console.error('[confirm] VA reservation failure payment sync failed:', paymentCancelError);
      }
    }

    after(() =>
      runAllSettled('toss-confirm.virtual-account-reservation-failed.notifications', [
        () =>
          notifyEmail(cancelOk ? 'warning' : 'error', '가상계좌 주문 작품 예약 실패 — 자동 취소', {
            주문번호: orderNo,
            paymentKey,
            작품ID: reservationResult.failedArtworkId,
            Toss취소: cancelOk ? '성공' : '실패',
            ...(cancelError ? { 에러: formatError(cancelError).slice(0, 500) } : {}),
            참고: cancelOk
              ? '가상계좌는 발급됐지만 작품 예약에 실패해 입금 안내 없이 주문을 취소했습니다.'
              : '가상계좌는 발급됐지만 작품 예약에 실패했고 Toss 취소가 실패했습니다. 구매자 입금 안내는 보내지 않았으니 Toss 관리자에서 수동 확인이 필요합니다.',
          }),
      ])
    );

    return {
      ok: false,
      code: 'RESERVATION_FAILED',
      failedArtworkId: reservationResult.failedArtworkId ?? null,
    };
  }

  const reservedArtworkIds = reservationResult.reservedArtworkIds;
  const targetStatus = 'awaiting_deposit' as const;
  const { data: updatedOrders, error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: targetStatus,
      paid_at: null,
      metadata: {
        ...metadataRecord(order.metadata),
        payment_method: tossPayment.method ?? null,
      } as Json,
    })
    .eq('id', order.id)
    .eq('status', 'pending_payment')
    .select('id');

  const orderPromoted = Array.isArray(updatedOrders) && updatedOrders.length > 0;

  if (orderUpdateError || !orderPromoted) {
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('id,status')
      .eq('id', order.id)
      .single();
    const latestStatus =
      typeof latestOrder === 'object' && latestOrder && 'status' in latestOrder
        ? String(latestOrder.status)
        : null;

    if (!orderUpdateError && latestStatus === targetStatus) {
      return { ok: true, status: 'already_promoted', reservedArtworkIds };
    }

    const updateErrMsg = orderUpdateError?.message ?? 'orders update affected 0 rows';
    console.error('[confirm] order UPDATE failed after Toss approval:', updateErrMsg);

    if (!orderUpdateError) {
      await releaseReservedArtworksIfUnowned(supabase, reservedArtworkIds, now);
      after(async () => {
        let cancelOk = false;
        let cancelError: unknown = null;
        try {
          const cancelResult = await cancelPayment(
            paymentKey,
            { cancelReason: '주문 상태 경합으로 가상계좌 주문 자동 취소' },
            `auto-cancel-race-${orderNo}`,
            provider
          );
          cancelOk = cancelResult.success;
          if (!cancelResult.success) cancelError = cancelResult.error;
        } catch (err) {
          cancelError = err;
        }

        if (cancelOk) {
          const { error: paymentSyncError } = await supabase
            .from('payments')
            .update({ status: 'CANCELED', cancelled_at: now })
            .eq('order_id', order.id);
          if (paymentSyncError) {
            console.error('[confirm] VA race payment sync failed:', paymentSyncError);
          }
        }

        await runAllSettled('toss-confirm.virtual-account-race-cancel.notification', [
          () =>
            notifyEmail(
              cancelOk ? 'warning' : 'error',
              '가상계좌 주문 상태 경합 — 입금 안내 보류',
              {
                주문번호: orderNo,
                paymentKey,
                Toss취소: cancelOk ? '성공' : '실패',
                ...(cancelError ? { 에러: formatError(cancelError).slice(0, 500) } : {}),
                참고: '가상계좌는 발급됐지만 주문 상태가 이미 바뀌어 입금 안내를 보내지 않았습니다.',
              }
            ),
        ]);
      });
    }

    after(() =>
      runAllSettled('tossConfirm.orderStatusSyncFailed.notifications', [
        () =>
          notifyEmail('error', '결제 후 주문 상태 업데이트 실패', {
            주문번호: orderNo,
            목표상태: targetStatus,
            현재상태: latestStatus ?? '확인 실패',
            에러: updateErrMsg,
            참고: 'Toss 승인은 확인됐지만 내부 주문 상태 전이에 실패해 성공 알림과 매출 기록을 중단했습니다.',
          }),
        () =>
          logOrderStatusSyncFailure({
            orderId: order.id,
            orderNo,
            targetStatus,
            latestStatus,
            error: updateErrMsg,
          }),
      ])
    );

    return {
      ok: false,
      code: 'ORDER_STATUS_SYNC_FAILED',
      statusCode: orderUpdateError ? 500 : 409,
      latestStatus,
      error: updateErrMsg,
    };
  }

  for (const artworkId of reservedArtworkIds) {
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }
  revalidatePublicArtworkSurfaces();

  return { ok: true, status: 'promoted', reservedArtworkIds };
}
