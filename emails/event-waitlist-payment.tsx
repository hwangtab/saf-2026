import { Section, Text, Button } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';

export interface EventWaitlistPaymentProps {
  name: string;
  partySize: number;
  amount: number;
  deadline?: string;
  paymentUrl?: string;
}

export default function EventWaitlistPaymentEmail({
  name,
  partySize,
  amount,
  deadline,
  paymentUrl,
}: EventWaitlistPaymentProps) {
  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 좌석 안내"
      previewText={`${name}님, 추도식에 자리가 생겼습니다.`}
      locale="ko"
    >
      <Text style={{ color: '#555E67', fontSize: '15px', lineHeight: '1.6' }}>
        {name}님, 대기 신청하신 추도식에 자리가 생겼습니다. 인원 {partySize}명 / 회비{' '}
        {amount.toLocaleString('ko-KR')}원.
        {deadline ? ` ${deadline}까지 ` : ' '}아래 버튼에서 결제하시면 참가가 확정됩니다.
      </Text>
      {paymentUrl && (
        <Section style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button
            href={paymentUrl}
            style={{
              background: '#0E4ECF',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '700',
            }}
          >
            결제하기
          </Button>
        </Section>
      )}
    </SAFEmailLayout>
  );
}
