import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import { formatAmount, formatDate, t, type EmailLocale } from './_components/i18n';

export interface VirtualAccountIssuedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  virtualAccount: {
    bankName?: string;
    accountNumber?: string;
    dueDate?: string;
  };
  locale?: EmailLocale;
}

export default function VirtualAccountIssuedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  virtualAccount,
  locale = 'ko',
}: VirtualAccountIssuedEmailProps) {
  const rows = [
    { label: t('orderNo', locale), value: orderNo },
    { label: t('artwork', locale), value: `${artworkTitle} (${artistName})` },
    { label: t('amount', locale), value: formatAmount(amount, locale), bold: true },
    ...(virtualAccount.bankName
      ? [{ label: t('bank', locale), value: virtualAccount.bankName }]
      : []),
    ...(virtualAccount.accountNumber
      ? [{ label: t('accountNumber', locale), value: virtualAccount.accountNumber }]
      : []),
    ...(virtualAccount.dueDate
      ? [{ label: t('dueDate', locale), value: formatDate(virtualAccount.dueDate, locale) }]
      : []),
  ];

  const header =
    locale === 'en' ? '[SAF] Virtual account deposit instructions' : '[씨앗페] 가상계좌 입금 안내';
  const preview =
    locale === 'en'
      ? `${buyerName}, please transfer to the virtual account to confirm your order.`
      : `${buyerName}님, 가상계좌로 입금해 주시면 주문이 확정됩니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, please transfer the amount to the virtual account below to confirm your order.`
      : `${buyerName}님, 아래 가상계좌로 입금해 주시면 주문이 확정됩니다.`;

  return (
    <SAFEmailLayout
      headerColor="#3b82f6"
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
