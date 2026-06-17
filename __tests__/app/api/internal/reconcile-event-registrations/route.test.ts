/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';

const mockValidate = jest.fn();
const mockRpc = jest.fn();
const mockFetchPayment = jest.fn();
const mockCancelPayment = jest.fn();
const mockNotifyEmail = jest.fn();
const mockSendSms = jest.fn();
const mockSendEmail = jest.fn();

// supabase 쿼리 빌더 모킹: select 체인은 selectResult, update 체인은 {error:null}.
let selectResult: { data: unknown[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};
const updateCalls: Array<Record<string, unknown>> = [];

function makeBuilder() {
  const builder: Record<string, unknown> = { _isUpdate: false };
  const ret = () => builder;
  builder.select = jest.fn(ret);
  builder.in = jest.fn(ret);
  builder.gt = jest.fn(ret);
  builder.lt = jest.fn(ret);
  builder.eq = jest.fn(ret);
  builder.update = jest.fn((payload: Record<string, unknown>) => {
    builder._isUpdate = true;
    updateCalls.push(payload);
    return builder;
  });
  builder.then = (resolve: (v: unknown) => void) =>
    resolve(builder._isUpdate ? { error: null } : selectResult);
  return builder;
}

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    from: jest.fn(() => makeBuilder()),
    rpc: (...a: unknown[]) => mockRpc(...a),
  })),
}));
jest.mock('@/lib/security/internal-cron-auth', () => ({
  validateInternalCronRequest: (...a: unknown[]) => mockValidate(...a),
}));
jest.mock('@/lib/integrations/toss/confirm', () => ({
  fetchPaymentByOrderId: (...a: unknown[]) => mockFetchPayment(...a),
}));
jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: (...a: unknown[]) => mockCancelPayment(...a),
}));
jest.mock('@/lib/notify', () => ({ notifyEmail: (...a: unknown[]) => mockNotifyEmail(...a) }));
jest.mock('@/lib/events/notify', () => ({
  sendEventSms: (...a: unknown[]) => mockSendSms(...a),
  sendEventEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

function req() {
  return new NextRequest('https://www.saf2026.com/api/internal/reconcile-event-registrations');
}

const REG = {
  id: 'reg-1',
  order_no: 'EVT-AAAA1111BBBB2222',
  status: 'pending',
  amount: 30000,
  party_size: 1,
  applicant_name: '이승곤',
  phone: '01012345678',
  email: 'a@b.com',
  reconcile_attempts: 0,
};

async function run() {
  const { GET } = await import('@/app/api/internal/reconcile-event-registrations/route');
  return GET(req());
}

describe('reconcile-event-registrations cron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateCalls.length = 0;
    selectResult = { data: [], error: null };
    mockValidate.mockReturnValue(null); // 인증 통과
    mockCancelPayment.mockResolvedValue({ success: true, data: {} });
    mockRpc.mockResolvedValue({ data: { ok: true, code: 'CONFIRMED' }, error: null });
    mockFetchPayment.mockResolvedValue({ status: 'DONE', paymentKey: 'pk_1' });
  });

  it('인증 실패 시 그대로 반환(401)', async () => {
    mockValidate.mockReturnValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await run();
    expect(res.status).toBe(401);
    expect(mockFetchPayment).not.toHaveBeenCalled();
  });

  it('대상 0건이면 reconciled 0', async () => {
    selectResult = { data: [], error: null };
    const res = await run();
    expect(await res.json()).toEqual({ reconciled: 0, checked: 0 });
  });

  it('pending + Toss DONE + 좌석 확정(CONFIRMED) → 확정 알림, 환불 없음', async () => {
    selectResult = { data: [{ ...REG }], error: null };
    const res = await run();
    expect(mockRpc).toHaveBeenCalledWith('confirm_event_registration', {
      p_order_no: REG.order_no,
      p_payment_key: 'pk_1',
      p_amount: 30000,
    });
    expect(mockSendSms).toHaveBeenCalledWith(
      REG.phone,
      'payment_confirmed',
      expect.objectContaining({ name: '이승곤' }),
      REG.order_no
    );
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect((await res.json()).reconciled).toBe(1);
  });

  it('확정 고객 알림 Promise가 settle될 때까지 응답을 반환하지 않는다', async () => {
    selectResult = { data: [{ ...REG }], error: null };
    let releaseSms!: () => void;
    const smsPromise = new Promise<{ ok: boolean; skipped: boolean }>((resolve) => {
      releaseSms = () => resolve({ ok: true, skipped: false });
    });
    mockSendSms.mockReturnValueOnce(smsPromise);

    let settled = false;
    const responsePromise = run().then((res) => {
      settled = true;
      return res;
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockSendSms).toHaveBeenCalled();
    expect(settled).toBe(false);

    releaseSms();
    const res = await responsePromise;
    expect(settled).toBe(true);
    expect((await res.json()).reconciled).toBe(1);
  });

  it('pending + DONE + 매진(SOLD_OUT) → 환불 + cancelled + 환불 알림', async () => {
    selectResult = { data: [{ ...REG }], error: null };
    mockRpc.mockResolvedValue({ data: { ok: false, code: 'SOLD_OUT' }, error: null });
    const res = await run();
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pk_1',
      expect.any(Object),
      `event-reconcile-refund-${REG.order_no}`,
      'domestic'
    );
    expect(updateCalls).toContainEqual(expect.objectContaining({ status: 'cancelled' }));
    expect(mockSendSms).toHaveBeenCalledWith(
      REG.phone,
      'refunded',
      expect.any(Object),
      REG.order_no
    );
    expect((await res.json()).reconciled).toBe(1);
  });

  it('expired + DONE → confirm RPC 호출 없이 곧장 환불', async () => {
    selectResult = { data: [{ ...REG, status: 'expired' }], error: null };
    const res = await run();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockCancelPayment).toHaveBeenCalled();
    expect(mockSendSms).toHaveBeenCalledWith(
      REG.phone,
      'refunded',
      expect.any(Object),
      REG.order_no
    );
    expect((await res.json()).reconciled).toBe(1);
  });

  it('Toss가 DONE 아님 → skip (확정/환불/알림 없음)', async () => {
    selectResult = { data: [{ ...REG }], error: null };
    mockFetchPayment.mockResolvedValue({ status: 'WAITING_FOR_DEPOSIT', paymentKey: 'pk_1' });
    const res = await run();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockSendSms).not.toHaveBeenCalled();
    expect((await res.json()).reconciled).toBe(0);
  });

  it('환불 실패 → attempts 증가 + 최초 1회 운영팀 알림, 환불 알림 안 보냄', async () => {
    selectResult = { data: [{ ...REG, status: 'expired', reconcile_attempts: 0 }], error: null };
    mockCancelPayment.mockResolvedValue({
      success: false,
      error: { code: 'X', message: 'denied' },
    });
    await run();
    expect(updateCalls).toContainEqual(expect.objectContaining({ reconcile_attempts: 1 }));
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('자동 환불 실패'),
      expect.any(Object)
    );
    expect(mockSendSms).not.toHaveBeenCalledWith(
      expect.anything(),
      'refunded',
      expect.anything(),
      expect.anything()
    );
  });
});
