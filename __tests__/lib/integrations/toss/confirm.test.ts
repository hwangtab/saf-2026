/**
 * @jest-environment node
 */
import { confirmPayment } from '@/lib/integrations/toss/confirm';

describe('toss/confirm — provider routing', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'gck';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'gsk_widget';
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'ck';
    process.env.TOSS_PAYMENTS_SECRET_KEY = 'sk_legacy';
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('uses widget secret when provider is widget', async () => {
    const calls: { url: string; headers: HeadersInit | undefined }[] = [];
    global.fetch = jest.fn(async (url, init) => {
      calls.push({ url: url as string, headers: init?.headers });
      return new Response(JSON.stringify({ paymentKey: 'p', orderId: 'o', status: 'DONE' }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    await confirmPayment({ paymentKey: 'p', orderId: 'o', amount: 1000 }, 'idem-1', 'widget');

    const auth = (calls[0].headers as Record<string, string>).Authorization;
    expect(auth).toBe('Basic ' + Buffer.from('gsk_widget:').toString('base64'));
  });

  it('uses legacy secret when provider is api_v1', async () => {
    const calls: { headers: HeadersInit | undefined }[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push({ headers: init?.headers });
      return new Response(JSON.stringify({ paymentKey: 'p', orderId: 'o', status: 'DONE' }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    await confirmPayment({ paymentKey: 'p', orderId: 'o', amount: 1000 }, 'idem-2', 'api_v1');

    const auth = (calls[0].headers as Record<string, string>).Authorization;
    expect(auth).toBe('Basic ' + Buffer.from('sk_legacy:').toString('base64'));
  });

  it('defaults to widget when provider omitted', async () => {
    const calls: { headers: HeadersInit | undefined }[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push({ headers: init?.headers });
      return new Response(JSON.stringify({ status: 'DONE' }), { status: 200 });
    }) as unknown as typeof fetch;

    await confirmPayment({ paymentKey: 'p', orderId: 'o', amount: 1 }, 'i');

    const auth = (calls[0].headers as Record<string, string>).Authorization;
    expect(auth).toBe('Basic ' + Buffer.from('gsk_widget:').toString('base64'));
  });
});
