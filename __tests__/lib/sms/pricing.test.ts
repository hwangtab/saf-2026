import { estimateBroadcastCost, SMS_UNIT_PRICE_KRW } from '@/lib/sms/pricing';

describe('estimateBroadcastCost', () => {
  it('SMS 단가 × 대상 수', () => {
    expect(estimateBroadcastCost(100, 'SMS')).toBe(1980); // 19.8 × 100
  });

  it('LMS 단가 × 대상 수', () => {
    expect(estimateBroadcastCost(100, 'LMS')).toBe(4950); // 49.5 × 100
  });

  it('0명이면 0원', () => {
    expect(estimateBroadcastCost(0, 'SMS')).toBe(0);
  });

  it('소수 단가는 원 단위 반올림', () => {
    expect(estimateBroadcastCost(7, 'SMS')).toBe(139); // 138.6 → 139
  });

  it('음수·소수 대상 수는 안전하게 보정', () => {
    expect(estimateBroadcastCost(-5, 'SMS')).toBe(0);
    expect(estimateBroadcastCost(3.9, 'LMS')).toBe(149); // floor(3.9)=3 × 49.5 = 148.5 → 149
  });

  it('단가 상수 (실계약)', () => {
    expect(SMS_UNIT_PRICE_KRW.SMS).toBe(19.8);
    expect(SMS_UNIT_PRICE_KRW.LMS).toBe(49.5);
    expect(SMS_UNIT_PRICE_KRW.ATA).toBe(14.3);
  });
});
