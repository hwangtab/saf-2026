import { generateOrderNumber } from '@/lib/integrations/toss/order-number';

describe('generateOrderNumber', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('SAF-YYYYMMDD-XXXXXXXX 포맷을 반환한다', () => {
    const orderNo = generateOrderNumber();
    expect(orderNo).toMatch(/^SAF-\d{8}-[A-HJ-NP-Z2-9]{8}$/);
  });

  it('KST 날짜 기준으로 order_no를 생성한다', () => {
    jest.useFakeTimers();
    // UTC 기준 2026-04-23 15:30:00 == KST 2026-04-24 00:30:00
    jest.setSystemTime(new Date('2026-04-23T15:30:00.000Z'));

    const orderNo = generateOrderNumber();
    expect(orderNo.startsWith('SAF-20260424-')).toBe(true);
  });

  it('suffix에 모호한 문자(I, O, 0, 1)를 포함하지 않는다', () => {
    const orderNo = generateOrderNumber();
    const suffix = orderNo.split('-')[2] ?? '';
    expect(suffix).not.toMatch(/[IO01]/);
  });
});
