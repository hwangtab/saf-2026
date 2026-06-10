/** @jest-environment node */
import {
  enqueueSmsBroadcast,
  enqueueIndividualSmsBroadcast,
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
