/** @jest-environment node */

/**
 * OAuth callback route(app/(auth)/auth/callback/route.ts)의 핵심 에러 가드 테스트.
 *
 * 과거 자체 state-nonce CSRF 가드를 테스트했으나, 그 가드는 제거됨(CSRF는 Supabase PKCE flow가
 * RFC 7636으로 자체 처리). 대신 어제(2026-05-29) OAuth 회귀의 실제 핵심이었던 session/cookie
 * 교환 실패 경로 — config 누락 / exchange 실패 / 세션 유실 — 를 검증한다.
 */
import { NextRequest } from 'next/server';

import { GET } from '@/app/(auth)/auth/callback/route';

const mockExchangeCodeForSession = jest.fn();
const mockGetUser = jest.fn();
const mockCookieStoreSet = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ set: mockCookieStoreSet })),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
    from: jest.fn(),
  })),
}));

function callbackRequest(query: string) {
  return new NextRequest(`https://example.com/auth/callback?${query}`, { method: 'GET' });
}

describe('auth callback route — session/cookie error guards', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('redirects with config error when supabase env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await GET(callbackRequest('code=test-code'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/login?error=config');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('redirects with session_exchange error when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: new Error('bad code') });
    const response = await GET(callbackRequest('code=test-code'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://example.com/login?error=session_exchange'
    );
  });

  it('redirects with session_missing when exchange succeeds but getUser returns null', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await GET(callbackRequest('code=test-code'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://example.com/login?error=session_missing'
    );
  });

  it('clears oauth_state cookie on every redirect (Max-Age=0)', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: new Error('bad code') });
    const response = await GET(callbackRequest('code=test-code'));
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('oauth_state=');
    expect(setCookie).toContain('Max-Age=0');
  });
});
