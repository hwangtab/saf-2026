/** @jest-environment node */

import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

const mockCreateServerClient = createServerClient as unknown as jest.Mock;

describe('updateSession', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('환경변수가 없으면 Configuration error를 던지고 내부 코드만 로그한다', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const request = new NextRequest('https://example.com');

    await expect(updateSession(request)).rejects.toThrow('Configuration error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth] AUTH_CFG_MISSING_PUBLIC_SUPABASE_CONFIG_MW'
    );

    const loggedMessage = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(loggedMessage).not.toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(loggedMessage).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });

  it('환경변수가 있으면 기존처럼 NextResponse를 반환한다', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const request = new NextRequest('https://example.com');
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
