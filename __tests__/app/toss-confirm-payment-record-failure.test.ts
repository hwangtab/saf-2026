import crypto from 'crypto';
import { readFileSync } from 'node:fs';

const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockCreateSupabaseAdminClient = jest.fn();
const mockConfirmPayment = jest.fn();
const mockNotifyEmail = jest.fn();
const mockLogSystemAction = jest.fn();
const mockEnsureTossPaymentRecord = jest.fn();
const mockRecordOrderArtworkSales = jest.fn();

jest.mock('next/server', () => {
  return {
    after: (...args: unknown[]) => mockAfter(...(args as [() => unknown])),
    NextRequest: class {},
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({
        body,
        status: init?.status ?? 200,
        json: async () => body,
      }),
    },
  };
});

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: () => mockCreateSupabaseAdminClient(),
}));

jest.mock('@/lib/integrations/toss/confirm', () => ({
  confirmPayment: (...args: unknown[]) => mockConfirmPayment(...args),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: jest.fn(() => 'api_v1'),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
  sendBuyerEmail: jest.fn(),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({ sendBuyerSms: jest.fn() }));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logSystemAction: (...args: unknown[]) => mockLogSystemAction(...args),
}));

jest.mock('@/lib/utils/get-order-notification-info', () => ({
  buildAdminNotificationFields: jest.fn((_info, fields) => fields),
  getOrderNotificationInfo: jest.fn(async () => null),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: jest.fn(),
}));

jest.mock('@/lib/orders/record-artwork-sales', () => ({
  extractLineItems: jest.fn((order) => order.order_items ?? []),
  recordOrderArtworkSales: (...args: unknown[]) => mockRecordOrderArtworkSales(...args),
}));

jest.mock('@/lib/orders/reservations', () => ({
  releaseReservedArtworksIfUnowned: jest.fn(async () => ({ released: 0 })),
  reserveUniqueArtworksOrRollback: jest.fn(async () => ({ ok: true, reservedArtworkIds: [] })),
}));

jest.mock('@/app/actions/admin-artworks', () => ({
  deriveAndSyncArtworkStatus: jest.fn(),
}));

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

function hashCheckoutToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeConfirmRequest() {
  return {
    headers: { get: jest.fn(() => 'ko-KR,ko;q=0.9') },
    cookies: { get: jest.fn(() => undefined) },
    json: jest.fn(async () => ({
      paymentKey: 'pay-key',
      orderId: 'SAF-001',
      amount: 100000,
      checkoutToken: 'checkout-token',
    })),
  };
}

function createConfirmMock(
  options: {
    orderUpdateRows?: unknown[];
    orderUpdateError?: { message: string } | null;
    latestOrderStatus?: string;
  } = {}
) {
  const {
    orderUpdateRows = [{ id: 'order-1' }],
    orderUpdateError = null,
    latestOrderStatus = 'pending_payment',
  } = options;
  const orderStatusUpdates: string[] = [];
  const order = {
    id: 'order-1',
    total_amount: 100000,
    status: 'pending_payment',
    artwork_id: 'art-1',
    order_no: 'SAF-001',
    buyer_name: '구매자',
    buyer_phone: '01012345678',
    buyer_email: 'buyer@example.com',
    metadata: {
      checkout_token_hash: hashCheckoutToken('checkout-token'),
      locale: 'ko',
    },
    order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
  };

  const makeBuilder = (table: string) => {
    const builder = {
      patch: undefined as Record<string, unknown> | undefined,
      selectedColumns: undefined as string | undefined,
      select: jest.fn((columns?: string) => {
        builder.selectedColumns = columns;
        return builder;
      }),
      eq: jest.fn(() => builder),
      in: jest.fn(() => builder),
      is: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      update: jest.fn((patch: Record<string, unknown>) => {
        builder.patch = patch;
        if (table === 'orders' && typeof patch.status === 'string') {
          orderStatusUpdates.push(patch.status);
        }
        return builder;
      }),
      insert: jest.fn(async () => ({ error: { message: 'db down' } })),
      single: jest.fn(async () => ({
        data:
          table === 'orders'
            ? {
                ...order,
                status: builder.selectedColumns === 'id,status' ? latestOrderStatus : order.status,
              }
            : null,
        error: null,
      })),
      maybeSingle: jest.fn(async () => ({ data: null, error: null })),
      then: (
        resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown
      ) => {
        return resolve({
          data: table === 'orders' && builder.patch ? orderUpdateRows : [],
          error: table === 'orders' && builder.patch ? orderUpdateError : null,
        });
      },
    };
    return builder;
  };

  return {
    orderStatusUpdates,
    client: {
      from: jest.fn((table: string) => makeBuilder(table)),
      rpc: jest.fn(async () => ({ data: [{ is_available: true }], error: null })),
    },
  };
}

describe('Toss confirm payment record failure handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmPayment.mockResolvedValue({
      success: true,
      data: {
        paymentKey: 'pay-key',
        orderId: 'SAF-001',
        orderName: 'SAF artwork',
        method: '카드',
        status: 'DONE',
        totalAmount: 100000,
        balanceAmount: 100000,
        currency: 'KRW',
        approvedAt: '2026-06-20T12:00:00+09:00',
        requestedAt: '2026-06-20T11:59:00+09:00',
      },
    });
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: false, error: 'db down' });
    mockRecordOrderArtworkSales.mockResolvedValue({ inserted: true, rows: 1 });
  });

  it('does not mark an order paid when the payment row insert fails after Toss DONE', async () => {
    const supabase = createConfirmMock();
    mockCreateSupabaseAdminClient.mockReturnValue(supabase.client);
    const { POST } = await import('@/app/api/payments/toss/confirm/route');

    const response = await POST(makeConfirmRequest() as never);

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(supabase.orderStatusUpdates).not.toContain('paid');
  });

  it('does not send success notifications when Toss DONE but order status update errors', async () => {
    const supabase = createConfirmMock({
      orderUpdateError: { message: 'orders update failed' },
    });
    mockCreateSupabaseAdminClient.mockReturnValue(supabase.client);
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: true, paymentId: 'pay-1', created: true });

    const { POST } = await import('@/app/api/payments/toss/confirm/route');
    const response = await POST(makeConfirmRequest() as never);

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(mockRecordOrderArtworkSales).not.toHaveBeenCalled();
    expect(
      mockNotifyEmail.mock.calls.some(
        ([type, subject]) => type === 'payment' && subject === '결제 승인 완료'
      )
    ).toBe(false);
  });

  it('does not treat a raced zero-row order update as payment success unless the order is already promoted', async () => {
    const supabase = createConfirmMock({
      orderUpdateRows: [],
      latestOrderStatus: 'cancelled',
    });
    mockCreateSupabaseAdminClient.mockReturnValue(supabase.client);
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: true, paymentId: 'pay-1', created: true });

    const { POST } = await import('@/app/api/payments/toss/confirm/route');
    const response = await POST(makeConfirmRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBeTruthy();
    expect(mockRecordOrderArtworkSales).not.toHaveBeenCalled();
  });

  it('routes Toss DONE promotion through the shared payment lifecycle helper', () => {
    const source = readFileSync('app/api/payments/toss/confirm/route.ts', 'utf8');

    expect(source).toContain('@/lib/commerce/payment-lifecycle/mark-order-paid');
    expect(source).toContain('markOrderPaidWithOutcome({');
    expect(source).not.toContain('recordOrderArtworkSales(supabase');
  });
});
