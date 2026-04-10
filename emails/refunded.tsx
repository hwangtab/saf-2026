import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface RefundedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
}

export default function RefundedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
}: RefundedEmailProps) {
  const rows = [
    { label: '주문번호', value: orderNo },
    { label: '작품', value: `${artworkTitle} (${artistName})` },
    { label: '환불금액', value: `₩${amount.toLocaleString()}`, bold: true },
  ];

  return (
    <SAFEmailLayout
      headerColor="#f59e0b"
      headerTitle="[씨앗페] 환불이 처리되었습니다"
      previewText={`${buyerName}님의 주문 환불이 처리되었습니다.`}
    >
      <Text style={bodyText}>{buyerName}님, 주문하신 작품의 환불이 처리되었습니다.</Text>
      <OrderInfoTable rows={rows} />
      <Text style={noteText}>환불은 결제수단에 따라 영업일 기준 3~5일 소요될 수 있습니다.</Text>
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
