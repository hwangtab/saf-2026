import { generateUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';

const SECRET = 'test-secret-at-least-32-chars-long-here';

describe('unsubscribe token', () => {
  describe('generateUnsubscribeToken', () => {
    it('SECRET이 없으면 null을 반환한다', () => {
      const original = process.env.EMAIL_UNSUB_SECRET;
      delete process.env.EMAIL_UNSUB_SECRET;
      expect(generateUnsubscribeToken('abc123', 'customer')).toBeNull();
      process.env.EMAIL_UNSUB_SECRET = original;
    });

    it('payload.sig 형식의 문자열을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      const token = generateUnsubscribeToken('abc123', 'customer');
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[0-9a-f]{64}$/);
    });
  });

  describe('verifyUnsubscribeToken', () => {
    it('유효한 토큰을 검증하고 {emailHash, channel}을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      const emailHash = 'deadbeef'.repeat(8);
      const token = generateUnsubscribeToken(emailHash, 'member')!;
      const result = verifyUnsubscribeToken(token);
      expect(result).toEqual({ emailHash, channel: 'member' });
    });

    it('서명이 위변조된 토큰은 null을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      const token = generateUnsubscribeToken('abc123', 'customer')!;
      const tampered = token.slice(0, -2) + 'zz';
      expect(verifyUnsubscribeToken(tampered)).toBeNull();
    });

    it('형식이 잘못된 토큰은 null을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      expect(verifyUnsubscribeToken('no-dot-here')).toBeNull();
    });

    it('SECRET이 없으면 null을 반환한다', () => {
      const original = process.env.EMAIL_UNSUB_SECRET;
      delete process.env.EMAIL_UNSUB_SECRET;
      expect(verifyUnsubscribeToken('any.token')).toBeNull();
      process.env.EMAIL_UNSUB_SECRET = original;
    });
  });
});
