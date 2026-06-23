import {
  CHECKOUT_TOKEN_HASH_KEY,
  checkoutCookieName,
  decodeCheckoutCookie,
  encodeCheckoutCookie,
  getCheckoutTokenHash,
  hashCheckoutToken,
  isCheckoutTokenValid,
  latestCheckoutCookieName,
} from '@/lib/commerce/checkout/checkout-session';

describe('checkout-session', () => {
  it('uses the existing metadata key and sha256 hash contract', () => {
    const token = 'raw-token';
    const hash = hashCheckoutToken(token);

    expect(CHECKOUT_TOKEN_HASH_KEY).toBe('checkout_token_hash');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(getCheckoutTokenHash({ checkout_token_hash: hash })).toBe(hash);
    expect(isCheckoutTokenValid({ checkout_token_hash: hash }, token)).toBe(true);
    expect(isCheckoutTokenValid({ checkout_token_hash: hash }, 'wrong-token')).toBe(false);
  });

  it('keeps the existing order and latest checkout cookie names', () => {
    expect(checkoutCookieName('SAF-001')).toBe('saf_checkout_SAF-001');
    expect(latestCheckoutCookieName('artwork-1')).toMatch(/^saf_checkout_latest_[a-f0-9]{32}$/);
    expect(latestCheckoutCookieName('artwork-1')).toBe(latestCheckoutCookieName('artwork-1'));
    expect(latestCheckoutCookieName('artwork-1')).not.toBe(latestCheckoutCookieName('artwork-2'));
  });

  it('round-trips valid checkout cookie payloads and rejects malformed values', () => {
    const encoded = encodeCheckoutCookie({
      orderId: 'SAF-001',
      checkoutToken: 'token-1',
      currency: 'USD',
    });

    expect(decodeCheckoutCookie(encoded)).toEqual({
      orderId: 'SAF-001',
      checkoutToken: 'token-1',
      currency: 'USD',
    });
    expect(decodeCheckoutCookie(undefined)).toBeNull();
    expect(decodeCheckoutCookie('not-base64-json')).toBeNull();
    expect(
      decodeCheckoutCookie(
        Buffer.from(JSON.stringify({ orderId: 'SAF-001' })).toString('base64url')
      )
    ).toBeNull();
  });
});
