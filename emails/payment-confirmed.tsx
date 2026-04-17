import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import { formatAmount, t, type EmailLocale } from './_components/i18n';

export interface PaymentConfirmedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  paymentMethod?: string;
  itemAmount?: number;
  shippingAmount?: number;
  shipping?: { name?: string; phone?: string; address?: string; memo?: string };
  locale?: EmailLocale;
}

export default function PaymentConfirmedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  paymentMethod,
  itemAmount,
  shippingAmount,
  shipping,
  locale = 'ko',
}: PaymentConfirmedEmailProps) {
  const showItemized = typeof itemAmount === 'number' && typeof shippingAmount === 'number';
  const rows = [
    { label: t('orderNo', locale), value: orderNo },
    { label: t('artwork', locale), value: `${artworkTitle} (${artistName})` },
    ...(showItemized
      ? [
          { label: t('itemAmount', locale), value: formatAmount(itemAmount!, locale) },
          { label: t('shippingAmount', locale), value: formatAmount(shippingAmount!, locale) },
        ]
      : []),
    {
      label: t(showItemized ? 'totalAmount' : 'amount', locale),
      value: formatAmount(amount, locale),
      bold: true,
    },
    ...(paymentMethod ? [{ label: t('paymentMethod', locale), value: paymentMethod }] : []),
    ...(shipping?.name ? [{ label: t('recipient', locale), value: shipping.name }] : []),
    ...(shipping?.phone ? [{ label: t('recipientPhone', locale), value: shipping.phone }] : []),
    ...(shipping?.address
      ? [{ label: t('shippingAddress', locale), value: shipping.address }]
      : []),
    ...(shipping?.memo ? [{ label: t('shippingMemo', locale), value: shipping.memo }] : []),
  ];

  const header =
    locale === 'en' ? '[SAF] Your payment is complete' : '[씨앗페] 결제가 완료되었습니다';
  const preview =
    locale === 'en'
      ? `${buyerName}, your payment has been completed.`
      : `${buyerName}님의 결제가 완료되었습니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, your payment has been successfully processed. Thank you.`
      : `${buyerName}님의 결제가 정상적으로 완료되었습니다. 감사합니다.`;

  return (
    <SAFEmailLayout
      headerColor="#22c55e"
      headerTitle={header}
      previewText={preview}
      locale={locale}
    >
      <Text style={bodyText}>{body}</Text>
      <OrderInfoTable rows={rows} />
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#374151',
  fontSize: '15px',
};
