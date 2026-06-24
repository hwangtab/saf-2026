/**
 * admin-funding.ts Server Action 단위 테스트
 *
 * @jest-environment node
 */

import {
  deleteRewardTier,
  refundFundingPledge,
  updateFulfillment,
} from '@/app/actions/admin-funding';

jest.mock('next/server', () => ({
  after: (cb: unknown) => (typeof cb === 'function' ? (cb as () => unknown)() : cb),
}));

jest.mock('@/lib/auth/guards', () => ({ requireAdmin: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));
jest.mock('@/lib/integrations/toss/cancel', () => ({ cancelPayment: jest.fn() }));
jest.mock('@/lib/notify', () => ({ notifyEmail: jest.fn() }));

const { createSupabaseAdminClient } = require('@/lib/auth/server');
const { cancelPayment } = require('@/lib/integrations/toss/cancel');

beforeEach(() => jest.clearAllMocks());

it('deleteRewardTier blocks when paid pledges exist', async () => {
  // Mock chain: from('pledge_items').select(...).eq(...).eq(...).limit(1) → { data: [...], error: null }
  createSupabaseAdminClient.mockReturnValue({
    from: (_t: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({ data: [{ pledge_id: 'x' }], error: null }),
          }),
        }),
      }),
    }),
  });
  const res = await deleteRewardTier('tier1');
  expect(res).toEqual({ ok: false, error: 'TIER_HAS_PLEDGES' });
});

it('deleteRewardTier deletes when no paid pledges', async () => {
  const deleteFn = jest.fn().mockReturnValue({ eq: () => ({ error: null }) });
  createSupabaseAdminClient.mockReturnValue({
    from: (t: string) =>
      t === 'pledge_items'
        ? {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({ data: [], error: null }),
                }),
              }),
            }),
          }
        : { delete: deleteFn },
  });
  const res = await deleteRewardTier('tier1');
  expect(res.ok).toBe(true);
  expect(deleteFn).toHaveBeenCalled();
});

it('refundFundingPledge refunds paid pledge via Toss cancel', async () => {
  const update = jest.fn().mockReturnValue({ eq: () => ({ error: null }) });
  createSupabaseAdminClient.mockReturnValue({
    from: (t: string) =>
      t === 'funding_pledges'
        ? {
            select: () => ({
              eq: () => ({
                single: () => ({
                  data: { id: 'p1', status: 'paid', order_no: 'FND-1' },
                  error: null,
                }),
              }),
            }),
            update,
          }
        : {
            select: () => ({
              eq: () => ({ single: () => ({ data: { payment_key: 'pk1' }, error: null }) }),
            }),
            update,
          },
  });
  cancelPayment.mockResolvedValue({ success: true });
  const res = await refundFundingPledge('p1');
  expect(res.ok).toBe(true);
  expect(cancelPayment).toHaveBeenCalled();
});

it('refundFundingPledge rejects non-paid pledge', async () => {
  createSupabaseAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: { id: 'p1', status: 'pending_payment' }, error: null }),
        }),
      }),
    }),
  });
  const res = await refundFundingPledge('p1');
  expect(res).toEqual({ ok: false, error: 'NOT_REFUNDABLE' });
});

it('updateFulfillment writes status + tracking', async () => {
  const eq = jest.fn().mockReturnValue({ error: null });
  const update = jest.fn().mockReturnValue({ eq });
  createSupabaseAdminClient.mockReturnValue({ from: () => ({ update }) });
  const res = await updateFulfillment('p1', 'shipped', 'CJ', '123');
  expect(res.ok).toBe(true);
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      fulfillment_status: 'shipped',
      tracking_company: 'CJ',
      tracking_number: '123',
    })
  );
});
