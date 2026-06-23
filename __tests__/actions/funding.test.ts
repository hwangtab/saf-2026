import { createPledge } from '@/app/actions/funding';

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('../../app/actions/request-metadata', () => ({
  getRequestMetadata: jest.fn(),
}));

const { createSupabaseAdminClient } = require('@/lib/auth/server') as {
  createSupabaseAdminClient: jest.Mock;
};
const { rateLimit } = require('@/lib/rate-limit') as { rateLimit: jest.Mock };
const { getRequestMetadata } = require('../../app/actions/request-metadata') as {
  getRequestMetadata: jest.Mock;
};

const baseInput = {
  projectSlug: 'oh-yoon-terracotta',
  rewardTierId: '11111111-1111-1111-1111-111111111111',
  quantity: 1,
  backerName: '김후원',
  backerEmail: 'a@b.com',
  backerPhone: '01012345678',
  agreedTerms: true,
  agreedPrivacy: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  getRequestMetadata.mockResolvedValue({ ip: '1.2.3.4', userAgent: 'jest' });
  rateLimit.mockResolvedValue({ success: true, remaining: 9 });
});

it('returns INVALID_INPUT when terms not agreed', async () => {
  const res = await createPledge({ ...baseInput, agreedTerms: false });
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns INVALID_INPUT when privacy not agreed', async () => {
  const res = await createPledge({ ...baseInput, agreedPrivacy: false });
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns INVALID_INPUT when backerName is empty', async () => {
  const res = await createPledge({ ...baseInput, backerName: '   ' });
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns INVALID_INPUT when email is malformed', async () => {
  const res = await createPledge({ ...baseInput, backerEmail: 'not-an-email' });
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns INVALID_INPUT when quantity is 0', async () => {
  const res = await createPledge({ ...baseInput, quantity: 0 });
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns INVALID_INPUT when quantity is over 50', async () => {
  const res = await createPledge({ ...baseInput, quantity: 51 });
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns RATE_LIMITED when rate limit exceeded', async () => {
  rateLimit.mockResolvedValue({ success: false, remaining: 0 });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'RATE_LIMITED' });
});

it('maps RPC TIER_SOLD_OUT to result code', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: { ok: false, code: 'TIER_SOLD_OUT' },
      error: null,
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'TIER_SOLD_OUT' });
});

it('maps RPC TIER_NOT_FOUND to TIER_SOLD_OUT', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: { ok: false, code: 'TIER_NOT_FOUND' },
      error: null,
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'TIER_SOLD_OUT' });
});

it('maps RPC PROJECT_CLOSED to result code', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: { ok: false, code: 'PROJECT_CLOSED' },
      error: null,
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'PROJECT_CLOSED' });
});

it('maps RPC PROJECT_NOT_FOUND to PROJECT_CLOSED', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: { ok: false, code: 'PROJECT_NOT_FOUND' },
      error: null,
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'PROJECT_CLOSED' });
});

it('maps unknown RPC failure to INVALID_INPUT', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: { ok: false, code: 'UNKNOWN_CODE' },
      error: null,
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'INVALID_INPUT' });
});

it('returns INTERNAL_ERROR on RPC error', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'INTERNAL_ERROR' });
});

it('returns INTERNAL_ERROR when data is null without error', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: false, code: 'INTERNAL_ERROR' });
});

it('returns orderNo and amount on success', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({
      data: { ok: true, order_no: 'FND-20260623-AAAA0000', amount: 30000 },
      error: null,
    }),
  });
  const res = await createPledge(baseInput);
  expect(res).toEqual({ ok: true, orderNo: 'FND-20260623-AAAA0000', amount: 30000 });
});
