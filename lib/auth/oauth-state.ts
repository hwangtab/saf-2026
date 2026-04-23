import crypto from 'crypto';

export const OAUTH_STATE_COOKIE_NAME = 'oauth_state';
export const OAUTH_STATE_COOKIE_PATH = '/auth/callback';
export const OAUTH_STATE_MAX_AGE_SECONDS = 600;

export function createOAuthStateNonce() {
  return crypto.randomBytes(24).toString('hex');
}

export function isValidOAuthState(
  requestState: string | null | undefined,
  cookieState: string | null | undefined
) {
  if (!requestState || !cookieState) return false;
  const requestBuffer = Buffer.from(requestState);
  const cookieBuffer = Buffer.from(cookieState);
  return (
    requestBuffer.length === cookieBuffer.length &&
    crypto.timingSafeEqual(requestBuffer, cookieBuffer)
  );
}

export function getOAuthStateCookieOptions(maxAge = OAUTH_STATE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: OAUTH_STATE_COOKIE_PATH,
    maxAge,
  };
}
