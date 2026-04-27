import {
  getTossConfig,
  getTossAuthHeader,
  getTossWidgetClientKey,
  type PaymentProvider,
} from '@/lib/integrations/toss/config';

describe('toss/config — provider switch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    delete process.env.TOSS_PAYMENTS_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
    delete process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when widget keys missing', () => {
    expect(getTossConfig('widget')).toBeNull();
  });

  it('returns null when api_v1 keys missing', () => {
    expect(getTossConfig('api_v1')).toBeNull();
  });

  it('returns widget config when widget keys set', () => {
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'live_gck_test';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'live_gsk_test';
    const cfg = getTossConfig('widget');
    expect(cfg).toEqual({
      clientKey: 'live_gck_test',
      secretKey: 'live_gsk_test',
      apiBaseUrl: 'https://api.tosspayments.com',
      provider: 'widget',
    });
  });

  it('returns api_v1 config independently of widget keys', () => {
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'live_ck_old';
    process.env.TOSS_PAYMENTS_SECRET_KEY = 'live_sk_old';
    const cfg = getTossConfig('api_v1');
    expect(cfg?.provider).toBe('api_v1');
    expect(cfg?.secretKey).toBe('live_sk_old');
  });

  it('defaults to widget when no provider passed', () => {
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'live_gck_test';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'live_gsk_test';
    expect(getTossConfig()?.provider).toBe('widget');
  });

  it('builds Basic auth header with secret + colon', () => {
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'sec';
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'cli';
    const expected = 'Basic ' + Buffer.from('sec:').toString('base64');
    expect(getTossAuthHeader('widget')).toBe(expected);
  });

  it('throws when auth header requested but provider not configured', () => {
    expect(() => getTossAuthHeader('widget')).toThrow(/widget.*not configured/i);
  });

  it('exposes widget client key for browser use', () => {
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'live_gck_pub';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'live_gsk_priv';
    expect(getTossWidgetClientKey()).toBe('live_gck_pub');
  });

  it('returns null widget client key when not configured', () => {
    expect(getTossWidgetClientKey()).toBeNull();
  });

  it('PaymentProvider type accepts only known values', () => {
    const a: PaymentProvider = 'widget';
    const b: PaymentProvider = 'api_v1';
    expect([a, b]).toEqual(['widget', 'api_v1']);
  });
});
