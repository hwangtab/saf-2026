import { after } from 'next/server';

import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import { runAllSettled } from '@/lib/server/after-response';
import {
  buildAdminNotificationFields,
  type OrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';

export type TossConfirmNotificationOrder = {
  buyer_email?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
};

type BuyerLocale = 'ko' | 'en';

export type TossConfirmPaymentConfirmedNotificationInput = {
  order: TossConfirmNotificationOrder;
  orderId: string;
  amount: number;
  buyerLocale: BuyerLocale;
  notifyInfo: OrderNotificationInfo | null;
  paymentMethod?: string | null;
};

export type TossConfirmVirtualAccountIssuedNotificationInput = {
  order: TossConfirmNotificationOrder;
  orderId: string;
  amount: number;
  buyerLocale: BuyerLocale;
  notifyInfo: OrderNotificationInfo | null;
  virtualAccount?: {
    bankName?: string;
    accountNumber?: string;
    dueDate?: string;
  } | null;
};

export function scheduleTossConfirmPaymentConfirmedNotifications({
  order,
  orderId,
  amount,
  buyerLocale,
  notifyInfo,
  paymentMethod,
}: TossConfirmPaymentConfirmedNotificationInput) {
  after(() =>
    runAllSettled('tossConfirm.paymentConfirmed.notifications', [
      () =>
        notifyInfo
          ? notifyEmail(
              'payment',
              '결제 승인 완료',
              buildAdminNotificationFields(notifyInfo, {
                결제수단: paymentMethod ?? '알 수 없음',
              })
            )
          : notifyEmail('payment', '결제 승인 완료', {
              주문번호: orderId,
              결제수단: paymentMethod ?? '알 수 없음',
              금액: `₩${amount.toLocaleString('ko-KR')}`,
            }),
      ...(order.buyer_email
        ? [
            () =>
              sendBuyerEmail(
                order.buyer_email!,
                'payment_confirmed',
                {
                  orderNo: orderId,
                  buyerName: order.buyer_name ?? '',
                  artworkTitle: notifyInfo?.artworkTitle ?? '',
                  artistName: notifyInfo?.artistName ?? '',
                  amount,
                  paymentMethod: paymentMethod ?? undefined,
                  itemAmount: notifyInfo?.itemAmount,
                  shippingAmount: notifyInfo?.shippingAmount,
                  shipping: notifyInfo
                    ? {
                        name: notifyInfo.shippingName,
                        phone: notifyInfo.shippingPhone,
                        address: notifyInfo.shippingAddress,
                        memo: notifyInfo.shippingMemo,
                      }
                    : undefined,
                },
                buyerLocale
              ),
          ]
        : []),
      () =>
        sendBuyerSms(
          order.buyer_phone,
          'payment_confirmed',
          {
            buyerName: order.buyer_name ?? '',
            artworkTitle: notifyInfo?.artworkTitle ?? '',
            amount,
          },
          buyerLocale,
          orderId
        ),
    ])
  );
}

export function scheduleTossConfirmVirtualAccountIssuedNotifications({
  order,
  orderId,
  amount,
  buyerLocale,
  notifyInfo,
  virtualAccount,
}: TossConfirmVirtualAccountIssuedNotificationInput) {
  after(() =>
    runAllSettled('tossConfirm.virtualAccountIssued.notifications', [
      () =>
        notifyInfo
          ? notifyEmail(
              'info',
              '가상계좌 발급 완료 (입금 대기)',
              buildAdminNotificationFields(notifyInfo, {
                은행: virtualAccount?.bankName,
                계좌번호: virtualAccount?.accountNumber,
                입금기한: virtualAccount?.dueDate,
              })
            )
          : notifyEmail('info', '가상계좌 발급 완료 (입금 대기)', {
              주문번호: orderId,
              금액: `₩${amount.toLocaleString('ko-KR')}`,
            }),
      ...(order.buyer_email
        ? [
            () =>
              sendBuyerEmail(
                order.buyer_email!,
                'virtual_account_issued',
                {
                  orderNo: orderId,
                  buyerName: order.buyer_name ?? '',
                  artworkTitle: notifyInfo?.artworkTitle ?? '',
                  artistName: notifyInfo?.artistName ?? '',
                  amount,
                  virtualAccount: {
                    bankName: virtualAccount?.bankName,
                    accountNumber: virtualAccount?.accountNumber,
                    dueDate: virtualAccount?.dueDate,
                  },
                },
                buyerLocale
              ),
          ]
        : []),
      () =>
        sendBuyerSms(
          order.buyer_phone,
          'virtual_account_issued',
          {
            buyerName: order.buyer_name ?? '',
            artworkTitle: notifyInfo?.artworkTitle ?? '',
            amount,
            virtualAccount: {
              bankName: virtualAccount?.bankName,
              accountNumber: virtualAccount?.accountNumber,
              dueDate: virtualAccount?.dueDate,
            },
          },
          buyerLocale,
          orderId
        ),
    ])
  );
}
