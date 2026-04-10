import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import TrackingInfo from './_components/tracking-info';

export interface ShippedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  carrier: string;
  trackingNumber?: string;
}

export default function ShippedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  carrier,
  trackingNumber,
}: ShippedEmailProps) {
  const rows = [
    { label: '주문번호', value: orderNo },
    { label: '작품', value: `${artworkTitle} (${artistName})` },
  ];

  return (
    <SAFEmailLayout
      headerColor="#3b82f6"
      headerTitle="[씨앗페] 작품이 발송되었습니다"
      previewText={`${buyerName}님, 주문하신 작품이 발송되었습니다.`}
    >
      <Text style={bodyText}>{buyerName}님, 주문하신 작품이 발송되었습니다.</Text>
      <OrderInfoTable rows={rows} />
      <TrackingInfo carrier={carrier} trackingNumber={trackingNumber} />
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#374151',
  fontSize: '15px',
};
