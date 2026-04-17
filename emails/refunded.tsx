import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import { formatAmount, t, type EmailLocale } from './_components/i18n';

export interface RefundedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  itemAmount?: number;
  shippingAmount?: number;
  locale?: EmailLocale;
}

export default function RefundedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  itemAmount,
  shippingAmount,
  locale = 'ko',
}: RefundedEmailProps) {
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
    { label: t('refundAmount', locale), value: formatAmount(amount, locale), bold: true },
  ];

  const header =
    locale === 'en' ? '[SAF] Your refund has been processed' : '[씨앗페] 환불이 처리되었습니다';
  const preview =
    locale === 'en'
      ? `${buyerName}, your order refund has been processed.`
      : `${buyerName}님의 주문 환불이 처리되었습니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, your order has been refunded.`
      : `${buyerName}님, 주문하신 작품의 환불이 처리되었습니다.`;
  const note =
    locale === 'en'
      ? 'Refunds may take 3-5 business days depending on your payment method.'
      : '환불은 결제수단에 따라 영업일 기준 3~5일 소요될 수 있습니다.';

  return (
    <SAFEmailLayout
      headerColor="#f59e0b"
      headerTitle={header}
      previewText={preview}
      locale={locale}
    >
      <Text style={bodyText}>{body}</Text>
      <OrderInfoTable rows={rows} />
      <Text style={noteText}>{note}</Text>
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#374151',
  fontSize: '15px',
};

const noteText: React.CSSProperties = {
  margin: '16px 0 0',
  color: '#6b7280',
  fontSize: '13px',
};
