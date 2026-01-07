import { parsePrice } from '../../lib/parsePrice';

describe('parsePrice', () => {
  it('should parse standard Korean currency string', () => {
    expect(parsePrice('₩1,000,000')).toBe(1000000);
    expect(parsePrice('₩50,000')).toBe(50000);
  });

  it('should parse currency string without symbol', () => {
    expect(parsePrice('1,000,000')).toBe(1000000);
    expect(parsePrice('50000')).toBe(50000);
  });

  it('should handle special cases (inquiry/pending) as Infinity', () => {
    expect(parsePrice('문의')).toBe(Infinity);
    expect(parsePrice('확인 중')).toBe(Infinity);
  });

  it('should handle empty or invalid inputs as Infinity', () => {
    expect(parsePrice('')).toBe(Infinity);
    // @ts-ignore
    expect(parsePrice(null)).toBe(Infinity);
    // @ts-ignore
    expect(parsePrice(undefined)).toBe(Infinity);
  });

  it('should handle non-numeric strings as Infinity', () => {
    expect(parsePrice('abc')).toBe(Infinity);
    expect(parsePrice('가격 미정')).toBe(Infinity);
  });

  it('should parse mixed strings correctly', () => {
    expect(parsePrice('약 ₩1,000,000 정도')).toBe(1000000);
    expect(parsePrice('$100 (USD)')).toBe(100);
  });

  it('should treat 0 as Infinity based on current logic', () => {
    expect(parsePrice('₩0')).toBe(Infinity);
    expect(parsePrice('0')).toBe(Infinity);
  });
});
