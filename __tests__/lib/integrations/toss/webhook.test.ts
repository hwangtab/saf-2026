import { isEventOrderId } from '@/lib/integrations/toss/webhook';

// 회귀 가드: 추도식 이벤트 결제는 작품 결제와 같은 domestic MID(saf202i818)를 공유해 같은
// 웹훅으로 들어오지만, event_registrations + event confirm route가 전담한다. 작품 웹훅이
// 이벤트 결제를 처리하려다 provider를 api_v1로 잘못 추정 → 검증 실패 알림 + 500 재시도
// 폭주(2026-06-15). orderId 접두로 구분해 이벤트는 ack-ignore.
describe('toss/webhook — isEventOrderId (이벤트 결제 판별)', () => {
  it('이벤트 orderId(EVT- 접두)는 true — 실제 production 사례 포함', () => {
    expect(isEventOrderId('EVT-9078708376594787')).toBe(true);
    expect(isEventOrderId('EVT-C48FFE89A89041DC')).toBe(true);
    expect(isEventOrderId('EVT-0000000000000000')).toBe(true);
  });

  it('작품 orderNo(SAF- 접두)는 false — 작품 웹훅 정상 처리 경로 보존', () => {
    expect(isEventOrderId('SAF-20260615-A3K9X7MN')).toBe(false);
    expect(isEventOrderId('SAF-20260423-A3K9X7MN')).toBe(false);
  });

  it('domestic paymentKey 포맷·빈 문자열·대소문자는 false', () => {
    // paymentKey가 'saf2020…'로 시작해도 orderId 판별과 무관 — EVT- 접두만 이벤트.
    expect(isEventOrderId('saf2020260615201943FeoT9')).toBe(false);
    expect(isEventOrderId('')).toBe(false);
    expect(isEventOrderId('evt-lowercase-no-match')).toBe(false);
  });
});
