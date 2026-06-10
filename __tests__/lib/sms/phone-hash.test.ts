/** @jest-environment node */
import { hashPhone } from '@/lib/sms/phone-hash';
import { PETITION_SALT } from '@/lib/email/email-hash';
import crypto from 'crypto';

describe('hashPhone', () => {
  it('정규화된 010 번호를 salt+sha256 hex로 해싱한다', () => {
    const expected = crypto
      .createHash('sha256')
      .update(PETITION_SALT + '01012345678')
      .digest('hex');
    expect(hashPhone('010-1234-5678')).toBe(expected);
  });

  it('하이픈·공백·국가코드 변형이 같은 해시로 수렴한다', () => {
    const a = hashPhone('010-1234-5678');
    const b = hashPhone('+82 10 1234 5678');
    const c = hashPhone('01012345678');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('비-010 번호는 raw-trim 기반으로 안정적 해시(throw 없음)', () => {
    expect(() => hashPhone('02-123-4567')).not.toThrow();
    expect(hashPhone('02-123-4567')).toBe(hashPhone('02-123-4567'));
  });
});
