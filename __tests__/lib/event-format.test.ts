import {
  buildEventAlimTalkVariables,
  EVENT_ALIMTALK_TEMPLATE_ENV,
  validateEventInput,
  type RegisterEventInput,
} from '@/lib/events/format';

describe('buildEventAlimTalkVariables', () => {
  it('payment_confirmed 변수 매핑', () => {
    const v = buildEventAlimTalkVariables('payment_confirmed', {
      name: '홍길동',
      partySize: 2,
      amount: 60000,
    });
    expect(v['#{name}']).toBe('홍길동');
    expect(v['#{partySize}']).toBe('2');
    expect(v['#{amount}']).toBe('60,000');
  });

  it('waitlist 는 name만', () => {
    const v = buildEventAlimTalkVariables('waitlist', {
      name: '김씨',
      partySize: 1,
      amount: 30000,
    });
    expect(v).toEqual({ '#{name}': '김씨' });
  });

  it('waitlist_payment 은 deadline 포함', () => {
    const v = buildEventAlimTalkVariables('waitlist_payment', {
      name: '김씨',
      partySize: 1,
      amount: 30000,
      deadline: '6월 20일 18시',
    });
    expect(v['#{deadline}']).toBe('6월 20일 18시');
    expect(v['#{amount}']).toBe('30,000');
  });

  it('refunded 변수 매핑 (reconcile 환불 알림)', () => {
    const v = buildEventAlimTalkVariables('refunded', {
      name: '이승곤',
      partySize: 2,
      amount: 60000,
    });
    expect(v['#{name}']).toBe('이승곤');
    expect(v['#{partySize}']).toBe('2');
    expect(v['#{amount}']).toBe('60,000');
  });

  it('env 매핑은 5종', () => {
    expect(Object.keys(EVENT_ALIMTALK_TEMPLATE_ENV).sort()).toEqual([
      'deposit_pending',
      'payment_confirmed',
      'refunded',
      'waitlist',
      'waitlist_payment',
    ]);
    expect(EVENT_ALIMTALK_TEMPLATE_ENV.deposit_pending).toBe(
      'SOLAPI_KAKAO_TEMPLATE_EVENT_DEPOSIT_PENDING'
    );
    expect(EVENT_ALIMTALK_TEMPLATE_ENV.refunded).toBe('SOLAPI_KAKAO_TEMPLATE_EVENT_REFUNDED');
  });
});

describe('validateEventInput', () => {
  const base: RegisterEventInput = {
    applicantName: '홍길동',
    phone: '010-1234-5678',
    email: '',
    partySize: 1,
    boardingConfirmed: true,
    agreedPrivacy: true,
  };

  it('정상 입력은 에러 없음', () => {
    expect(Object.keys(validateEventInput(base))).toHaveLength(0);
  });

  it('이름 누락 에러', () => {
    expect(validateEventInput({ ...base, applicantName: '' }).applicantName).toBeTruthy();
  });

  it('전화번호 형식 에러', () => {
    expect(validateEventInput({ ...base, phone: 'abc' }).phone).toBeTruthy();
  });

  it('동의 누락 에러', () => {
    expect(validateEventInput({ ...base, agreedPrivacy: false }).agreedPrivacy).toBeTruthy();
  });

  it('party_size 범위 에러', () => {
    expect(validateEventInput({ ...base, partySize: 0 }).partySize).toBeTruthy();
    expect(validateEventInput({ ...base, partySize: 21 }).partySize).toBeTruthy();
  });

  it('이메일 형식 오류(입력 시)', () => {
    expect(validateEventInput({ ...base, email: 'bad' }).email).toBeTruthy();
  });

  it('이메일 미입력은 허용', () => {
    expect(validateEventInput({ ...base, email: '' }).email).toBeUndefined();
  });
});
