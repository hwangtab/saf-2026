import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { cancelPayment } from '@/lib/integrations/toss/cancel';
import type { PaymentProvider } from '@/lib/integrations/toss/config';
import type { ArtworkSaleLine } from '@/lib/orders/record-artwork-sales';
import { releaseReservedArtworksIfUnowned } from '@/lib/orders/reservations';
import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import { runAllSettled } from '@/lib/server/after-response';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { Database } from '@/types/supabase';

export type ArtworkTakenAutoRefundClient = SupabaseClient<Database>;

export type ArtworkTakenAutoRefundContext = {
  logPrefix: string;
  successRunLabel: string;
  failureRunLabel: string;
  successAdminTitle: string;
  failureAdminTitle: string;
  successReference: string;
  failureReference: string;
};

export type HandleArtworkTakenAutoRefundInput = {
  supabase: ArtworkTakenAutoRefundClient;
  paymentKey: string;
  orderId: string;
  orderNo: string;
  provider: PaymentProvider;
  salesLines: ArtworkSaleLine[];
  buyerEmail?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
  amount: number;
  locale: 'ko' | 'en';
  now: string;
  context: ArtworkTakenAutoRefundContext;
};

export async function handleArtworkTakenAutoRefund({
  supabase,
  paymentKey,
  orderId,
  orderNo,
  provider,
  salesLines,
  buyerEmail,
  buyerName,
  buyerPhone,
  amount,
  locale,
  now,
  context,
}: HandleArtworkTakenAutoRefundInput): Promise<void> {
  console.error(`${context.logPrefix} unique 작품 경합 패배 — 자동 환불 진행:`, orderNo);

  const { error: refundMarkError } = await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: now })
    .eq('id', orderId)
    .eq('status', 'paid');
  if (refundMarkError) {
    console.error(`${context.logPrefix} 경합 패배 주문 refunded 마킹 실패:`, refundMarkError);
  }

  const takenReleaseIds = salesLines.map((item) => item.artwork_id);
  if (takenReleaseIds.length > 0) {
    const releaseResult = await releaseReservedArtworksIfUnowned(supabase, takenReleaseIds, now);
    if (releaseResult.errors) {
      console.error(
        `${context.logPrefix} 경합 패배 reserved→available 해제 실패:`,
        releaseResult.errors
      );
    }
    for (const artworkId of takenReleaseIds) {
      revalidatePath(`/artworks/${artworkId}`);
      revalidatePath(`/en/artworks/${artworkId}`);
    }
    revalidatePublicArtworkSurfaces();
  }

  after(async () => {
    let refundOk = false;
    try {
      const result = await cancelPayment(
        paymentKey,
        { cancelReason: '동시 구매 경합으로 작품이 이미 판매되어 자동 환불' },
        `auto-refund-taken-${orderNo || paymentKey}`,
        provider
      );
      refundOk = result.success;
      if (!result.success) {
        console.error(`${context.logPrefix} 경합 패배 자동 환불 거부:`, result.error);
      }
    } catch (err) {
      console.error(`${context.logPrefix} 경합 패배 자동 환불 실패:`, err);
    }

    if (refundOk) {
      const { error: paymentSyncError } = await supabase
        .from('payments')
        .update({ status: 'CANCELED', cancelled_at: now })
        .eq('order_id', orderId);
      if (paymentSyncError) {
        console.error(
          `${context.logPrefix} 경합 패배 payments status 정합 실패:`,
          paymentSyncError
        );
      }
      await runAllSettled(context.successRunLabel, [
        () =>
          notifyEmail('info', context.successAdminTitle, {
            주문번호: orderNo,
            paymentKey,
            참고: context.successReference,
          }),
        ...(buyerEmail
          ? [
              () =>
                sendBuyerEmail(
                  buyerEmail,
                  'refunded',
                  {
                    orderNo,
                    buyerName,
                    artworkTitle: '',
                    artistName: '',
                    amount,
                  },
                  locale
                ),
            ]
          : []),
        () =>
          sendBuyerSms(
            buyerPhone,
            'refunded',
            { buyerName, artworkTitle: '', amount },
            locale,
            orderNo || undefined
          ),
      ]);
      return;
    }

    await runAllSettled(context.failureRunLabel, [
      () =>
        notifyEmail('error', context.failureAdminTitle, {
          주문번호: orderNo,
          paymentKey,
          금액: `₩${amount.toLocaleString('ko-KR')}`,
          참고: context.failureReference,
        }),
    ]);
  });
}
