/** @jest-environment node */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/oauth/state/route';

describe('POST /api/auth/oauth/state', () => {
  it('returns oauth state and sets httpOnly cookie', async () => {
    const request = new NextRequest('https://example.com/api/auth/oauth/state', {
      method: 'POST',
    });

    const response = await POST(request);
    const payload = (await response.json()) as { state?: unknown };
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(typeof payload.state).toBe('string');
    expect((payload.state as string).length).toBeGreaterThan(0);
    expect(setCookie).toContain('oauth_state=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/auth/callback');
    expect(setCookie).toContain('Max-Age=600');
  });
});
