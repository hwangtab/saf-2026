import type { SupabaseClient } from '@supabase/supabase-js';
import { sendBuyerEmail } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import { runAllSettled } from '@/lib/server/after-response';
import { getOrderNotificationInfo } from '@/lib/utils/get-order-notification-info';
import type { Database } from '@/types/supabase';

type Client = SupabaseClient<Database>;

/**
 * 결제 완료(paid) 승격 직후 구매자에게 확인 이메일 + SMS를 발송한다.
 *
 * 웹훅 경로(confirm/webhook)는 자체적으로 구매자 알림을 보내지만, reconcile-payments·
 * expire-stale-orders 취소가드가 웹훅보다 먼저 주문을 승격한 경우엔 지금까지 구매자에게
 * 아무 확인도 안 갔다(markOrderPaid엔 알림 코드가 없음). 이 헬퍼로 그 공백을 메운다.
 *
 * 중복 발송 안전: "실제 승격에 성공한 경로에서만 호출"이 전제다. markOrderPaid는 이미 paid면
 * ORDER_STATE_MISMATCH로 승격에 실패하므로, 여러 경로가 경합해도 실제 승격은 한 번뿐 →
 * 알림도 한 번뿐이다.
 *
 * type: pending_payment→paid는 'payment_confirmed', 가상계좌 입금(awaiting_deposit)→paid는
 * 'deposit_confirmed'.
 */
export async function sendBuyerPaidNotifications(
  supabase: Client,
  params: { orderId: string; type: 'payment_confirmed' | 'deposit_confirmed' }
): Promise<void> {
  const info = await getOrderNotificationInfo(supabase, { id: params.orderId });
  if (!info) return;

  await runAllSettled('buyerPaidNotifications', [
    ...(info.buyerEmail
      ? [
          () =>
            sendBuyerEmail(
              info.buyerEmail,
              params.type,
              {
                orderNo: info.orderNo,
                buyerName: info.buyerName,
                artworkTitle: info.artworkTitle,
                artistName: info.artistName,
                amount: info.totalAmount,
                itemAmount: info.itemAmount,
                shippingAmount: info.shippingAmount,
                shipping: {
                  name: info.shippingName,
                  phone: info.shippingPhone,
                  address: info.shippingAddress,
                  memo: info.shippingMemo,
                },
              },
              info.locale
            ),
        ]
      : []),
    () =>
      sendBuyerSms(
        info.buyerPhone,
        params.type,
        {
          buyerName: info.buyerName,
          artworkTitle: info.artworkTitle,
          amount: info.totalAmount,
        },
        info.locale,
        info.orderNo
      ),
  ]);
}
