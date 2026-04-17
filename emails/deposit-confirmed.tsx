import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import { formatAmount, t, type EmailLocale } from './_components/i18n';

export interface DepositConfirmedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  itemAmount?: number;
  shippingAmount?: number;
  shipping?: { name?: string; phone?: string; address?: string; memo?: string };
  locale?: EmailLocale;
}

export default function DepositConfirmedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  itemAmount,
  shippingAmount,
  shipping,
  locale = 'ko',
}: DepositConfirmedEmailProps) {
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
    ...(shipping?.name ? [{ label: t('recipient', locale), value: shipping.name }] : []),
    ...(shipping?.phone ? [{ label: t('recipientPhone', locale), value: shipping.phone }] : []),
    ...(shipping?.address
      ? [{ label: t('shippingAddress', locale), value: shipping.address }]
      : []),
    ...(shipping?.memo ? [{ label: t('shippingMemo', locale), value: shipping.memo }] : []),
  ];

  const header =
    locale === 'en' ? '[SAF] Your deposit has been confirmed' : '[씨앗페] 입금이 확인되었습니다';
  const preview =
    locale === 'en'
      ? `${buyerName}, your deposit has been confirmed.`
      : `${buyerName}님의 입금이 확인되었습니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, your deposit has been confirmed and your order is finalized. Thank you.`
      : `${buyerName}님의 입금이 확인되어 주문이 최종 확정되었습니다. 감사합니다.`;

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
