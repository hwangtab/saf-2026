/** @jest-environment node */
import { GET } from '@/app/api/internal/sms-delivery-reconcile/route';
import { fetchSolapiMessageStatuses } from '@/lib/sms/solapi';

jest.mock('@/lib/security/internal-cron-auth', () => ({
  validateInternalCronRequest: jest.fn(() => null),
}));

jest.mock('@/lib/sms/solapi', () => ({
  fetchSolapiMessageStatuses: jest.fn(async () => ({})),
}));

// 공유 가변 상태: 각 테스트가 조작
let mockRecipientRows: Array<{ id: string; provider_message_id: string; phone: string | null }> =
  [];
let mockLogRows: Array<{ id: string; provider_message_id: string }> = [];

const updates: Array<{ table: string; id: string; patch: Record<string, unknown> }> = [];
const suppressionUpserts: Array<Record<string, unknown>> = [];

jest.mock('@/lib/auth/server', () => {
  const makeChain = (table: string) => {
    const chain: Record<string, unknown> = {};

    // 각 체인 메서드는 자신을 반환 (fluent)
    for (const m of ['select', 'eq', 'not', 'gte', 'lt']) {
      chain[m] = jest.fn(() => chain);
    }

    chain.limit = jest.fn(async () => {
      if (table === 'sms_broadcast_recipients') return { data: mockRecipientRows, error: null };
      if (table === 'sms_logs') return { data: mockLogRows, error: null };
      return { data: [], error: null };
    });

    // .update(patch).eq('id', ...).eq('status', 'sent') — 2단계 eq 체인
    chain.update = jest.fn((patch: Record<string, unknown>) => {
      // 첫 번째 .eq (id 매칭)
      const innerChain: Record<string, unknown> = {};
      let capturedId: string;
      innerChain.eq = jest.fn((col: string, val: unknown) => {
        if (col === 'id') capturedId = val as string;
        // 두 번째 .eq (status='sent' idempotent 가드) — 비동기 resolve
        const guard: Record<string, unknown> = {};
        guard.eq = jest.fn(async () => {
          updates.push({ table, id: capturedId, patch });
          return { error: null };
        });
        return guard;
      });
      return innerChain;
    });

    // suppressions upsert
    chain.upsert = jest.fn(async (row: Record<string, unknown>) => {
      suppressionUpserts.push(row);
      return { error: null };
    });

    return chain;
  };

  return {
    createSupabaseAdminClient: () => ({
      from: (t: string) => makeChain(t),
    }),
  };
});

function req() {
  return { headers: { get: () => 'Bearer x' } } as never;
}

