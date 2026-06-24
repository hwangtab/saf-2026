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
  // 2-step mock: pledge_items → returns pledge_ids; funding_pledges → returns paid pledge
  createSupabaseAdminClient.mockReturnValue({
    from: (t: string) => {
      if (t === 'pledge_items') {
        return {
          select: () => ({
            eq: () => ({ data: [{ pledge_id: 'p1' }], error: null }),
          }),
        };
      }
      if (t === 'funding_pledges') {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                limit: () => ({ data: [{ id: 'p1' }], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  });
  const res = await deleteRewardTier('tier1');
  expect(res).toEqual({ ok: false, error: 'TIER_HAS_PLEDGES' });
});

it('deleteRewardTier deletes when no paid pledges', async () => {
  const deleteFn = jest.fn().mockReturnValue({ eq: () => ({ error: null }) });
  createSupabaseAdminClient.mockReturnValue({
    from: (t: string) => {
      if (t === 'pledge_items') {
        return {
          select: () => ({
            eq: () => ({ data: [], error: null }),
          }),
        };
      }
      if (t === 'reward_tiers') {
        return { delete: deleteFn };
      }
      return {};
    },
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
  // idempotency key must match `fnd-admin-refund-${order_no}`
  expect(cancelPayment).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    'fnd-admin-refund-FND-1',
    expect.anything()
  );
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

it('refundFundingPledge returns SYNC_FAILED when Toss cancelled but DB update fails', async () => {
  // pledge is paid, payment_key present, cancelPayment succeeds, but funding_pledges UPDATE fails
  let pledgeSelectCalled = false;
  createSupabaseAdminClient.mockReturnValue({
    from: (t: string) => {
      if (t === 'funding_pledges') {
        return {
          select: () => ({
            eq: () => ({
              single: () => {
                if (!pledgeSelectCalled) {
                  pledgeSelectCalled = true;
                  return { data: { id: 'p1', status: 'paid', order_no: 'FND-1' }, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
          update: () => ({ eq: () => ({ error: { message: 'db down' } }) }),
        };
      }
      // funding_payments
      return {
        select: () => ({
          eq: () => ({ single: () => ({ data: { payment_key: 'pk1' }, error: null }) }),
        }),
        update: () => ({ eq: () => ({ error: null }) }),
      };
    },
  });
  cancelPayment.mockResolvedValue({ success: true });
  const res = await refundFundingPledge('p1');
  expect(res).toEqual({ ok: false, error: 'SYNC_FAILED' });
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
