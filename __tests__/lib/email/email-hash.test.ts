import { hashEmail } from '@/lib/email/email-hash';

describe('hashEmail', () => {
  it('petition 테이블의 sha256 해시와 동일한 형식을 반환한다', () => {
    const result = hashEmail('Test@Example.COM');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('같은 이메일은 항상 동일한 해시를 반환한다', () => {
    expect(hashEmail('user@example.com')).toBe(hashEmail('user@example.com'));
  });

  it('대소문자·공백을 정규화한 뒤 해싱한다', () => {
    expect(hashEmail('User@Example.com')).toBe(hashEmail('user@example.com'));
    expect(hashEmail('  user@example.com  ')).toBe(hashEmail('user@example.com'));
  });

  it('다른 이메일은 다른 해시를 반환한다', () => {
    expect(hashEmail('a@example.com')).not.toBe(hashEmail('b@example.com'));
  });
});
