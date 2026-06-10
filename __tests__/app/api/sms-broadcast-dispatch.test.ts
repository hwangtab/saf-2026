/** @jest-environment node */
import { GET } from '@/app/api/internal/sms-broadcast-dispatch/route';

import { sendSolapiBatch } from '@/lib/sms/solapi-batch';
import { isNightInKst } from '@/lib/sms/broadcast-body';

jest.mock('@/lib/security/internal-cron-auth', () => ({
  validateInternalCronRequest: jest.fn(() => null),
}));
jest.mock('@/lib/sms/solapi-batch', () => ({
  sendSolapiBatch: jest.fn(async (items: unknown[]) =>
    (items as unknown[]).map((_, i) => ({ ok: true, messageId: `M${i}`, segment: 'SMS' }))
  ),
  buildBatchIdempotencyKey: jest.fn(() => 'k'),
}));
// broadcast-body: personalizeSmsText 실제 구현 유지, isNightInKst jest.fn으로 교체.
jest.mock('@/lib/sms/broadcast-body', () => {
  const actual = jest.requireActual<typeof import('@/lib/sms/broadcast-body')>(
    '@/lib/sms/broadcast-body'
  );
  return {
    ...actual,
    isNightInKst: jest.fn(() => false), // 기본값: 주간
  };
});

// ── 공유 가변 상태: 각 테스트가 원하는 broadcast 행을 주입 ──────────────────────
// jest.mock 팩토리는 hoisting되지만 chain.limit 내부 참조는 런타임에 평가되므로
// 이 let 변수를 beforeEach에서 교체하면 각 테스트에서 다른 행을 반환한다.
let mockBroadcastRow = {
  id: 'b1',
  channel: 'member',
  body_text: '{{name}}님 안내',
  status: 'queued',
  is_advertisement: false,
};

// supabase 어드민 스텁. pendingDrained는 createSupabaseAdminClient 호출마다 새로 생성.
const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
jest.mock('@/lib/auth/server', () => {
  const makeChain = (table: string, pendingDrained: { value: boolean }) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'in', 'gt', 'order', 'limit'];
    for (const m of methods) chain[m] = jest.fn(() => chain);
    chain.update = jest.fn((patch: Record<string, unknown>) => {
      updates.push({ table, patch });
      const u: Record<string, unknown> = {};
      // 마지막 eq는 thenable
      u.eq = jest.fn(() => ({ eq: jest.fn(async () => ({ error: null })) }));
      return u;
    });
    chain.then = undefined;
    chain.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
    chain.range = jest.fn(async () => ({ data: [], error: null, count: 0 }));
    chain.limit = jest.fn(() => {
      if (table === 'sms_broadcasts') {
        // 런타임에 mockBroadcastRow 참조 → beforeEach 교체가 반영됨
        return Promise.resolve({ data: [mockBroadcastRow], error: null });
      }
      if (table === 'sms_broadcast_recipients') {
        if (!pendingDrained.value) {
          pendingDrained.value = true;
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
    createSupabaseAdminClient: () => {
      const pendingDrained = { value: false };
      return {
        from: (t: string) => makeChain(t, pendingDrained),
        rpc: jest.fn(async (fn: string) => {
          if (fn === 'claim_sms_broadcast_dispatch') return { data: 'token-1', error: null };
          if (fn === 'renew_sms_broadcast_dispatch') return { data: true, error: null };
          return { data: null, error: null };
        }),
      };
    },
  };
});

function req() {
  return { headers: { get: () => 'Bearer x' } } as never;
}

describe('sms-broadcast-dispatch GET', () => {
  beforeEach(() => {
    updates.length = 0;
    (sendSolapiBatch as jest.Mock).mockClear();
    // 기본값: 비광고, 주간
    mockBroadcastRow = {
      id: 'b1',
      channel: 'member',
      body_text: '{{name}}님 안내',
      status: 'queued',
      is_advertisement: false,
    };
    (isNightInKst as jest.Mock).mockReturnValue(false);
  });

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

  it('광고 브로드캐스트가 야간(isNightInKst=true)이면 발송하지 않고 status를 queued로 되돌린다', async () => {
    // 광고 broadcast 주입
    mockBroadcastRow = {
      id: 'b-ad',
      channel: 'customer',
      body_text: '(광고)[씨앗페] 테스트\n무료수신거부 080-000-0000',
      status: 'sending',
      is_advertisement: true,
    };
    // SMS_OPT_OUT_080 설정: 080 미설정 가드가 야간 가드보다 먼저 실행되므로 설정 필요
    process.env.SMS_OPT_OUT_080 = '080-111-2222';
    // 야간 시뮬레이션
    (isNightInKst as jest.Mock).mockReturnValue(true);

    const res = await GET(req());
    const json = await res.json();

    // Solapi는 호출되어선 안 됨
    expect(sendSolapiBatch).not.toHaveBeenCalled();

    // broadcast가 queued로 복원됐는지 확인
    const revertUpdate = updates.find(
      (u) =>
        u.table === 'sms_broadcasts' &&
        u.patch.status === 'queued' &&
        u.patch.dispatch_locked_until === null &&
        u.patch.dispatch_lock_token === null
    );
    expect(revertUpdate).toBeDefined();

    // dispatched 카운트는 0 (발송 없음)
    expect(json.dispatched).toBe(0);

    // 환경변수 복원
    delete process.env.SMS_OPT_OUT_080;
  });
});
