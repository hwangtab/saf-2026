/**
 * forgot-password.ts Server Action 단위 테스트
 *
 * requestPasswordReset의 각 분기를 Supabase mock 기반으로 검증
 *
 * @jest-environment node
 */

// --- Mock: next/headers ---
import { requestPasswordReset } from '@/app/(auth)/forgot-password/actions';

const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({ get: mockHeadersGet })),
}));

// --- Mock: rate-limit ---
let mockRateLimitResult = { success: true, remaining: 4 };
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(async () => mockRateLimitResult),
}));

// --- Mock: Supabase clients ---
const mockAdminRpc = jest.fn();
const mockResetPasswordForEmail = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    rpc: mockAdminRpc,
  })),
  createSupabaseServerClient: jest.fn(async () => ({
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  })),
}));

// env 보장
process.env.NEXT_PUBLIC_SITE_URL = 'https://test.example.com';

describe('requestPasswordReset', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHeadersGet.mockImplementation((name: string) =>
      name === 'x-forwarded-for' ? '203.0.113.42' : null
    );
    mockRateLimitResult = { success: true, remaining: 4 };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns "error" for invalid email', async () => {
    const result = await requestPasswordReset({ email: 'not-an-email' });
    expect(result).toEqual({ status: 'error' });
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it('returns "rate_limited" when rateLimit fails', async () => {
    mockRateLimitResult = { success: false, remaining: 0 };
    const result = await requestPasswordReset({ email: 'a@b.com' });
    expect(result).toEqual({ status: 'rate_limited' });
    expect(mockAdminRpc).not.toHaveBeenCalled();
  });

  it('returns "not_found" when RPC says not_found', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'not_found' }, error: null });
    const result = await requestPasswordReset({ email: 'unknown@example.com' });
    expect(result).toEqual({ status: 'not_found' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('returns "social_only" with provider when RPC says social_only', async () => {
    mockAdminRpc.mockResolvedValue({
      data: { status: 'social_only', provider: 'google' },
      error: null,
    });
    const result = await requestPasswordReset({ email: 'g@example.com' });
    expect(result).toEqual({ status: 'social_only', provider: 'google' });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('sends email and returns "sent" when eligible', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await requestPasswordReset({ email: 'user@example.com' });
    expect(result).toEqual({ status: 'sent' });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://test.example.com/auth/reset',
    });
  });

  it('returns "error" when RPC throws', async () => {
    mockAdminRpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } });
    const result = await requestPasswordReset({ email: 'a@b.com' });
    expect(result).toEqual({ status: 'error' });
  });

  it('returns "error" when resetPasswordForEmail fails', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'smtp down' } });
    const result = await requestPasswordReset({ email: 'a@b.com' });
    expect(result).toEqual({ status: 'error' });
  });

  it('lowercases email before RPC call', async () => {
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordReset({ email: 'MiXeD@Example.com' });
    expect(mockAdminRpc).toHaveBeenCalledWith('check_reset_eligibility', {
      p_email: 'mixed@example.com',
    });
  });

  it('uses last (trusted) IP segment from x-forwarded-for for rateLimit key', async () => {
    mockHeadersGet.mockImplementation((name: string) =>
      name === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null
    );
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const { rateLimit } = await import('@/lib/rate-limit');
    const result = await requestPasswordReset({ email: 'a@b.com' });
    expect(rateLimit).toHaveBeenCalledWith('forgot-password:5.6.7.8', {
      limit: 5,
      windowMs: 60_000,
    });
    expect(result).toEqual({ status: 'sent' });
  });

  it('prefers x-vercel-forwarded-for over x-forwarded-for', async () => {
    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'x-vercel-forwarded-for') return '198.51.100.7';
      if (name === 'x-forwarded-for') return 'spoofed-1.2.3.4, 5.6.7.8';
      return null;
    });
    mockAdminRpc.mockResolvedValue({ data: { status: 'eligible' }, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const { rateLimit } = await import('@/lib/rate-limit');
    await requestPasswordReset({ email: 'a@b.com' });
    expect(rateLimit).toHaveBeenCalledWith('forgot-password:198.51.100.7', {
      limit: 5,
      windowMs: 60_000,
    });
  });
});
