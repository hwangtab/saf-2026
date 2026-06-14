import { Text } from '@react-email/components';
import SAFEmailLayout from './_components/saf-email-layout';

export interface EventWaitlistProps {
  name: string;
  partySize: number;
  amount: number;
}

export default function EventWaitlistEmail({ name }: EventWaitlistProps) {
  return (
    <SAFEmailLayout
      headerColor="#1D7A5F"
      headerTitle="[씨앗페] 오윤 40주기 추도식 대기 신청 접수"
      previewText={`${name}님, 대기자로 등록되었습니다.`}
      locale="ko"
    >
      <Text style={{ color: '#555E67', fontSize: '15px', lineHeight: '1.6' }}>
        {name}님, 현재 버스 정원이 마감되어 대기자로 등록되었습니다. 취소 등으로 자리가 나면 신청
        순서대로 결제 안내를 드립니다. 신청해 주셔서 감사합니다.
      </Text>
    </SAFEmailLayout>
  );
}
