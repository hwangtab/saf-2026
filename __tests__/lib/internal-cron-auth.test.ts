/** @jest-environment node */

import { NextRequest } from 'next/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';

function createRequest(headers: Record<string, string> = {}) {
  return new NextRequest('https://example.com/api/internal/reconcile-payments', {
    method: 'GET',
    headers,
  });
}

describe('validateInternalCronRequest', () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns 500 when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET;
    const response = validateInternalCronRequest(createRequest());

    expect(response).not.toBeNull();
    expect(response?.status).toBe(500);
    await expect(response?.json()).resolves.toEqual({ error: 'CRON_SECRET is not configured.' });
  });

  it('returns 401 when authorization header is invalid', async () => {
    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer wrong-secret' })
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when authorization header is missing', async () => {
    const response = validateInternalCronRequest(createRequest());

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
  });

  it('accepts valid secret in development', () => {
    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    );
    expect(response).toBeNull();
  });

  it('accepts valid secret in production (Vercel cron 호출 — `x-vercel-cron` header 부착하지 않음)', () => {
    // 회귀 보호: 2026-05-11 이전 구현은 production에서 `x-vercel-cron` header를
    // 추가 검증해 모든 cron이 403 거부됐음. Vercel cron은 Bearer 외 magic header를
    // 부착하지 않으므로 그 검증은 잘못된 가정.
    process.env.NODE_ENV = 'production';
    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    );

    expect(response).toBeNull();
  });
});
