import { formatKoreanPhoneNumber } from '@/lib/utils/phone';

describe('formatKoreanPhoneNumber', () => {
  it('formats mobile numbers with hyphens', () => {
    expect(formatKoreanPhoneNumber('01012345678')).toBe('010-1234-5678');
    expect(formatKoreanPhoneNumber('010-1234-5678')).toBe('010-1234-5678');
  });

  it('formats seoul area numbers with hyphens', () => {
    expect(formatKoreanPhoneNumber('0212345678')).toBe('02-1234-5678');
    expect(formatKoreanPhoneNumber('021234567')).toBe('02-123-4567');
  });

  it('formats representative short numbers', () => {
    expect(formatKoreanPhoneNumber('15881234')).toBe('1588-1234');
  });

  it('normalizes +82 prefixes to domestic format', () => {
    expect(formatKoreanPhoneNumber('+82 10 1234 5678')).toBe('010-1234-5678');
    expect(formatKoreanPhoneNumber('0082-2-123-4567')).toBe('02-123-4567');
  });

  it('returns empty string for invalid or empty input', () => {
    expect(formatKoreanPhoneNumber('')).toBe('');
    expect(formatKoreanPhoneNumber(null)).toBe('');
    expect(formatKoreanPhoneNumber(undefined)).toBe('');
    expect(formatKoreanPhoneNumber('abc')).toBe('');
  });
});
