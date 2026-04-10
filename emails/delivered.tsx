import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface DeliveredEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
}

export default function DeliveredEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
}: DeliveredEmailProps) {
  const rows = [
    { label: '주문번호', value: orderNo },
    { label: '작품', value: `${artworkTitle} (${artistName})` },
  ];

  return (
    <SAFEmailLayout
      headerColor="#22c55e"
      headerTitle="[씨앗페] 작품이 배송 완료되었습니다"
      previewText={`${buyerName}님, 주문하신 작품이 배송 완료되었습니다.`}
    >
      <Text style={bodyText}>{buyerName}님, 주문하신 작품이 배송 완료되었습니다. 감사합니다.</Text>
      <OrderInfoTable rows={rows} />
      <Text style={noteText}>
        작품 수령 후 문제가 있으시면 contact@kosmart.org로 문의해 주세요.
      </Text>
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
