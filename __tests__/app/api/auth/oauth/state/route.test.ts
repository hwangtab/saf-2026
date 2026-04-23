/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/oauth/state/route';
import { OAUTH_STATE_QUERY_PARAM } from '@/lib/auth/oauth-state';

describe('POST /api/auth/oauth/state', () => {
  it('returns callback redirectTo and sets httpOnly cookie', async () => {
    const request = new NextRequest('https://example.com/api/auth/oauth/state', {
      method: 'POST',
    });

    const response = await POST(request);
    const payload = (await response.json()) as { redirectTo?: unknown };
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(typeof payload.redirectTo).toBe('string');
    expect((payload.redirectTo as string).length).toBeGreaterThan(0);
    expect(payload.redirectTo).toContain('/auth/callback?');
    expect(payload.redirectTo).toContain(`${OAUTH_STATE_QUERY_PARAM}=`);
    expect(setCookie).toContain('oauth_state=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/auth/callback');
    expect(setCookie).toContain('Max-Age=600');
  });
});
