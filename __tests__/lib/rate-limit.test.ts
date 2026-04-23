const mockRpc = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    rpc: mockRpc,
  })),
}));

const { rateLimit } = require('@/lib/rate-limit') as typeof import('@/lib/rate-limit');

describe('rateLimit', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRpc.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('RPC 성공 시 분산 limiter 결과를 반환한다', async () => {
    mockRpc.mockResolvedValue({
      data: [{ success: true, remaining: 4 }],
      error: null,
    });

    const result = await rateLimit('checkout:127.0.0.1', { limit: 5, windowMs: 60_000 });

    expect(result).toEqual({ success: true, remaining: 4 });
    expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
      p_key: 'checkout:127.0.0.1',
      p_limit: 5,
      p_window_ms: 60_000,
    });
  });

  it('RPC 장애 시 in-memory 폴백으로 동작한다', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'rpc failed' },
    });

    const key = `fallback-${Date.now()}`;

    const first = await rateLimit(key, { limit: 2, windowMs: 60_000 });
    const second = await rateLimit(key, { limit: 2, windowMs: 60_000 });
    const third = await rateLimit(key, { limit: 2, windowMs: 60_000 });

    expect(first).toEqual({ success: true, remaining: 1 });
    expect(second).toEqual({ success: true, remaining: 0 });
    expect(third).toEqual({ success: false, remaining: 0 });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[rate-limit] RATE_LIMIT_RPC_FALLBACK');
  });
});
