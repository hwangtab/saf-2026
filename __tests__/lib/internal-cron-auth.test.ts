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
  const originalBypassUntil = process.env.INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL;
  const originalBypassReason = process.env.INTERNAL_CRON_EMERGENCY_BYPASS_REASON;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.NODE_ENV = 'development';
    delete process.env.INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL;
    delete process.env.INTERNAL_CRON_EMERGENCY_BYPASS_REASON;
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL = originalBypassUntil;
    process.env.INTERNAL_CRON_EMERGENCY_BYPASS_REASON = originalBypassReason;
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

  it('accepts valid secret in development without x-vercel-cron header', () => {
    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    );
    expect(response).toBeNull();
  });

  it('requires x-vercel-cron header in production', async () => {
    process.env.NODE_ENV = 'production';
    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('accepts valid secret and x-vercel-cron header in production', () => {
    process.env.NODE_ENV = 'production';
    const response = validateInternalCronRequest(
      createRequest({
        authorization: 'Bearer test-cron-secret',
        'x-vercel-cron': '1',
      })
    );

    expect(response).toBeNull();
  });

  it('allows 24h emergency bypass in production when reason is provided', () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();
    process.env.INTERNAL_CRON_EMERGENCY_BYPASS_REASON = 'incident-123 false-positive';

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    );

    expect(response).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('CRON_GUARD_BYPASS_ACTIVE')
    );
  });

  it('rejects bypass when reason is missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[internal-cron-auth] CRON_GUARD_BYPASS_REJECTED_MISSING_REASON'
    );
  });

  it('rejects bypass when window exceeds 24 hours', async () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL = new Date(
      Date.now() + 25 * 60 * 60 * 1000
    ).toISOString();
    process.env.INTERNAL_CRON_EMERGENCY_BYPASS_REASON = 'incident-123';

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = validateInternalCronRequest(
      createRequest({ authorization: 'Bearer test-cron-secret' })
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[internal-cron-auth] CRON_GUARD_BYPASS_REJECTED_WINDOW_EXCEEDED'
    );
  });
});
