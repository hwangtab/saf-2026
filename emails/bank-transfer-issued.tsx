import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import OrderCtaButton from './_components/order-cta-button';
import { formatAmount, formatDate, t, type EmailLocale } from './_components/i18n';

export interface BankTransferIssuedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  bankTransfer: {
    bankName?: string;
    accountNumber?: string;
    holderName?: string;
    dueDate?: string;
  };
  orderUrl?: string;
  locale?: EmailLocale;
}

export default function BankTransferIssuedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  bankTransfer,
  orderUrl,
  locale = 'ko',
}: BankTransferIssuedEmailProps) {
  const rows = [
    { label: t('orderNo', locale), value: orderNo },
    { label: t('artwork', locale), value: `${artworkTitle} (${artistName})` },
    { label: t('amount', locale), value: formatAmount(amount, locale), bold: true },
    ...(bankTransfer.bankName ? [{ label: t('bank', locale), value: bankTransfer.bankName }] : []),
    ...(bankTransfer.accountNumber
      ? [{ label: t('accountNumber', locale), value: bankTransfer.accountNumber, bold: true }]
      : []),
    ...(bankTransfer.holderName
      ? [{ label: locale === 'en' ? 'Account Holder' : '예금주', value: bankTransfer.holderName }]
      : []),
    ...(bankTransfer.dueDate
      ? [{ label: t('dueDate', locale), value: formatDate(bankTransfer.dueDate, locale) }]
      : []),
  ];

  const header =
    locale === 'en' ? '[SAF] Bank transfer deposit instructions' : '[씨앗페] 계좌이체 입금 안내';
  const preview =
    locale === 'en'
      ? `${buyerName}, please transfer to the SAF bank account to confirm your order.`
      : `${buyerName}님, 아래 계좌로 입금해 주시면 주문이 확정됩니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, please transfer the amount to the SAF bank account below to confirm your order.`
      : `${buyerName}님, 아래 계좌로 입금해 주시면 주문이 확정됩니다. 입금자명을 주문자명과 동일하게 해주시면 확인이 빠릅니다.`;

  return (
    <SAFEmailLayout
      headerColor="#0E4ECF"
      headerTitle={header}
      previewText={preview}
      locale={locale}
    >
      <Text style={bodyText}>{body}</Text>
      <OrderInfoTable rows={rows} />
      {orderUrl && <OrderCtaButton href={orderUrl} locale={locale} />}
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#555E67',
  fontSize: '15px',
};
