import { Text } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';

export interface EventRefundedProps {
  name: string;
  partySize: number;
  amount: number;
  orderNo?: string;
}

export default function EventRefundedEmail({ name, amount, orderNo }: EventRefundedProps) {
  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 회비 환불 안내"
      previewText={`${name}님, 회비가 환불 처리되었습니다.`}
      locale="ko"
    >
      <Text style={{ color: '#555E67', fontSize: '15px', lineHeight: '1.6' }}>
        {name}님, 오윤 40주기 추도식 회비 {amount.toLocaleString('ko-KR')}원이 전액 환불
        처리되었습니다. 자리가 마감되어 결제하신 금액을 돌려드립니다. 카드 환불은 카드사 사정에 따라
        영업일 기준 3~5일이 걸릴 수 있습니다. 너른 양해 부탁드립니다.
        {orderNo ? ` (주문번호: ${orderNo})` : ''}
      </Text>
    </SAFEmailLayout>
  );
}
