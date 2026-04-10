import { Text } from '@react-email/components';
import * as React from 'react';

import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface VirtualAccountIssuedEmailProps {
  buyerName: string;
  orderNo: string;
  artworkTitle: string;
  artistName: string;
  amount: number;
  virtualAccount: {
    bankName?: string;
    accountNumber?: string;
    dueDate?: string;
  };
}

function formatKoreanDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export default function VirtualAccountIssuedEmail({
  buyerName,
  orderNo,
  artworkTitle,
  artistName,
  amount,
  virtualAccount,
}: VirtualAccountIssuedEmailProps) {
  const rows = [
    { label: '주문번호', value: orderNo },
    { label: '작품', value: `${artworkTitle} (${artistName})` },
    { label: '결제금액', value: `₩${amount.toLocaleString()}`, bold: true },
    ...(virtualAccount.bankName ? [{ label: '은행', value: virtualAccount.bankName }] : []),
    ...(virtualAccount.accountNumber
      ? [{ label: '계좌번호', value: virtualAccount.accountNumber }]
      : []),
    ...(virtualAccount.dueDate
      ? [{ label: '입금 기한', value: formatKoreanDate(virtualAccount.dueDate) }]
      : []),
  ];

  return (
    <SAFEmailLayout
      headerColor="#3b82f6"
      headerTitle="[씨앗페] 가상계좌 입금 안내"
      previewText={`${buyerName}님, 가상계좌로 입금해 주시면 주문이 확정됩니다.`}
    >
      <Text style={bodyText}>{buyerName}님, 아래 가상계좌로 입금해 주시면 주문이 확정됩니다.</Text>
      <OrderInfoTable rows={rows} />
    </SAFEmailLayout>
  );
}

const bodyText: React.CSSProperties = {
  margin: '0 0 20px',
  color: '#374151',
  fontSize: '15px',
};
