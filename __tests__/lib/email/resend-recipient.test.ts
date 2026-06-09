import { validateResendRecipientEmail } from '@/lib/email/resend-recipient';

describe('validateResendRecipientEmail', () => {
  it.each(['person@example.com', 'name+tag@gmail.com', 'artist.name@naver.com'])(
    'accepts %s',
    (email) => {
      expect(validateResendRecipientEmail(email)).toEqual({ valid: true });
    }
  );

  it.each([
    'artist@naver..com',
    '.artist@gmail.com',
    'artist.@gmail.com',
    '작가@gmail.com',
    'artist@gmail.com010',
    'artist@naver.com ',
    'artist@@gmail.com',
  ])('rejects %s before it can poison a Resend batch', (email) => {
    expect(validateResendRecipientEmail(email).valid).toBe(false);
  });
});
