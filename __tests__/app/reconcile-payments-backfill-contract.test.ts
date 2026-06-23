/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';

const mockValidateInternalCronRequest = jest.fn();
const mockCreateSupabaseAdminClient = jest.fn();
const mockFetchPaymentByOrderId = jest.fn();
const mockEnsureTossPaymentRecord = jest.fn();

jest.mock('@/lib/security/internal-cron-auth', () => ({
  validateInternalCronRequest: (...args: unknown[]) => mockValidateInternalCronRequest(...args),
}));

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: () => mockCreateSupabaseAdminClient(),
}));

jest.mock('@/lib/integrations/toss/confirm', () => ({
  fetchPaymentByOrderId: (...args: unknown[]) => mockFetchPaymentByOrderId(...args),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: jest.fn(() => 'api_v1'),
}));

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: jest.fn(),
}));

jest.mock('@/app/actions/admin-artworks', () => ({
  deriveAndSyncArtworkStatus: jest.fn(),
}));

jest.mock('@/lib/orders/record-artwork-sales', () => ({
  extractLineItems: jest.fn(() => []),
  recordOrderArtworkSales: jest.fn(async () => ({ inserted: true, rows: 0 })),
}));

jest.mock('@/lib/orders/reservations', () => ({
  reserveUniqueArtworksOrRollback: jest.fn(async () => ({ ok: true, reservedArtworkIds: [] })),
  releaseReservedArtworksIfUnowned: jest.fn(async () => ({ released: 0 })),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: jest.fn(),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: jest.fn(async () => {}),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

type QueryResult = { data: unknown[] | null; error: { message: string } | null };
type OrdersBuilder = ReturnType<typeof createOrdersBuilder>;

const ordersBuilders: OrdersBuilder[] = [];
let queuedOrderResults: QueryResult[] = [];

function createOrdersBuilder(result: QueryResult) {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    lt: jest.fn(() => builder),
    is: jest.fn(() => builder),
    or: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    then: (resolve: (value: QueryResult) => unknown) => resolve(result),
  };
  return builder;
}

function makeSupabase() {
  return {
    from: jest.fn((table: string) => {
      if (table !== 'orders') return createOrdersBuilder({ data: [], error: null });
      const result = queuedOrderResults.shift() ?? { data: [], error: null };
      const builder = createOrdersBuilder(result);
      ordersBuilders.push(builder);
      return builder;
    }),
  };
}

function request(path: string) {
  return new NextRequest(`https://www.saf2026.com${path}`, {
    headers: { authorization: 'Bearer test-cron' },
  });
}

async function run(path: string) {
  const { GET } = await import('@/app/api/internal/reconcile-payments/route');
  return GET(request(path));
}

describe('reconcile-payments missing-payment backfill mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    ordersBuilders.length = 0;
    queuedOrderResults = [];
    mockValidateInternalCronRequest.mockReturnValue(null);
    mockCreateSupabaseAdminClient.mockReturnValue(makeSupabase());
    mockFetchPaymentByOrderId.mockResolvedValue({
      paymentKey: 'pay-1',
      orderId: 'SAF-BACKFILL-1',
      orderName: 'SAF artwork',
      status: 'DONE',
      method: '카드',
      totalAmount: 100000,
      balanceAmount: 100000,
      currency: 'KRW',
      approvedAt: '2026-06-20T10:00:00+09:00',
      requestedAt: '2026-06-20T09:59:00+09:00',
    });
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: true });
  });

  it('requires cron auth before doing Supabase or Toss work', async () => {
    mockValidateInternalCronRequest.mockReturnValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const res = await run('/api/internal/reconcile-payments?scope=missing-payments-backfill');

    expect(res.status).toBe(401);
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(mockFetchPaymentByOrderId).not.toHaveBeenCalled();
  });

  it('selects only missing-payment settled orders before applying the backfill limit', async () => {
    queuedOrderResults = [
      {
        data: [
          {
            id: 'order-1',
            order_no: 'SAF-BACKFILL-1',
            status: 'paid',
            metadata: { payment_provider: 'api_v1' },
          },
        ],
        error: null,
      },
    ];

    const res = await run(
      '/api/internal/reconcile-payments?scope=missing-payments-backfill&lookbackDays=45&limit=2'
    );
    const body = await res.json();

    const query = ordersBuilders[0];
    expect(query.select).toHaveBeenCalledWith(expect.stringContaining('payments!left(id)'));
    expect(query.is).toHaveBeenCalledWith('payments', null);
    expect(query.or).toHaveBeenCalledWith(
      'metadata->>payment_provider.is.null,metadata->>payment_provider.neq.manual_bank_transfer'
    );
    expect(query.limit).toHaveBeenCalledWith(2);
    expect(mockEnsureTossPaymentRecord).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1' })
    );
    expect(body).toEqual(
      expect.objectContaining({
        scope: 'missing-payments-backfill',
        checked: 1,
        reconciled: 1,
      })
    );
  });

  it('uses documented backfill defaults when lookbackDays and limit are omitted', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-20T00:00:00.000Z').getTime());
    queuedOrderResults = [{ data: [], error: null }];

    const res = await run('/api/internal/reconcile-payments?scope=missing-payments-backfill');
    const body = await res.json();

    expect(body).toEqual(
      expect.objectContaining({
        lookbackDays: 30,
        limit: 100,
      })
    );
    expect(ordersBuilders[0].gte).toHaveBeenCalledWith('created_at', '2026-05-21T00:00:00.000Z');
    expect(ordersBuilders[0].limit).toHaveBeenCalledWith(100);
  });

  it('does not report normal manual bank-transfer orders as Toss backfill errors', async () => {
    queuedOrderResults = [
      {
        data: [
          {
            id: 'order-manual',
            order_no: 'SAF-MANUAL',
            status: 'awaiting_deposit',
            metadata: { payment_provider: 'manual_bank_transfer' },
          },
        ],
        error: null,
      },
    ];

    const res = await run('/api/internal/reconcile-payments?scope=missing-payments-backfill');
    const body = await res.json();

    expect(body).toEqual(
      expect.objectContaining({
        checked: 1,
        reconciled: 0,
      })
    );
    expect(body.errors).toBeUndefined();
    expect(mockFetchPaymentByOrderId).not.toHaveBeenCalled();
    expect(mockEnsureTossPaymentRecord).not.toHaveBeenCalled();
  });

  it('reports missing Toss evidence for a settled order instead of silently succeeding', async () => {
    queuedOrderResults = [
      {
        data: [
          {
            id: 'order-2',
            order_no: 'SAF-NO-TOSS',
            status: 'paid',
            metadata: { payment_provider: 'api_v1' },
          },
        ],
        error: null,
      },
    ];
    mockFetchPaymentByOrderId.mockResolvedValue(null);

    const res = await run('/api/internal/reconcile-payments?scope=missing-payments-backfill');
    const body = await res.json();

    expect(body.checked).toBe(1);
    expect(body.reconciled).toBe(0);
    expect(body.errors).toEqual([expect.stringContaining('SAF-NO-TOSS')]);
    expect(body.errors[0]).toEqual(expect.stringContaining('Toss'));
    expect(mockEnsureTossPaymentRecord).not.toHaveBeenCalled();
  });

  it('keeps the normal scheduled cron on the existing 5 to 28 minute window', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-20T00:30:00.000Z').getTime());
    queuedOrderResults = [
      { data: [], error: null },
      { data: [], error: null },
    ];

    const res = await run('/api/internal/reconcile-payments');
    const body = await res.json();

    expect(body).toEqual({ reconciled: 0, checked: 0 });
    expect(ordersBuilders).toHaveLength(2);
    expect(ordersBuilders[0].eq).toHaveBeenCalledWith('status', 'pending_payment');
    expect(ordersBuilders[0].gt).toHaveBeenCalledWith('created_at', '2026-06-20T00:02:00.000Z');
    expect(ordersBuilders[0].lt).toHaveBeenCalledWith('created_at', '2026-06-20T00:25:00.000Z');
    expect(ordersBuilders[1].in).toHaveBeenCalledWith('status', ['paid', 'awaiting_deposit']);
    expect(ordersBuilders[1].gt).toHaveBeenCalledWith('created_at', '2026-06-20T00:02:00.000Z');
    expect(ordersBuilders[1].lt).toHaveBeenCalledWith('created_at', '2026-06-20T00:25:00.000Z');
    expect(ordersBuilders[0].is).not.toHaveBeenCalled();
    expect(ordersBuilders[1].is).not.toHaveBeenCalled();
    expect(mockFetchPaymentByOrderId).not.toHaveBeenCalled();
  });

  it('routes DONE payment promotion through the shared payment lifecycle helper', () => {
    const source = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(source).toContain('@/lib/commerce/payment-lifecycle/mark-order-paid');
    expect(source).toContain('markOrderPaid({');
    expect(source).not.toContain('async function reconcileMissingDoneOrder');
  });
});
