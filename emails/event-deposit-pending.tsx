import { Section, Text } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';
import {
  OH_YOON_MEMORIAL_BANK,
  OH_YOON_MEMORIAL_BANK_ACCOUNT,
  OH_YOON_MEMORIAL_BANK_HOLDER,
} from '@/content/events/oh-yoon-memorial';

export interface EventDepositPendingProps {
  name: string;
  partySize: number;
  amount: number;
  orderNo?: string;
}

export default function EventDepositPendingEmail({
  name,
  partySize,
  amount,
  orderNo,
}: EventDepositPendingProps) {
  const rows = [
    { label: '입금 은행', value: OH_YOON_MEMORIAL_BANK },
    { label: '계좌번호', value: OH_YOON_MEMORIAL_BANK_ACCOUNT, bold: true },
    { label: '예금주', value: OH_YOON_MEMORIAL_BANK_HOLDER },
    { label: '입금 금액', value: `${amount.toLocaleString('ko-KR')}원`, bold: true },
    { label: '인원', value: `${partySize}명` },
    ...(orderNo ? [{ label: '주문번호', value: orderNo }] : []),
  ];

  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 입금 안내"
      previewText={`${name}님, 아래 계좌로 회비를 입금해 주세요.`}
      locale="ko"
    >
      <Text style={{ margin: '0 0 12px', color: '#555E67', fontSize: '15px', lineHeight: '1.6' }}>
        {name}님, 추도식 참가 신청이 접수되었습니다. 아래 계좌로 회비를 입금해 주시면 사무국에서
        입금 확인 후 참가가 최종 확정됩니다. 좌석은 입금 확인 전까지 우선 확보해 둡니다.
      </Text>
      <OrderInfoTable rows={rows} />
      <Section style={{ marginTop: '16px' }}>
        <Text style={{ color: '#555E67', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
          입금자명을 신청자 성함({name})과 동일하게 해주시면 확인이 빠릅니다. 입금이 확인되면 확정
          안내를 다시 보내드립니다. 문의: contact@kosmart.org
        </Text>
      </Section>
    </SAFEmailLayout>
  );
}
