/** @jest-environment node */
import {
  enqueueSmsBroadcast,
  enqueueIndividualSmsBroadcast,
  retryFailedRecipients,
  cancelBroadcast,
} from '@/app/actions/admin-sms-broadcast';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { isNightInKst } from '@/lib/sms/broadcast-body';

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(),
}));
jest.mock('@/app/actions/activity-log-writer', () => ({ logAdminAction: jest.fn() }));
jest.mock('@/lib/sms/audiences/member', () => ({
  MemberSmsAudienceResolver: jest.fn().mockImplementation(() => ({
    resolve: async () => [{ phone: '01011112222', name: 'A', phoneHash: 'h1' }],
  })),
}));
jest.mock('@/lib/sms/audiences/customer', () => ({
  CustomerSmsAudienceResolver: jest.fn().mockImplementation(() => ({
    resolve: async () => [{ phone: '01033334444', name: 'B', phoneHash: 'h2' }],
  })),
}));
jest.mock('@/lib/sms/audiences/petition', () => ({
  PetitionSmsAudienceResolver: jest.fn().mockImplementation(() => ({
    resolve: async () => [{ phone: '01055556666', name: 'C', phoneHash: 'h3' }],
  })),
}));
// 야간 차단 테스트: isNightInKst를 제어
jest.mock('@/lib/sms/broadcast-body', () => {
  const actual = jest.requireActual('@/lib/sms/broadcast-body');
  return { ...actual, isNightInKst: jest.fn(() => false) };
});

const mockClient = requireAdminClient as jest.MockedFunction<typeof requireAdminClient>;
const mockNight = isNightInKst as jest.MockedFunction<typeof isNightInKst>;

// chainable supabase stub. existingBroadcast로 dedup 분기 제어.
function makeSupabase(opts: { existingId?: string | null } = {}) {
  const inserted: Record<string, unknown> = {};
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn(async () => ({
      data: opts.existingId ? { id: opts.existingId } : null,
      error: null,
    })),
    insert: jest.fn((row: Record<string, unknown>) => {
      Object.assign(inserted, row);
      return {
        select: () => ({ single: async () => ({ data: { id: 'bcast-1' }, error: null }) }),
      };
    }),
    update: jest.fn(() => ({ eq: jest.fn(async () => ({ error: null })) })),
  };
  return { client: { from: jest.fn(() => builder) }, inserted, builder };
}

describe('enqueueSmsBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNight.mockReturnValue(false);
    process.env.SMS_OPT_OUT_080 = '080-123-4567'; // 광고 가드 통과 전제(M7)
  });

  it('member 채널: 정보성으로 큐 등록, is_advertisement=false', async () => {
    const { client, inserted } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'member',
      bodyText: '작가님 안내드립니다',
      audienceFilter: { subset: 'all' },
    });
    expect(r.error).toBeFalsy();
    expect(r.broadcastId).toBe('bcast-1');
    expect(inserted.is_advertisement).toBe(false);
  });

  it('customer 채널 광고: 야간이면 차단', async () => {
    mockNight.mockReturnValue(true);
    const { client } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'customer',
      bodyText: '신작 안내\n무료수신거부 080-1',
      audienceFilter: {},
    });
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/야간/);
  });

  it('customer 채널 광고: SMS_OPT_OUT_080 미설정이면 enqueue 거부(M7)', async () => {
    delete process.env.SMS_OPT_OUT_080;
    const { client } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'customer',
      bodyText: '신작이 도착했습니다',
      audienceFilter: {},
    });
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/SMS_OPT_OUT_080/);
  });

  it('customer 채널 광고: (광고) 누락이면 자동 보정 후 등록', async () => {
    const { client, inserted } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'customer',
      bodyText: '신작이 도착했습니다',
      audienceFilter: {},
    });
    expect(r.error).toBeFalsy();
    expect((inserted.body_text as string).startsWith('(광고)')).toBe(true);
    expect(inserted.body_text).toContain('무료수신거부');
  });

  it('5분 내 같은 channel+body면 dedup', async () => {
    const { client } = makeSupabase({ existingId: 'old-1' });
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'member',
      bodyText: '같은 본문',
      audienceFilter: { subset: 'all' },
    });
    expect(r.deduped).toBe(true);
    expect(r.broadcastId).toBe('old-1');
  });

  it('petition 채널: petitionSlug 없으면 에러 반환', async () => {
    const { client } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'petition',
      bodyText: '청원 진행 안내',
      // petitionSlug 미전달
    });
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/petitionSlug/);
  });

  it('petition 채널: 빈 petitionSlug도 에러 반환', async () => {
    const { client } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'petition',
      bodyText: '청원 진행 안내',
      petitionSlug: '',
    });
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/petitionSlug/);
  });

  it('petition 채널: 정보성(is_advertisement=false)으로 큐 등록, audience_filter에 petitionSlug 포함', async () => {
    const { client, inserted } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'petition',
      bodyText: '청원 서명 감사합니다. 결과를 알려드립니다.',
      petitionSlug: 'test-petition-2026',
    });
    expect(r.error).toBeFalsy();
    expect(r.broadcastId).toBe('bcast-1');
    expect(inserted.is_advertisement).toBe(false);
    expect((inserted.audience_filter as Record<string, unknown>).petitionSlug).toBe(
      'test-petition-2026'
    );
  });
});

