import { Section, Text } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';
import OrderInfoTable from './_components/order-info-table';

export interface EventPaymentConfirmedProps {
  name: string;
  partySize: number;
  amount: number;
}

export default function EventPaymentConfirmedEmail({
  name,
  partySize,
  amount,
}: EventPaymentConfirmedProps) {
  const rows = [
    { label: '신청자', value: `${name}님` },
    { label: '인원', value: `${partySize}명` },
    { label: '회비', value: `${amount.toLocaleString('ko-KR')}원 (결제완료)`, bold: true },
    { label: '일시', value: '2026년 7월 5일(일) 09:30 출발' },
    { label: '집결', value: '인사동 수운회관 옆' },
  ];

  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 신청 완료"
      previewText={`${name}님, 추도식 참가 신청이 완료되었습니다.`}
      locale="ko"
    >
      <Text style={{ margin: '0 0 12px', color: '#555E67', fontSize: '15px' }}>
        {name}님, 오윤 40주기 추도식 참가 신청이 완료되었습니다.
      </Text>
      <OrderInfoTable rows={rows} />
      <Section style={{ marginTop: '16px' }}>
        <Text style={{ color: '#555E67', fontSize: '14px', lineHeight: '1.6' }}>
          일정: 11시 추도식 / 12시 종료 / 13시 30분 점심(인사동 풍류사랑). 당일 안내사항은 추후 다시
          연락드립니다.
        </Text>
      </Section>
    </SAFEmailLayout>
  );
}
