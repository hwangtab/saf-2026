import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import TrackingInfo from './_components/tracking-info';
import { t, type EmailLocale } from './_components/i18n';

export interface ShippedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  carrier: string;
  trackingNumber?: string;
  locale?: EmailLocale;
}

export default function ShippedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  carrier,
  trackingNumber,
  locale = 'ko',
}: ShippedEmailProps) {
  const rows = [
    { label: t('orderNo', locale), value: orderNo },
    { label: t('artwork', locale), value: `${artworkTitle} (${artistName})` },
  ];

  const header =
    locale === 'en' ? '[SAF] Your artwork has shipped' : '[씨앗페] 작품이 발송되었습니다';
  const preview =
    locale === 'en'
      ? `${buyerName}, your artwork has shipped.`
      : `${buyerName}님, 주문하신 작품이 발송되었습니다.`;
  const body =
    locale === 'en'
      ? `Dear ${buyerName}, your artwork has been shipped.`
      : `${buyerName}님, 주문하신 작품이 발송되었습니다.`;

  return (
    <SAFEmailLayout
      headerColor="#3b82f6"
      headerTitle={header}
      previewText={preview}
      locale={locale}
    >
      <Text style={bodyText}>{body}</Text>
      <OrderInfoTable rows={rows} />
      <TrackingInfo carrier={carrier} trackingNumber={trackingNumber} locale={locale} />
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#374151',
  fontSize: '15px',
};
