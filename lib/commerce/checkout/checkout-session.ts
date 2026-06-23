import crypto from 'crypto';

export const CHECKOUT_TOKEN_BYTES = 32;
export const CHECKOUT_TOKEN_HASH_KEY = 'checkout_token_hash';
export const CHECKOUT_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export type CheckoutCookiePayload = {
  orderId: string;
  checkoutToken: string;
  currency?: 'KRW' | 'USD';
};

export function generateCheckoutToken(): string {
  return crypto.randomBytes(CHECKOUT_TOKEN_BYTES).toString('base64url');
}

export function hashCheckoutToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getCheckoutTokenHash(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[CHECKOUT_TOKEN_HASH_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function isCheckoutTokenValid(metadata: unknown, checkoutToken: string): boolean {
  const storedHash = getCheckoutTokenHash(metadata);
  if (!storedHash || !checkoutToken) return false;
  const providedHash = hashCheckoutToken(checkoutToken);
  const stored = Buffer.from(storedHash);
  const provided = Buffer.from(providedHash);
  return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
}

export function checkoutCookieName(orderId: string): string {
  return `saf_checkout_${orderId}`;
}

export function latestCheckoutCookieName(artworkId: string): string {
  const key = crypto.createHash('sha256').update(artworkId).digest('hex').slice(0, 32);
  return `saf_checkout_latest_${key}`;
}

export function encodeCheckoutCookie(payload: CheckoutCookiePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCheckoutCookie(value: string | undefined): CheckoutCookiePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const payload = parsed as Partial<CheckoutCookiePayload>;
    if (typeof payload.orderId !== 'string' || typeof payload.checkoutToken !== 'string') {
      return null;
    }
    return {
      orderId: payload.orderId,
      checkoutToken: payload.checkoutToken,
      currency: payload.currency === 'USD' ? 'USD' : payload.currency === 'KRW' ? 'KRW' : undefined,
    };
  } catch {
    return null;
  }
}
