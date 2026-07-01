import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveAndSyncArtworkStatus } from '@/lib/artworks/status';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import { releaseReservedArtworksIfUnowned } from '@/lib/orders/reservations';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import { runAllSettled } from '@/lib/server/after-response';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { Database } from '@/types/supabase';

export type TossCanceledCascadeClient = SupabaseClient<Database>;

type TossCanceledOrder = {
  status: string | null;
  artwork_id?: string | null;
  order_no?: string | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  total_amount?: number | null;
  metadata?: unknown;
  order_items?: unknown;
};

export type HandleTossCanceledPaymentCascadeResult =
  | { ok: true; skipped: boolean; artworkIds: string[] }
  | { ok: false; code: 'ORDER_FETCH_FAILED'; error: unknown };

export async function handleTossCanceledPaymentCascade({
  supabase,
  paymentOrderId,
  paymentKey,
  newStatus,
  now,
}: {
  supabase: TossCanceledCascadeClient;
  paymentOrderId: string;
  paymentKey: string;
  newStatus: string;
  now: string;
}): Promise<HandleTossCanceledPaymentCascadeResult> {
  const { data: existingOrder, error: orderFetchError } = await supabase
    .from('orders')
    .select(
      'status, artwork_id, order_no, buyer_email, buyer_name, buyer_phone, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', paymentOrderId)
    .single();

  if (orderFetchError || !existingOrder) {
    return { ok: false, code: 'ORDER_FETCH_FAILED', error: orderFetchError };
  }

  const order = existingOrder as TossCanceledOrder;
  if (order.status === 'refunded' || order.status === 'cancelled') {
    return { ok: true, skipped: true, artworkIds: [] };
  }

  const { error: orderCancelError } = await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: now })
    .eq('id', paymentOrderId)
    .not('status', 'in', '(refunded,cancelled)');

  if (orderCancelError) {
    console.error(`[toss-webhook] order cancel UPDATE failed: ${order.order_no}`, orderCancelError);
  }

  const { error: voidError } = await supabase
    .from('artwork_sales')
    .update({ voided_at: now, void_reason: 'Toss 웹훅 취소 자동 처리' })
    .eq('order_id', paymentOrderId)
    .is('voided_at', null);

  if (voidError) {
    console.error(`[toss-webhook] artwork_sales void failed: ${order.order_no}`, voidError);
  }

  const lineItems = extractLineItems(order);
  const artworkIds =
    lineItems.length > 0
      ? lineItems.map((item) => item.artwork_id)
      : order.artwork_id
        ? [order.artwork_id]
        : [];

  for (const artworkId of artworkIds) {
    await deriveAndSyncArtworkStatus(supabase, artworkId);
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }

  const releaseResult = await releaseReservedArtworksIfUnowned(supabase, artworkIds, now);
  if (releaseResult.errors) {
    console.error('[toss-webhook] artwork reserved→available failed:', releaseResult.errors);
  }

  if (artworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
  }

  const refundInfo = await getOrderNotificationInfo(supabase, { id: paymentOrderId });
  after(async () => {
    await runAllSettled('tossWebhook.canceled.notifications', [
      () =>
        refundInfo
          ? notifyEmail(
              'warning',
              'Toss 결제 취소 수신',
              buildAdminNotificationFields(refundInfo, {
                상태: newStatus,
                paymentKey,
              })
            )
          : notifyEmail('warning', 'Toss 결제 취소 수신', {
              주문번호: order.order_no ?? '',
              상태: newStatus,
              paymentKey,
            }),
      ...(order.buyer_email
        ? [
            () =>
              sendBuyerEmail(
                order.buyer_email!,
                'refunded',
                {
                  orderNo: order.order_no ?? '',
                  buyerName: order.buyer_name ?? '',
                  artworkTitle: refundInfo?.artworkTitle ?? '',
                  artistName: refundInfo?.artistName ?? '',
                  amount: order.total_amount ?? 0,
                  itemAmount: refundInfo?.itemAmount,
                  shippingAmount: refundInfo?.shippingAmount,
                },
                extractBuyerLocale(order.metadata)
              ),
          ]
        : []),
      () =>
        sendBuyerSms(
          order.buyer_phone,
          'refunded',
          {
            buyerName: order.buyer_name ?? '',
            artworkTitle: '',
            amount: order.total_amount ?? 0,
          },
          extractBuyerLocale(order.metadata),
          order.order_no ?? undefined
        ),
    ]);
  });

  return { ok: true, skipped: false, artworkIds };
}
