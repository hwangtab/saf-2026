import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import { t, type EmailLocale } from './_components/i18n';

export interface DeliveredEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  locale?: EmailLocale;
}

export default function DeliveredEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  locale = 'ko',
}: DeliveredEmailProps) {
  const rows = [
    { label: t('orderNo', locale), value: orderNo },
    { label: t('artwork', locale), value: `${artworkTitle} (${artistName})` },
  ];

  const header =
    locale === 'en'
      ? '[SAF] Your artwork has been delivered'
      : '[씨앗페] 작품이 배송 완료되었습니다';
  const preview =
    locale === 'en'
      ? `${buyerName}, your artwork has been delivered.`
      : `${buyerName}님, 주문하신 작품이 배송 완료되었습니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, your artwork has been delivered. Thank you.`
      : `${buyerName}님, 주문하신 작품이 배송 완료되었습니다. 감사합니다.`;
  const note =
    locale === 'en'
      ? 'If you have any issues with your artwork, please contact contact@kosmart.org.'
      : '작품 수령 후 문제가 있으시면 contact@kosmart.org로 문의해 주세요.';

  return (
    <SAFEmailLayout
      headerColor="#22c55e"
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
