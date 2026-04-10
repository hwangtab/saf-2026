import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface DepositConfirmedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
}

export default function DepositConfirmedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
}: DepositConfirmedEmailProps) {
  const rows = [
    { label: '주문번호', value: orderNo },
    { label: '작품', value: `${artworkTitle} (${artistName})` },
    { label: '결제금액', value: `₩${amount.toLocaleString()}`, bold: true },
  ];

  return (
    <SAFEmailLayout
      headerColor="#22c55e"
      headerTitle="[씨앗페] 입금이 확인되었습니다"
      previewText={`${buyerName}님의 입금이 확인되었습니다.`}
    >
      <Text style={bodyText}>
        {buyerName}님의 입금이 확인되어 주문이 최종 확정되었습니다. 감사합니다.
      </Text>
      <OrderInfoTable rows={rows} />
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#374151',
  fontSize: '15px',
};
