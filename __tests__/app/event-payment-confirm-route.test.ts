/** @jest-environment node */
import { NextRequest } from 'next/server';

const mockSingle = jest.fn();
const mockRpc = jest.fn();
const mockUpdate = jest.fn();
const mockConfirmPayment = jest.fn();
const mockCancelPayment = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'event_registrations') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: mockSingle,
          update: mockUpdate,
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
    rpc: mockRpc,
  })),
}));

jest.mock('@/lib/integrations/toss/confirm', () => ({
  confirmPayment: (...args: unknown[]) => mockConfirmPayment(...args),
}));

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: (...args: unknown[]) => mockCancelPayment(...args),
}));

jest.mock('@/lib/notify', () => ({ notifyEmail: jest.fn() }));
jest.mock('@/lib/events/notify', () => ({
  sendEventSms: jest.fn(),
  sendEventEmail: jest.fn(),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
// 테스트 환경에는 request scope가 없어 after()가 throw하므로, 콜백을 즉시 실행해 무력화
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  after: (cb: unknown) => (typeof cb === 'function' ? (cb as () => unknown)() : cb),
}));

function request(body: Record<string, unknown>) {
  return new NextRequest('https://www.saf2026.com/api/payments/event/confirm', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('event payment confirm route', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockCancelPayment.mockResolvedValue({ success: true, data: {} });
    mockUpdate.mockReturnValue({
      eq: jest.fn(async () => ({ error: null })),
    });
  });

  it('pending이 아닌 신청은 Toss 승인 전에 거부한다', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'reg-1',
        applicant_name: '홍길동',
        phone: '01012345678',
        email: null,
        party_size: 1,
        amount: 30000,
        status: 'cancelled',
        order_no: 'EVT-ORDER',
      },
      error: null,
    });

    const { POST } = await import('@/app/api/payments/event/confirm/route');
    const res = await POST(request({ paymentKey: 'pk', orderId: 'EVT-ORDER', amount: 30000 }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('invalid_registration_status');
    expect(mockConfirmPayment).not.toHaveBeenCalled();
  });

  it('Toss 승인 후 DB 확정이 INVALID_STATE면 자동 환불한다', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'reg-1',
        applicant_name: '홍길동',
        phone: '01012345678',
        email: null,
        party_size: 1,
        amount: 30000,
        status: 'pending',
        order_no: 'EVT-ORDER',
      },
      error: null,
    });
    mockConfirmPayment.mockResolvedValueOnce({
      success: true,
      data: { paymentKey: 'pay-key', status: 'DONE' },
    });
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: 'INVALID_STATE' }, error: null });

    const { POST } = await import('@/app/api/payments/event/confirm/route');
    const res = await POST(request({ paymentKey: 'pk', orderId: 'EVT-ORDER', amount: 30000 }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe('confirm_failed_refunded');
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pay-key',
      { cancelReason: '신청 상태 확정 실패 - 자동 환불' },
      'event-refund-EVT-ORDER',
      'domestic'
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled', payment_key: 'pay-key' })
    );
  });

  it('자동 환불 API가 실패하면 환불 완료로 응답하지 않는다', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'reg-1',
        applicant_name: '홍길동',
        phone: '01012345678',
        email: null,
        party_size: 1,
        amount: 30000,
        status: 'pending',
        order_no: 'EVT-ORDER',
      },
      error: null,
    });
    mockConfirmPayment.mockResolvedValueOnce({
      success: true,
      data: { paymentKey: 'pay-key', status: 'DONE' },
    });
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: 'SOLD_OUT' }, error: null });
    mockCancelPayment.mockResolvedValueOnce({
      success: false,
      error: { code: 'TOSS_ERROR', message: 'refund failed' },
    });

    const { POST } = await import('@/app/api/payments/event/confirm/route');
    const res = await POST(request({ paymentKey: 'pk', orderId: 'EVT-ORDER', amount: 30000 }));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe('auto_refund_failed');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'expired',
        payment_key: 'pay-key',
        hold_expires_at: null,
      })
    );
  });
});
