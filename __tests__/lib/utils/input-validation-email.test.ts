import { isValidEmail, validateEmail, EMAIL_REGEX } from '@/lib/utils/input-validation';

describe('isValidEmail', () => {
  it('유효한 이메일은 true', () => {
    expect(isValidEmail('a@x.com')).toBe(true);
    expect(isValidEmail('Hong.Gildong@sub.example.co.kr')).toBe(true);
  });

  it('무효한 이메일은 false (throw 안 함)', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a @x.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('EMAIL_REGEX가 export되어 재사용 가능', () => {
    expect(EMAIL_REGEX.test('a@x.com')).toBe(true);
  });

  it('기존 validateEmail 동작 유지 (무효 시 throw)', () => {
    expect(validateEmail('a@x.com')).toBe('a@x.com');
    expect(() => validateEmail('bad')).toThrow();
    expect(validateEmail('')).toBeNull();
  });
});
