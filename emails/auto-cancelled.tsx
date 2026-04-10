import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface AutoCancelledEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
}

export default function AutoCancelledEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
}: AutoCancelledEmailProps) {
  const rows = [
    { label: '주문번호', value: orderNo },
    { label: '작품', value: `${artworkTitle} (${artistName})` },
    { label: '주문금액', value: `₩${amount.toLocaleString()}` },
  ];

  return (
    <SAFEmailLayout
      headerColor="#ef4444"
      headerTitle="[씨앗페] 주문이 자동 취소되었습니다"
      previewText={`${buyerName}님, 입금 기한이 경과하여 주문이 자동 취소되었습니다.`}
    >
      <Text style={bodyText}>
        {buyerName}님, 입금 기한(24시간)이 경과하여 주문이 자동 취소되었습니다.
      </Text>
      <OrderInfoTable rows={rows} />
      <Text style={noteText}>다시 구매를 원하시면 씨앗페 웹사이트를 방문해 주세요.</Text>
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
