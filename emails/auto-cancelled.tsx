import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import { formatAmount, t, type EmailLocale } from './_components/i18n';

export interface AutoCancelledEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  locale?: EmailLocale;
}

export default function AutoCancelledEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  locale = 'ko',
}: AutoCancelledEmailProps) {
  const orderAmountLabel = locale === 'en' ? 'Order Amount' : '주문금액';
  const rows = [
    { label: t('orderNo', locale), value: orderNo },
    { label: t('artwork', locale), value: `${artworkTitle} (${artistName})` },
    { label: orderAmountLabel, value: formatAmount(amount, locale) },
  ];

  const header =
    locale === 'en'
      ? '[SAF] Your order has been auto-cancelled'
      : '[씨앗페] 주문이 자동 취소되었습니다';
  const preview =
    locale === 'en'
      ? `${buyerName}, your order was auto-cancelled as the deposit deadline passed.`
      : `${buyerName}님, 입금 기한이 경과하여 주문이 자동 취소되었습니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, your order has been auto-cancelled because the 24-hour deposit deadline has passed.`
      : `${buyerName}님, 입금 기한(24시간)이 경과하여 주문이 자동 취소되었습니다.`;
  const note =
    locale === 'en'
      ? 'If you would like to place another order, please visit the SAF website.'
      : '다시 구매를 원하시면 씨앗페 웹사이트를 방문해 주세요.';

  return (
    <SAFEmailLayout
      headerColor="#ef4444"
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
