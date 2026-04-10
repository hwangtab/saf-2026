import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface PaymentConfirmedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  paymentMethod?: string;
}

export default function PaymentConfirmedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  paymentMethod,
}: PaymentConfirmedEmailProps) {
  const rows = [
    { label: '주문번호', value: orderNo },
    { label: '작품', value: `${artworkTitle} (${artistName})` },
    { label: '결제금액', value: `₩${amount.toLocaleString()}`, bold: true },
    ...(paymentMethod ? [{ label: '결제수단', value: paymentMethod }] : []),
  ];

  return (
    <SAFEmailLayout
      headerColor="#22c55e"
      headerTitle="[씨앗페] 결제가 완료되었습니다"
      previewText={`${buyerName}님의 결제가 완료되었습니다.`}
    >
      <Text style={bodyText}>{buyerName}님의 결제가 정상적으로 완료되었습니다. 감사합니다.</Text>
      <OrderInfoTable rows={rows} />
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#374151',
  fontSize: '15px',
};
