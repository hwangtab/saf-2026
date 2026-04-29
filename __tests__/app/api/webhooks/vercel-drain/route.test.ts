/** @jest-environment node */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/vercel-drain/route';
import { createSupabaseAdminClient } from '@/lib/auth/server';

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

const mockCreateSupabaseAdminClient = jest.mocked(createSupabaseAdminClient);

function signBody(body: string, secret: string): string {
  return crypto.createHmac('sha1', secret).update(body).digest('hex');
}

function createPostRequest(body: string, signature: string, contentType = 'application/json') {
  return new NextRequest('https://example.com/api/webhooks/vercel-drain', {
    method: 'POST',
    headers: {
      'content-type': contentType,
      'x-vercel-signature': signature,
    },
    body,
  });
}

describe('vercel-drain webhook payload validation', () => {
  const secret = 'test-drain-secret';

  beforeEach(() => {
    process.env.VERCEL_DRAIN_SECRET = secret;
    jest.clearAllMocks();

    mockCreateSupabaseAdminClient.mockReturnValue({
      from: jest.fn(() => ({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })),
    } as unknown as ReturnType<typeof createSupabaseAdminClient>);
  });

  it('returns 400 for accepted schema with invalid timestamp range', async () => {
    const payload = [
      {
        schema: 'vercel.analytics.v2',
        eventType: 'pageview',
        path: '/artworks',
        timestamp: Number.MAX_VALUE,
      },
    ];
    const raw = JSON.stringify(payload);
    const signature = signBody(raw, secret);

    const response = await POST(createPostRequest(raw, signature));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: 'Invalid analytics event payload' });
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('returns 400 for accepted schema with invalid event shape', async () => {
    const payload = [
      {
        schema: 'vercel.analytics.v1',
        eventType: 'pageview',
        path: '',
        timestamp: Date.now(),
      },
    ];
    const raw = JSON.stringify(payload);
    const signature = signBody(raw, secret);

    const response = await POST(createPostRequest(raw, signature));

    expect(response.status).toBe(400);
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('returns 400 when custom event is missing eventName', async () => {
    const payload = [
      {
        schema: 'vercel.analytics.v2',
        eventType: 'event',
        path: '/artworks',
        timestamp: Date.now(),
      },
    ];
    const raw = JSON.stringify(payload);
    const signature = signBody(raw, secret);

    const response = await POST(createPostRequest(raw, signature));

    expect(response.status).toBe(400);
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('filters non-analytics payloads without touching DB', async () => {
    const payload = [{ schema: 'vercel.logs.v1', message: 'ignore me' }];
    const raw = JSON.stringify(payload);
    const signature = signBody(raw, secret);

    const response = await POST(createPostRequest(raw, signature));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ inserted: 0, filtered: 1 });
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('accepts valid analytics payload and inserts rows', async () => {
    const payload = [
      {
        schema: 'vercel.analytics.v2',
        eventType: 'pageview',
        path: '/news',
        timestamp: Date.now(),
      },
    ];
    const raw = JSON.stringify(payload);
    const signature = signBody(raw, secret);

    const response = await POST(createPostRequest(raw, signature));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ inserted: 1 });
    expect(mockCreateSupabaseAdminClient).toHaveBeenCalledTimes(1);
  });

  it('accepts valid custom event payload with eventName', async () => {
    const payload = [
      {
        schema: 'vercel.analytics.v2',
        eventType: 'event',
        eventName: 'cta_click',
        path: '/news',
        timestamp: Date.now(),
      },
    ];
    const raw = JSON.stringify(payload);
    const signature = signBody(raw, secret);

    const response = await POST(createPostRequest(raw, signature));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ inserted: 1 });
    expect(mockCreateSupabaseAdminClient).toHaveBeenCalledTimes(1);
  });
});
