/** @jest-environment node */

import { createBrowserClient } from '@supabase/ssr';
import { createSupabaseBrowserClient } from '@/lib/auth/client';

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(),
}));

const mockCreateBrowserClient = createBrowserClient as unknown as jest.Mock;

describe('createSupabaseBrowserClient', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('환경변수가 없으면 Configuration error를 던지고 내부 코드만 로그한다', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => createSupabaseBrowserClient()).toThrow('Configuration error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[auth] AUTH_CFG_MISSING_PUBLIC_SUPABASE_CONFIG_CLIENT'
    );

    const loggedMessage = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(loggedMessage).not.toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(loggedMessage).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(mockCreateBrowserClient).not.toHaveBeenCalled();
  });

  it('환경변수가 있으면 브라우저 클라이언트를 생성한다', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const client = { auth: {} };
    mockCreateBrowserClient.mockReturnValue(client);

    expect(createSupabaseBrowserClient()).toBe(client);
    expect(mockCreateBrowserClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
  });
});
