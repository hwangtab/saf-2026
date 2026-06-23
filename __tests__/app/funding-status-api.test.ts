/** @jest-environment node */
import { GET } from '@/app/api/funding/[slug]/status/route';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));
const { createSupabaseAdminClient } = require('@/lib/auth/server');

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

it('returns 404 when project not found', async () => {
  createSupabaseAdminClient.mockReturnValue({
    rpc: jest.fn().mockResolvedValue({ data: { found: false }, error: null }),
  });
  const res = await GET(new Request('http://t') as any, ctx('nope'));
  expect(res.status).toBe(404);
});

it('returns status payload with percent', async () => {
  const rpc = jest
    .fn()
    .mockResolvedValueOnce({
      data: {
        found: true,
        goal_amount: 100000000,
        raised_amount: 25000000,
        backer_count: 10,
        is_open: true,
        end_at: null,
      },
      error: null,
    })
    .mockResolvedValueOnce({ data: {}, error: null });
  createSupabaseAdminClient.mockReturnValue({ rpc });
  const res = await GET(new Request('http://t') as any, ctx('oh-yoon-terracotta'));
  const json = await res.json();
  expect(json.percent).toBe(25);
  expect(json.backer_count).toBe(10);
});
