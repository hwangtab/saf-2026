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

jest.mock('@/lib/artworks/status', () => ({
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
let mockPaymentRow: Record<string, unknown> | null = null;
let mockPaymentUpdateError: unknown = null;
let mockSalesResult: unknown = { inserted: true, rows: 1 };
let mockActiveOrderItemsCountResult: { count: number | null; error: unknown } = {
  count: 0,
  error: null,
};
let mockActiveLegacyOrdersCountResult: { count: number | null; error: unknown } = {
  count: 0,
  error: null,
};
let mockRpcResult: { data: unknown; error: unknown } = {
  data: [{ order_id: 'ord-1', order_no: 'SAF-001', artwork_ids: ['art-1', 'art-2'] }],
  error: null,
};
let mockArtworkUpdateError: { message: string } | null = null;
const capturedOrderUpdates: Array<Record<string, unknown>> = [];
const capturedPaymentUpdates: Array<Record<string, unknown>> = [];
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
        const countQuery = {
          in: jest.fn(() => countQuery),
          then: (resolve: (value: { count: number | null; error: unknown }) => unknown) =>
            resolve(mockActiveLegacyOrdersCountResult),
        };
        return {
          select: jest.fn((_columns?: string, options?: { count?: string; head?: boolean }) => {
            if (options?.count === 'exact' && options.head) return countQuery;
            return {
              eq: jest.fn(() => ({
                single: jest.fn(() => ({ data: mockOrderRow, error: mockOrderSelectError })),
              })),
            };
          }),
          update: jest.fn((patch: Record<string, unknown>) => {
            capturedOrderUpdates.push(patch);
            const select = jest.fn(() =>
              mockOrderUpdateError
                ? { data: null, error: mockOrderUpdateError }
                : { data: mockOrderUpdateRows, error: null }
            );
            const inFn = jest.fn(() => ({ select, error: mockOrderUpdateError }));
            const eq: jest.Mock = jest.fn(() => ({
              eq,
              in: inFn,
              select,
              error: mockOrderUpdateError,
            }));
            return { eq };
          }),
        };
      }
      if (table === 'payments') {
        return {
          select: jest.fn(() => {
            const limit = jest.fn(() => ({
              maybeSingle: jest.fn(() => ({ data: mockPaymentRow, error: null })),
            }));
            const order = jest.fn(() => ({ limit }));
            const eq: jest.Mock = jest.fn(() => ({ eq, order }));
            return { eq };
          }),
          update: jest.fn((patch: Record<string, unknown>) => {
            capturedPaymentUpdates.push(patch);
            const eq: jest.Mock = jest.fn(() => ({ eq, error: mockPaymentUpdateError }));
            return { eq };
          }),
        };
      }
      if (table === 'artworks') {
        return {
          update: jest.fn(() => {
            const eq: jest.Mock = jest.fn(() => ({
              eq,
              select: jest.fn(() =>
                mockArtworkUpdateError
                  ? { data: null, error: mockArtworkUpdateError }
                  : { data: [{ id: 'art-1' }], error: null }
              ),
              error: mockArtworkUpdateError,
            }));
            return { eq };
          }),
        };
      }
      if (table === 'order_items') {
        const query = {
          in: jest.fn(() => query),
          then: (resolve: (value: { count: number | null; error: unknown }) => unknown) =>
            resolve(mockActiveOrderItemsCountResult),
        };
        return {
          select: jest.fn(() => query),
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
let confirmDepositBatch: typeof import('@/app/actions/admin-orders').confirmDepositBatch;
let cancelAwaitingOrder: typeof import('@/app/actions/admin-orders').cancelAwaitingOrder;
let refundOrder: typeof import('@/app/actions/admin-orders').refundOrder;

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
  mockPaymentRow = null;
  mockPaymentUpdateError = null;
  mockActiveOrderItemsCountResult = { count: 0, error: null };
  mockActiveLegacyOrdersCountResult = { count: 0, error: null };
  mockArtworkUpdateError = null;
  mockSalesResult = { inserted: true, rows: 2 };
  mockRpcResult = {
    data: [{ order_id: 'ord-1', order_no: 'SAF-001', artwork_ids: ['art-1', 'art-2'] }],
    error: null,
  };
  capturedOrderUpdates.length = 0;
  capturedPaymentUpdates.length = 0;
  capturedRpcCalls.length = 0;

  const mod = await import('@/app/actions/admin-orders');
  confirmDeposit = mod.confirmDeposit;
  confirmDepositBatch = mod.confirmDepositBatch;
  cancelAwaitingOrder = mod.cancelAwaitingOrder;
  refundOrder = mod.refundOrder;
});

describe('cancelAwaitingOrder', () => {
  it('입금대기 관리자 취소 action은 domain mutation에 shared lifecycle을 위임한다', () => {
    const fs = jest.requireActual('node:fs') as typeof import('node:fs');
    const path = jest.requireActual('node:path') as typeof import('node:path');
    const source = fs.readFileSync(path.join(process.cwd(), 'app/actions/admin-orders.ts'), 'utf8');
    const start = source.indexOf('export async function cancelAwaitingOrder');
    const end = source.indexOf('\nexport async function setOrderEscalation', start);
    const cancelAwaitingSlice = source.slice(start, end);
    const domainSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/orders/admin-awaiting-cancel.ts'),
      'utf8'
    );

    expect(cancelAwaitingSlice).toContain('cancelAwaitingOrderMutation(supabase, {');
    expect(cancelAwaitingSlice).not.toContain('cancelAwaitingDepositOrder({');
    expect(cancelAwaitingSlice).not.toContain('releaseReservedArtworksIfUnowned(');
    expect(cancelAwaitingSlice).not.toContain('extractLineItems(');
    expect(domainSource).toContain('cancelAwaitingDepositOrder({');
  });

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

describe('refundOrder', () => {
  it('관리자 환불 action은 domain mutation에 내부 refunded 동기화를 위임한다', () => {
    const fs = jest.requireActual('node:fs') as typeof import('node:fs');
    const path = jest.requireActual('node:path') as typeof import('node:path');
    const source = fs.readFileSync(path.join(process.cwd(), 'app/actions/admin-orders.ts'), 'utf8');
    const start = source.indexOf('export async function refundOrder');
    const end = source.indexOf('\nconst VALID_STATUS_TRANSITIONS', start);
    const refundOrderSlice = source.slice(start, end);
    const domainSource = fs.readFileSync(
      path.join(process.cwd(), 'lib/orders/admin-refund.ts'),
      'utf8'
    );

    expect(refundOrderSlice).toContain('refundOrderMutation(supabase, {');
    expect(refundOrderSlice).not.toContain('markOrderRefundedAfterCancel({');
    expect(refundOrderSlice).not.toContain('cancelPayment(');
    expect(refundOrderSlice).not.toContain(".from('artwork_sales')");
    expect(refundOrderSlice).not.toContain('deriveAndSyncArtworkStatus(');
    expect(domainSource).toContain('markOrderRefundedAfterCancel({');
    expect(domainSource).toContain('cancelPayment(');
  });

  it('관리자 환불에서 Toss 취소 성공 후 주문 refunded 전환이 실패하면 운영 알림을 남긴다', async () => {
    mockOrderRow = {
      id: 'ord-1',
      order_no: 'SAF-001',
      status: 'paid',
      artwork_id: 'art-1',
      total_amount: 5000000,
      buyer_name: '홍길동',
      buyer_phone: '010-0000-0000',
      buyer_email: 'buyer@example.com',
      metadata: { locale: 'ko' },
      order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 5000000 }],
    };
    mockPaymentRow = { id: 'pay-1', payment_key: 'pk_test', status: 'DONE', method: '카드' };
    mockOrderUpdateRows = [];

    const { cancelPayment } = jest.requireMock('@/lib/integrations/toss/cancel') as {
      cancelPayment: jest.Mock;
    };
    cancelPayment.mockResolvedValue({ success: true });
    const { notifyEmail } = jest.requireMock('@/lib/notify') as { notifyEmail: jest.Mock };

    await expect(refundOrder({ orderId: 'ord-1', cancelReason: '관리자 환불' })).resolves.toEqual({
      success: false,
      error: 'ORDER_REFUND_SYNC_FAILED',
    });

    expect(notifyEmail).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('Toss 취소 후 주문 상태 반영 실패'),
      expect.objectContaining({ 주문번호: 'SAF-001', paymentKey: 'pk_test' })
    );
    // order update가 먼저 실패하므로 payment 레코드는 건드리지 않아야 한다 — 역순 처리로 인한
    // stuck-order(주문 PAID + payment CANCELED) 방지
    expect(capturedPaymentUpdates).toEqual([]);
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

describe('confirmDepositBatch', () => {
  it('여러 주문을 순차 확인하고 성공 목록을 반환한다', async () => {
    await expect(confirmDepositBatch(['ord-1', 'ord-2'])).resolves.toEqual({
      succeeded: ['ord-1', 'ord-2'],
      failed: [],
    });
    expect(capturedRpcCalls).toHaveLength(2);
  });

  it('개별 실패를 수집하고 나머지 처리를 막지 않는다', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRpcResult = { data: null, error: { message: 'NO_LINE_ITEMS', code: 'P0001' } };
    try {
      const result = await confirmDepositBatch(['ord-1', 'ord-2']);
      expect(result.succeeded).toEqual([]);
      expect(result.failed).toHaveLength(2);
      expect(result.failed.map((f) => f.id)).toEqual(['ord-1', 'ord-2']);
      expect(result.failed[0].error).toContain('판매 기록');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
