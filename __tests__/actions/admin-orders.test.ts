/**
 * admin-orders.ts Server Action 단위 테스트
 *
 * @jest-environment node
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock('next/server', () => ({
  after: (cb: unknown) => (typeof cb === 'function' ? (cb as () => unknown)() : cb),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: jest.fn(),
}));

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: jest.fn(),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: jest.fn(() => 'widget'),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: jest.fn(async () => {}),
}));

jest.mock('@/app/actions/admin-artworks', () => ({
  deriveAndSyncArtworkStatus: jest.fn(async () => {}),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: jest.fn(async () => {}),
  sendBuyerEmail: jest.fn(async () => {}),
  extractBuyerLocale: jest.fn(() => 'ko'),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: jest.fn(async () => {}),
}));

jest.mock('@/lib/utils/get-order-notification-info', () => ({
  getOrderNotificationInfo: jest.fn(async () => null),
  buildAdminNotificationFields: jest.fn(() => ({})),
}));

let mockOrderRow: Record<string, unknown> | null = null;
let mockOrderSelectError: unknown = null;
let mockOrderUpdateRows: Array<{ id: string }> = [{ id: 'ord-1' }];
let mockOrderUpdateError: unknown = null;
let mockSalesResult: unknown = { inserted: true, rows: 1 };
let mockRpcResult: { data: unknown; error: unknown } = {
  data: [{ order_id: 'ord-1', order_no: 'SAF-001', artwork_ids: ['art-1', 'art-2'] }],
  error: null,
};
let mockArtworkUpdateError: { message: string } | null = null;
const capturedOrderUpdates: Array<Record<string, unknown>> = [];
const capturedRpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({
    rpc: jest.fn((name: string, args: Record<string, unknown>) => {
      capturedRpcCalls.push({ name, args });
      return Promise.resolve(mockRpcResult);
    }),
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: mockOrderRow, error: mockOrderSelectError })),
            })),
          })),
          update: jest.fn((patch: Record<string, unknown>) => {
            capturedOrderUpdates.push(patch);
            const select = jest.fn(() =>
              mockOrderUpdateError
                ? { data: null, error: mockOrderUpdateError }
                : { data: mockOrderUpdateRows, error: null }
            );
            const eq: jest.Mock = jest.fn(() => ({ eq, select, error: mockOrderUpdateError }));
            return { eq };
          }),
        };
      }
      if (table === 'artworks') {
        return {
          update: jest.fn(() => {
            const eq: jest.Mock = jest.fn(() => ({ eq, error: mockArtworkUpdateError }));
            return { eq };
          }),
        };
      }
      return {
        select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn() })) })),
        update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) })),
      };
    }),
  })),
}));

jest.mock('@/lib/orders/record-artwork-sales', () => {
  const actual = jest.requireActual('@/lib/orders/record-artwork-sales');
  return {
    ...actual,
    recordOrderArtworkSales: jest.fn(async () => mockSalesResult),
  };
});

let confirmDeposit: typeof import('@/app/actions/admin-orders').confirmDeposit;
let cancelAwaitingOrder: typeof import('@/app/actions/admin-orders').cancelAwaitingOrder;

beforeEach(async () => {
  jest.resetModules();
  mockOrderRow = {
    id: 'ord-1',
    order_no: 'SAF-001',
    status: 'awaiting_deposit',
    artwork_id: null,
    total_amount: 8000000,
    buyer_name: '홍길동',
    buyer_phone: '010-0000-0000',
    buyer_email: 'buyer@example.com',
    metadata: { locale: 'ko' },
    order_items: [
      { artwork_id: 'art-1', quantity: 1, unit_price: 5000000 },
      { artwork_id: 'art-2', quantity: 1, unit_price: 3000000 },
    ],
  };
  mockOrderSelectError = null;
  mockOrderUpdateRows = [{ id: 'ord-1' }];
  mockOrderUpdateError = null;
  mockArtworkUpdateError = null;
  mockSalesResult = { inserted: true, rows: 2 };
  mockRpcResult = {
    data: [{ order_id: 'ord-1', order_no: 'SAF-001', artwork_ids: ['art-1', 'art-2'] }],
    error: null,
  };
  capturedOrderUpdates.length = 0;
  capturedRpcCalls.length = 0;

  const mod = await import('@/app/actions/admin-orders');
  confirmDeposit = mod.confirmDeposit;
  cancelAwaitingOrder = mod.cancelAwaitingOrder;
});

describe('cancelAwaitingOrder', () => {
  it('예약 해제 실패를 운영 알림으로 남긴다', async () => {
    mockOrderRow = {
      id: 'ord-1',
      order_no: 'SAF-001',
      status: 'awaiting_deposit',
      artwork_id: 'art-1',
      total_amount: 5000000,
      buyer_name: '홍길동',
      buyer_phone: '010-0000-0000',
      buyer_email: 'buyer@example.com',
      metadata: { locale: 'ko' },
      order_items: [],
    };
    mockArtworkUpdateError = { message: 'restore failed' };
    const { notifyEmail } = jest.requireMock('@/lib/notify') as { notifyEmail: jest.Mock };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(cancelAwaitingOrder('ord-1', '관리자 취소')).resolves.toEqual({
        success: true,
      });
      expect(notifyEmail).toHaveBeenCalledWith(
        'error',
        '입금대기 주문 취소 후 예약 해제 실패',
        expect.objectContaining({
          주문번호: 'SAF-001',
          작품ID: 'art-1',
          에러: 'restore failed',
        })
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

describe('confirmDeposit', () => {
  it('입금확정은 주문 paid 전환과 판매 기록 생성을 RPC 한 번으로 원자 처리한다', async () => {
    await expect(confirmDeposit('ord-1')).resolves.toEqual({ success: true });

    expect(capturedRpcCalls).toHaveLength(1);
    expect(capturedRpcCalls[0]).toEqual({
      name: 'confirm_bank_transfer_order',
      args: expect.objectContaining({
        p_order_id: 'ord-1',
        p_sold_at: expect.any(String),
      }),
    });
    expect(capturedOrderUpdates).toHaveLength(0);
  });

  it('RPC가 판매 라인 없음/작품 선점 등으로 실패하면 직접 paid 변경이나 보상 롤백 없이 중단한다', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRpcResult = {
      data: null,
      error: { message: 'NO_LINE_ITEMS', code: 'P0001' },
    };

    try {
      await expect(confirmDeposit('ord-1')).rejects.toThrow('판매 기록');

      expect(capturedRpcCalls).toHaveLength(1);
      expect(capturedOrderUpdates).toHaveLength(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
