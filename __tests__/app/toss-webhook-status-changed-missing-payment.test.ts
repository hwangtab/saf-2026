import { readFileSync } from 'node:fs';

const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockCreateSupabaseAdminClient = jest.fn();
const mockFetchPayment = jest.fn();
const mockEnsureTossPaymentRecord = jest.fn();
const mockRecordOrderArtworkSales = jest.fn();

jest.mock('next/server', () => ({
  after: (...args: unknown[]) => mockAfter(...(args as [() => unknown])),
  NextRequest: class {},
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: () => mockCreateSupabaseAdminClient(),
}));

jest.mock('@/lib/integrations/toss/confirm', () => ({
  fetchPayment: (...args: unknown[]) => mockFetchPayment(...args),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: jest.fn(() => 'api_v1'),
}));

jest.mock('@/lib/integrations/toss/webhook', () => ({
  parseWebhookPayload: (payload: unknown) => payload,
  verifyWebhookRequest: jest.fn(() => true),
  verifyDepositCallbackSecret: jest.fn(() => true),
  isDepositCallback: jest.fn((payload) => payload.eventType === 'DEPOSIT_CALLBACK'),
  isPaymentStatusChanged: jest.fn((payload) => payload.eventType === 'PAYMENT_STATUS_CHANGED'),
  isEventOrderId: jest.fn(() => false),
}));

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

jest.mock('@/app/actions/admin-artworks', () => ({
  deriveAndSyncArtworkStatus: jest.fn(),
}));

jest.mock('@/lib/orders/record-artwork-sales', () => ({
  extractLineItems: jest.fn((order) => order.order_items ?? []),
  recordOrderArtworkSales: (...args: unknown[]) => mockRecordOrderArtworkSales(...args),
}));

jest.mock('@/lib/orders/reservations', () => ({
  releaseReservedArtworksIfUnowned: jest.fn(async () => ({ released: 0 })),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: jest.fn(),
  sendBuyerEmail: jest.fn(),
  extractBuyerLocale: jest.fn(() => 'ko'),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({ sendBuyerSms: jest.fn() }));

jest.mock('@/lib/utils/get-order-notification-info', () => ({
  buildAdminNotificationFields: jest.fn((_info, fields) => fields),
  getOrderNotificationInfo: jest.fn(async () => null),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: jest.fn(),
}));

jest.mock('@/lib/server/after-response', () => ({
  runAllSettled: jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
    for (const task of tasks) await task();
  }),
}));

function makeStatusChangedDoneRequest() {
  return {
    json: jest.fn(async () => ({
      eventType: 'PAYMENT_STATUS_CHANGED',
      createdAt: '2026-06-20T12:00:10+09:00',
      data: {
        paymentKey: 'pay-key',
        orderId: 'SAF-001',
        status: 'DONE',
      },
    })),
  };
}

function createWebhookMock() {
  const orderStatusUpdates: string[] = [];
  const state: {
    paymentRow: {
      id: string;
      order_id: string;
      status: string;
      webhook_responses: unknown[];
    } | null;
  } = {
    paymentRow: null,
  };
  const pendingOrder = {
    id: 'order-1',
    status: 'pending_payment',
    artwork_id: 'art-1',
    order_no: 'SAF-001',
    buyer_email: 'buyer@example.com',
    buyer_name: '구매자',
    buyer_phone: '01012345678',
    total_amount: 100000,
    metadata: { locale: 'ko' },
    order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
  };

  const client = {
    orderStatusUpdates,
    insertedPayment: null as Record<string, unknown> | null,
    from: jest.fn((table: string) => {
      const builder = {
        selected: '',
        patch: undefined as Record<string, unknown> | undefined,
        eqs: new Map<string, unknown>(),
        select: jest.fn((selected?: string) => {
          builder.selected = selected ?? '';
          return builder;
        }),
        eq: jest.fn((column: string, value: unknown) => {
          builder.eqs.set(column, value);
          return builder;
        }),
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
        insert: jest.fn((payload: Record<string, unknown>) => {
          client.insertedPayment = payload;
          state.paymentRow = {
            id: 'payment-1',
            order_id: 'order-1',
            status: String(payload.status ?? 'DONE'),
            webhook_responses: [],
          };
          return builder;
        }),
        maybeSingle: jest.fn(async () => {
          if (table === 'payments' && builder.selected.includes('orders!inner')) {
            return { data: null, error: null };
          }
          if (table === 'payments') {
            return { data: state.paymentRow, error: null };
          }
          if (table === 'orders' && builder.eqs.get('order_no') === 'SAF-001') {
            return { data: pendingOrder, error: null };
          }
          return { data: null, error: null };
        }),
        single: jest.fn(async () => {
          if (table === 'payments') {
            if (!state.paymentRow) {
              return { data: null, error: { message: 'not found' } };
            }
            return { data: state.paymentRow, error: null };
          }
          if (table === 'orders') {
            return { data: pendingOrder, error: null };
          }
          return { data: null, error: null };
        }),
        then: (resolve: (value: { data: unknown[] | null; error: null }) => unknown) => {
          const data =
            table === 'orders' && builder.patch
              ? [{ id: 'order-1' }]
              : table === 'payments' && builder.patch
                ? [{ id: 'payment-1' }]
                : null;
          return resolve({ data, error: null });
        },
      };
      return builder;
    }),
  };

  return client;
}

describe('Toss STATUS_CHANGED missing payment row repair', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchPayment.mockResolvedValue({
      paymentKey: 'pay-key',
      orderId: 'SAF-001',
      orderName: 'SAF artwork',
      status: 'DONE',
      method: '카드',
      totalAmount: 100000,
      balanceAmount: 100000,
      currency: 'KRW',
      approvedAt: '2026-06-20T12:00:00+09:00',
      requestedAt: '2026-06-20T11:59:00+09:00',
    });
    mockRecordOrderArtworkSales.mockResolvedValue({ inserted: true, rows: 1 });
  });

  it('creates the missing payment row from verified STATUS_CHANGED DONE before order repair', async () => {
    const supabase = createWebhookMock();
    mockCreateSupabaseAdminClient.mockReturnValue(supabase);
    mockEnsureTossPaymentRecord.mockImplementation(async ({ supabase: client, tossPayment }) => {
      client.from('payments').insert({
        order_id: 'order-1',
        payment_key: tossPayment.paymentKey,
        status: tossPayment.status,
      });
      return { ok: true, paymentId: 'payment-1', created: true };
    });
    const { POST } = await import('@/app/api/webhooks/toss/route');

    const response = await POST(makeStatusChangedDoneRequest() as never);

    expect(response.status).toBe(200);
    expect(supabase.insertedPayment).toEqual(expect.objectContaining({ payment_key: 'pay-key' }));
    expect(supabase.orderStatusUpdates).toContain('paid');
  });

  it('routes STATUS_CHANGED DONE promotion through the shared lifecycle helper', () => {
    const source = readFileSync('app/api/webhooks/toss/route.ts', 'utf8');
    const branchStart = source.indexOf('// PAYMENT_STATUS_CHANGED DONE');
    const branchEnd = source.indexOf("} else if (newStatus === 'CANCELED'", branchStart);
    const statusDoneBranch = source.slice(branchStart, branchEnd);

    expect(statusDoneBranch).toContain('markOrderPaidWithOutcome({');
    expect(statusDoneBranch).not.toContain('recordOrderArtworkSales(');
  });
});
