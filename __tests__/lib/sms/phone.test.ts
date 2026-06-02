import { normalizeKoreanMobile } from '@/lib/sms/phone';

describe('normalizeKoreanMobile', () => {
  it('하이픈·공백을 제거하고 11자리 010 번호를 반환한다', () => {
    expect(normalizeKoreanMobile('010-1234-5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('010 1234 5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('01012345678')).toBe('01012345678');
  });

  it('+82 / 82 국가코드를 0으로 치환한다', () => {
    expect(normalizeKoreanMobile('+82 10-1234-5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('821012345678')).toBe('01012345678');
  });

  it('010이 아니거나 자릿수가 틀리면 null', () => {
    expect(normalizeKoreanMobile('02-123-4567')).toBeNull();
    expect(normalizeKoreanMobile('0212345678')).toBeNull();
    expect(normalizeKoreanMobile('0101234567')).toBeNull(); // 10자리
    expect(normalizeKoreanMobile('010123456789')).toBeNull(); // 12자리
  });

  it('빈값·null·undefined는 null', () => {
    expect(normalizeKoreanMobile('')).toBeNull();
    expect(normalizeKoreanMobile(null)).toBeNull();
    expect(normalizeKoreanMobile(undefined)).toBeNull();
  });
});
