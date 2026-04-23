/** @jest-environment node */

import { NextRequest } from 'next/server';
import { GET } from '@/app/(auth)/auth/callback/route';
import { createSupabaseServerClient } from '@/lib/auth/server';

jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const mockCreateSupabaseServerClient = jest.mocked(createSupabaseServerClient);

function createCallbackRequest(query: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) {
    headers.cookie = `${cookie}`;
  }
  return new NextRequest(`https://example.com/auth/callback?${query}`, {
    method: 'GET',
    headers,
  });
}

describe('auth callback oauth state guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login when state query is missing', async () => {
    const response = await GET(createCallbackRequest('code=test-code', 'oauth_state=nonce-1'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/login?error=oauth_state');
    expect(response.headers.get('set-cookie')).toContain('oauth_state=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('redirects to login when state and cookie do not match', async () => {
    const response = await GET(
      createCallbackRequest('code=test-code&state=nonce-1', 'oauth_state=nonce-2')
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/login?error=oauth_state');
    expect(response.headers.get('set-cookie')).toContain('oauth_state=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('continues callback flow when state is valid', async () => {
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({ error: new Error('session failed') }),
      },
    } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

    const response = await GET(
      createCallbackRequest('code=test-code&state=nonce-1', 'oauth_state=nonce-1')
    );

    expect(mockCreateSupabaseServerClient).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/onboarding');
    expect(response.headers.get('set-cookie')).toContain('oauth_state=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
