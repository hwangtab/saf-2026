import { isFundingOrderId } from '@/lib/funding/order-id';

describe('isFundingOrderId', () => {
  it('returns true for FND- prefixed order numbers', () => {
    expect(isFundingOrderId('FND-20260623-A1B2C3D4')).toBe(true);
  });
  it('returns false for artwork (SAF-) and event (EVT-) orders', () => {
    expect(isFundingOrderId('SAF-20260623-0001')).toBe(false);
    expect(isFundingOrderId('EVT-ABCDEF0123456789')).toBe(false);
  });
  it('returns false for empty or nullish-ish input', () => {
    expect(isFundingOrderId('')).toBe(false);
  });
});
