import {
  hasValidPasswordLength,
  isWeakPasswordError,
  MIN_PASSWORD_LENGTH,
} from '@/lib/auth/password-policy';

describe('password policy', () => {
  it('rejects 7-char password and accepts 8-char password', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(hasValidPasswordLength('1234567')).toBe(false);
    expect(hasValidPasswordLength('12345678')).toBe(true);
  });

  it('detects weak_password code from Supabase', () => {
    expect(isWeakPasswordError({ code: 'weak_password', message: 'weak password' })).toBe(true);
  });

  it('detects weak password validation message', () => {
    expect(
      isWeakPasswordError({
        message: 'Password should be at least 8 characters.',
      })
    ).toBe(true);
  });

  it('does not mark unrelated auth errors as weak password', () => {
    expect(isWeakPasswordError({ message: 'User already registered' })).toBe(false);
  });
});