describe('enqueueIndividualSmsBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNight.mockReturnValue(false);
  });

  it('500명 초과는 차단', async () => {
    const { client } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const contacts = Array.from({ length: 501 }, (_, i) => ({
      phone: `0101111${(1000 + i).toString()}`,
      name: null,
    }));
    const r = await enqueueIndividualSmsBroadcast({
      contacts,
      bodyText: '안내',
      isAdvertisement: false,
    });
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/최대 500/);
  });
});

// ---
// retryFailedRecipients / cancelBroadcast 테스트용 supabase 목 빌더.
// from()이 호출된 테이블에 따라 다른 응답을 반환한다.
function makeRetrySupabase(opts: {
  broadcastStatus?: string;
  failedCount?: number;
  fetchError?: boolean;
}) {
  const { broadcastStatus = 'sent', failedCount = 3, fetchError = false } = opts;

  // 테이블별 체인 빌더
  function makeChain(singleData: unknown, updateError: unknown = null) {
    const chain: Record<string, unknown> = {};
    const fns = ['select', 'eq', 'in', 'update', 'order', 'limit'];
    fns.forEach((fn) => {
      chain[fn] = jest.fn(() => chain);
    });
    chain['single'] = jest.fn(async () => ({
      data: fetchError ? null : singleData,
      error: fetchError ? { message: 'not found' } : null,
    }));
    chain['update'] = jest.fn(() => {
      const inner: Record<string, unknown> = {};
      inner['eq'] = jest.fn(() => inner);
      inner['then'] = jest.fn(async (cb: (v: unknown) => unknown) =>
        cb({ data: null, error: updateError })
      );
      // make it thenable so await works
      return {
        eq: jest.fn(() => ({
          eq: jest.fn(async () => ({ error: updateError })),
          then: undefined,
          // direct await returns the result
        })),
        // for single .eq() chains
        then: undefined,
      };
    });
    return chain;
  }

  const broadcastsChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(async () => ({
      data: fetchError
        ? null
        : { id: 'bcast-1', status: broadcastStatus, failed_count: failedCount },
      error: fetchError ? { message: 'not found' } : null,
    })),
    update: jest.fn(() => ({
      eq: jest.fn(async () => ({ error: null })),
    })),
  };

  const recipientsChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(async () => ({ error: null })),
      })),
    })),
  };

  const client = {
    from: jest.fn((table: string) => {
      if (table === 'sms_broadcasts') return broadcastsChain;
      if (table === 'sms_broadcast_recipients') return recipientsChain;
      return broadcastsChain;
    }),
  };

  return { client, broadcastsChain, recipientsChain };
}