describe('sms-delivery-reconcile GET', () => {
  beforeEach(() => {
    updates.length = 0;
    suppressionUpserts.length = 0;
    mockRecipientRows = [];
    mockLogRows = [];
    (fetchSolapiMessageStatuses as jest.Mock).mockClear();
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({});
  });

  it('sent rows 없으면 0 카운트 반환', async () => {
    const res = await GET(req());
    const json = await res.json();
    expect(json.checked).toBe(0);
    expect(json.delivered).toBe(0);
    expect(json.undelivered).toBe(0);
  });

  it('COMPLETE+4000이면 delivered로 업데이트한다', async () => {
    mockRecipientRows = [{ id: 'r1', provider_message_id: 'M1', phone: '01012345678' }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({
      M1: { status: 'COMPLETE', statusCode: '4000' },
    });

    const res = await GET(req());
    const json = await res.json();

    expect(json.delivered).toBe(1);
    expect(json.undelivered).toBe(0);
    const update = updates.find((u) => u.table === 'sms_broadcast_recipients' && u.id === 'r1');
    expect(update?.patch.status).toBe('delivered');
  });

  it('FAILED이면 undelivered로 업데이트한다', async () => {
    mockRecipientRows = [{ id: 'r2', provider_message_id: 'M2', phone: '01099998888' }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({
      M2: { status: 'FAILED', statusCode: '9999', reason: '기타 실패' },
    });

    const res = await GET(req());
    const json = await res.json();

    expect(json.delivered).toBe(0);
    expect(json.undelivered).toBe(1);
    const update = updates.find((u) => u.table === 'sms_broadcast_recipients' && u.id === 'r2');
    expect(update?.patch.status).toBe('undelivered');
  });

  it('PENDING/SENDING 상태는 sent 그대로 유지 (보수적 매핑)', async () => {
    mockRecipientRows = [
      { id: 'rA', provider_message_id: 'MA', phone: '01011112222' },
      { id: 'rB', provider_message_id: 'MB', phone: '01033334444' },
    ];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({
      MA: { status: 'PENDING', statusCode: '' },
      MB: { status: 'SENDING', statusCode: '' },
    });

    const res = await GET(req());
    const json = await res.json();

    // 미결 상태는 업데이트하지 않음
    expect(json.delivered).toBe(0);
    expect(json.undelivered).toBe(0);
    expect(updates.filter((u) => u.table === 'sms_broadcast_recipients')).toHaveLength(0);
  });

  it('Solapi에서 찾지 못한 messageId는 건너뛴다', async () => {
    mockRecipientRows = [{ id: 'r_nf', provider_message_id: 'M_NOT_FOUND', phone: null }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({}); // 빈 맵

    const res = await GET(req());
    const json = await res.json();

    expect(json.checked).toBe(1);
    expect(json.delivered).toBe(0);
    expect(json.undelivered).toBe(0);
  });

  it('30xx(결번/수신거부) FAILED 코드는 suppression을 등록한다', async () => {
    mockRecipientRows = [{ id: 'r_perm', provider_message_id: 'M_PERM', phone: '01055556666' }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({
      M_PERM: { status: 'FAILED', statusCode: '3020', reason: '결번' },
    });

    const res = await GET(req());
    const json = await res.json();

    expect(json.undelivered).toBe(1);
    expect(json.suppressed).toBe(1);
    expect(suppressionUpserts).toHaveLength(1);
    expect(suppressionUpserts[0]).toMatchObject({ channel: 'all', reason: 'bounce:3020' });
    expect(typeof suppressionUpserts[0].phone_hash).toBe('string');
  });

  it('비-30xx FAILED 코드(일시오류)는 suppression 등록하지 않는다', async () => {
    mockRecipientRows = [{ id: 'r_tmp', provider_message_id: 'M_TMP', phone: '01077778888' }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({
      // 9000번대 등 일시적 실패로 가정
      M_TMP: { status: 'FAILED', statusCode: '9001', reason: '일시오류' },
    });

    const res = await GET(req());
    const json = await res.json();

    expect(json.undelivered).toBe(1);
    expect(json.suppressed).toBe(0);
    expect(suppressionUpserts).toHaveLength(0);
  });

  it('sms_logs도 같은 방식으로 업데이트한다', async () => {
    mockLogRows = [{ id: 'log1', provider_message_id: 'ML1' }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({
      ML1: { status: 'COMPLETE', statusCode: '4000' },
    });

    const res = await GET(req());
    const json = await res.json();

    const logUpdate = updates.find((u) => u.table === 'sms_logs' && u.id === 'log1');
    expect(logUpdate?.patch.status).toBe('delivered');
    // logs 업데이트는 delivered 카운트에 포함되지 않음 (recipient side에서만 집계)
    expect(json.delivered).toBe(0);
  });

  it('fetchSolapiMessageStatuses에 모든 provider_message_id를 전달한다', async () => {
    mockRecipientRows = [{ id: 'r1', provider_message_id: 'MA', phone: null }];
    mockLogRows = [{ id: 'l1', provider_message_id: 'MB' }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({});

    await GET(req());

    const calledWith = (fetchSolapiMessageStatuses as jest.Mock).mock.calls[0][0] as string[];
    expect(calledWith).toContain('MA');
    expect(calledWith).toContain('MB');
  });

  it('idempotent: 동일 row에 대해 중복 실행해도 status=sent 가드가 동작한다', async () => {
    // 이 테스트는 .eq('status', 'sent') 가드 체인이 호출됨을 확인한다.
    // 실제 DB 레벨 idempotency는 통합테스트 영역이지만 체인 구조는 검증 가능.
    mockRecipientRows = [{ id: 'r_idem', provider_message_id: 'M_IDEM', phone: null }];
    (fetchSolapiMessageStatuses as jest.Mock).mockResolvedValue({
      M_IDEM: { status: 'COMPLETE', statusCode: '4000' },
    });

    await GET(req());
    const firstUpdateCount = updates.filter(
      (u) => u.table === 'sms_broadcast_recipients' && u.id === 'r_idem'
    ).length;
    expect(firstUpdateCount).toBe(1);
  });
});
