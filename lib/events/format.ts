/** 행사 발송·검증의 순수 헬퍼. 서버/이메일/DB 의존성 없음 — 단위 테스트 가능. */

export type EventNotifyType = 'payment_confirmed' | 'waitlist' | 'waitlist_payment';

export interface EventNotifyData {
  name: string;
  partySize: number;
  amount: number;
  /** waitlist_payment 전용 */
  deadline?: string;
  /** waitlist_payment 결제 버튼 링크 */
  paymentUrl?: string;
}

export const won = (n: number): string => n.toLocaleString('ko-KR');

/** 행사 알림톡 템플릿 ID 환경변수 매핑 (buyer-sms ALIMTALK_TEMPLATE_ENV 패턴). */
export const EVENT_ALIMTALK_TEMPLATE_ENV: Record<EventNotifyType, string> = {
  payment_confirmed: 'SOLAPI_KAKAO_TEMPLATE_EVENT_PAYMENT_CONFIRMED',
  waitlist: 'SOLAPI_KAKAO_TEMPLATE_EVENT_WAITLIST',
  waitlist_payment: 'SOLAPI_KAKAO_TEMPLATE_EVENT_WAITLIST_PAYMENT',
};

export function buildEventAlimTalkVariables(
  type: EventNotifyType,
  d: EventNotifyData
): Record<string, string> {
  switch (type) {
    case 'payment_confirmed':
      return {
        '#{name}': d.name,
        '#{partySize}': String(d.partySize),
        '#{amount}': won(d.amount),
      };
    case 'waitlist':
      return { '#{name}': d.name };
    case 'waitlist_payment':
      return {
        '#{name}': d.name,
        '#{partySize}': String(d.partySize),
        '#{amount}': won(d.amount),
        '#{deadline}': d.deadline ?? '',
      };
  }
}

export interface RegisterEventInput {
  applicantName: string;
  phone: string;
  email: string;
  partySize: number;
  boardingConfirmed: boolean;
  agreedPrivacy: boolean;
}

/** 신청 입력 검증. 에러가 없으면 빈 객체. */
export function validateEventInput(
  input: RegisterEventInput
): Partial<Record<keyof RegisterEventInput, string>> {
  const errors: Partial<Record<keyof RegisterEventInput, string>> = {};
  const name = (input.applicantName ?? '').trim();
  if (!name || name.length > 100) errors.applicantName = '이름을 입력해 주세요.';
  if (!/^[0-9\-+\s]{9,20}$/.test((input.phone ?? '').trim())) {
    errors.phone = '연락 가능한 휴대폰 번호를 입력해 주세요.';
  }
  const email = (input.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '이메일 형식이 올바르지 않습니다.';
  }
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 20) {
    errors.partySize = '인원수를 확인해 주세요.';
  }
  if (!input.agreedPrivacy) errors.agreedPrivacy = '개인정보 수집·이용 동의가 필요합니다.';
  return errors;
}