describe('retryFailedRecipients', () => {
  beforeEach(() => jest.clearAllMocks());

  it('failed_count=0이면 에러 반환', async () => {
    const { client } = makeRetrySupabase({ broadcastStatus: 'sent', failedCount: 0 });
    mockClient.mockResolvedValue(client as never);
    const r = await retryFailedRecipients('bcast-1');
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/실패한 수신자가 없습니다/);
  });

  it('status=sending이면 에러 반환 (발송 완료 전 재시도 불가)', async () => {
    const { client } = makeRetrySupabase({ broadcastStatus: 'sending', failedCount: 5 });
    mockClient.mockResolvedValue(client as never);
    const r = await retryFailedRecipients('bcast-1');
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/sent.*failed|발송이 완료된/);
  });

  it('sent 상태 + failed > 0: 수신자 pending 복원 + broadcast queued 설정', async () => {
    const { client, broadcastsChain, recipientsChain } = makeRetrySupabase({
      broadcastStatus: 'sent',
      failedCount: 3,
    });
    mockClient.mockResolvedValue(client as never);
    const r = await retryFailedRecipients('bcast-1');
    expect(r.error).toBeFalsy();
    expect(r.retried).toBe(3);
    // recipients update 호출됨
    expect(recipientsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    );
    // broadcast update 호출됨
    expect(broadcastsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'queued', failed_count: 0 })
    );
  });

  it('failed 상태 + failed > 0: 정상 재시도', async () => {
    const { client } = makeRetrySupabase({ broadcastStatus: 'failed', failedCount: 7 });
    mockClient.mockResolvedValue(client as never);
    const r = await retryFailedRecipients('bcast-1');
    expect(r.error).toBeFalsy();
    expect(r.retried).toBe(7);
  });

  it('브로드캐스트 조회 실패 시 에러 반환', async () => {
    const { client } = makeRetrySupabase({ fetchError: true });
    mockClient.mockResolvedValue(client as never);
    const r = await retryFailedRecipients('bcast-1');
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/찾을 수 없습니다/);
  });
});

describe('cancelBroadcast', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queued → cancelled 로 변경', async () => {
    const { client, broadcastsChain } = makeRetrySupabase({ broadcastStatus: 'queued' });
    mockClient.mockResolvedValue(client as never);
    const r = await cancelBroadcast('bcast-1');
    expect(r.error).toBeFalsy();
    expect(broadcastsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    );
  });

  it('sending → cancelled 로 변경 (cron mid-run 취소)', async () => {
    const { client, broadcastsChain } = makeRetrySupabase({ broadcastStatus: 'sending' });
    mockClient.mockResolvedValue(client as never);
    const r = await cancelBroadcast('bcast-1');
    expect(r.error).toBeFalsy();
    expect(broadcastsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' })
    );
  });

  it('sent 상태면 에러 반환', async () => {
    const { client } = makeRetrySupabase({ broadcastStatus: 'sent' });
    mockClient.mockResolvedValue(client as never);
    const r = await cancelBroadcast('bcast-1');
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/발송 완료.*취소|이미/);
  });

  it('cancelled 상태면 에러 반환', async () => {
    const { client } = makeRetrySupabase({ broadcastStatus: 'cancelled' });
    mockClient.mockResolvedValue(client as never);
    const r = await cancelBroadcast('bcast-1');
    expect(r.error).toBe(true);
  });

  it('브로드캐스트 조회 실패 시 에러 반환', async () => {
    const { client } = makeRetrySupabase({ fetchError: true });
    mockClient.mockResolvedValue(client as never);
    const r = await cancelBroadcast('bcast-1');
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/찾을 수 없습니다/);
  });
});
