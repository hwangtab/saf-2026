/** @jest-environment node */
import { GET } from '@/app/api/internal/sms-broadcast-dispatch/route';

import { sendSolapiBatch } from '@/lib/sms/solapi-batch';

jest.mock('@/lib/security/internal-cron-auth', () => ({
  validateInternalCronRequest: jest.fn(() => null),
}));
jest.mock('@/lib/sms/solapi-batch', () => ({
  sendSolapiBatch: jest.fn(async (items: unknown[]) =>
    (items as unknown[]).map((_, i) => ({ ok: true, messageId: `M${i}`, segment: 'SMS' }))
  ),
  buildBatchIdempotencyKey: jest.fn(() => 'k'),
}));

// supabase 어드민 스텁: 1개 broadcast, 1개 pending → 1청크 처리 후 finalize.
const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
jest.mock('@/lib/auth/server', () => {
  let pendingDrained = false;
  const makeChain = (table: string) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'in', 'gt', 'order', 'limit'];
    for (const m of methods) chain[m] = jest.fn(() => chain);
    chain.update = jest.fn((patch: Record<string, unknown>) => {
      updates.push({ table, patch });
      const u: Record<string, unknown> = {};
      u.eq = jest.fn(() => u);
      u.in = jest.fn(async () => ({ error: null }));
      // 마지막 eq는 thenable
      u.eq = jest.fn(() => ({ eq: jest.fn(async () => ({ error: null })) }));
      return u;
    });
    // 리졸브 형태
    chain.then = undefined;
    chain.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
    chain.range = jest.fn(async () => ({ data: [], error: null, count: 0 }));
    // 셀렉트 종단 호출들
    chain.limit = jest.fn(() => {
      if (table === 'sms_broadcasts') {
        return Promise.resolve({
          data: [
            {
              id: 'b1',
              channel: 'member',
              body_text: '{{name}}님 안내',
              status: 'queued',
              is_advertisement: false,
            },
          ],
          error: null,
        });
      }
      if (table === 'sms_broadcast_recipients') {
        if (!pendingDrained) {
          pendingDrained = true;
          return Promise.resolve({
            data: [{ id: 'r1', phone: '01011112222', name: 'A' }],
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    return chain;
  };
  return {
    createSupabaseAdminClient: () => ({
      from: (t: string) => makeChain(t),
      rpc: jest.fn(async (fn: string) => {
        if (fn === 'claim_sms_broadcast_dispatch') return { data: 'token-1', error: null };
        if (fn === 'renew_sms_broadcast_dispatch') return { data: true, error: null };
        return { data: null, error: null };
      }),
    }),
  };
});

function req() {
  return { headers: { get: () => 'Bearer x' } } as never;
}

describe('sms-broadcast-dispatch GET', () => {
  it('claim→발송→sent 커밋 후 dispatched 반환', async () => {
    const res = await GET(req());
    const json = await res.json();
    expect(sendSolapiBatch).toHaveBeenCalled();
    expect(json.dispatched).toBeGreaterThanOrEqual(1);
    // recipient가 sent로 갱신됐는지
    expect(
      updates.some((u) => u.table === 'sms_broadcast_recipients' && u.patch.status === 'sent')
    ).toBe(true);
  });
});
