const mockEnsureTossPaymentRecord = jest.fn();

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

const verifiedPayment = {
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
};

function buildSupabaseMock({
  orderResult = { data: { id: 'order-1' }, error: null },
  paymentRefetchResult = {
    data: { id: 'payment-refetched', order_id: 'order-1', status: 'DONE', webhook_responses: [] },
    error: null,
  },
}: {
  orderResult?: { data: { id: string } | null; error: unknown };
  paymentRefetchResult?: {
    data: { id: string; order_id: string; status: string; webhook_responses: unknown[] } | null;
    error: unknown;
  };
} = {}) {
  const orderBuilder = {
    select: jest.fn(() => orderBuilder),
    eq: jest.fn(() => orderBuilder),
    maybeSingle: jest.fn(async () => orderResult),
  };
  const paymentBuilder = {
    select: jest.fn(() => paymentBuilder),
    eq: jest.fn(() => paymentBuilder),
    maybeSingle: jest.fn(async () => paymentRefetchResult),
  };
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') return orderBuilder;
      if (table === 'payments') return paymentBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, orderBuilder, paymentBuilder };
}

describe('repairStatusChangedMissingPaymentRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureTossPaymentRecord.mockResolvedValue({
      ok: true,
      paymentId: 'payment-1',
      created: true,
    });
  });

  it('finds the order by Toss order id and returns a payment row when ensure creates one', async () => {
    const { repairStatusChangedMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/status-missing-payment-repair'
    );
    const { supabase, orderBuilder } = buildSupabaseMock();

    const result = await repairStatusChangedMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      verifiedPayment,
    });

    expect(orderBuilder.select).toHaveBeenCalledWith('id');
    expect(orderBuilder.eq).toHaveBeenCalledWith('order_no', 'SAF-001');
    expect(mockEnsureTossPaymentRecord).toHaveBeenCalledWith({
      supabase,
      orderId: 'order-1',
      tossPayment: verifiedPayment,
      idempotencyKey: 'webhook-status-pay-key',
    });
    expect(result).toEqual({
      ok: true,
      paymentRow: {
        id: 'payment-1',
        order_id: 'order-1',
        status: 'DONE',
        webhook_responses: [],
      },
    });
  });

  it('refetches the payment row when ensure reports an existing row without id', async () => {
    const { repairStatusChangedMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/status-missing-payment-repair'
    );
    const { supabase, paymentBuilder } = buildSupabaseMock();
    mockEnsureTossPaymentRecord.mockResolvedValue({
      ok: true,
      paymentId: null,
      created: false,
    });

    const result = await repairStatusChangedMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      verifiedPayment,
    });

    expect(paymentBuilder.select).toHaveBeenCalledWith('id, order_id, status, webhook_responses');
    expect(paymentBuilder.eq).toHaveBeenCalledWith('payment_key', 'pay-key');
    expect(result).toEqual({
      ok: true,
      paymentRow: {
        id: 'payment-refetched',
        order_id: 'order-1',
        status: 'DONE',
        webhook_responses: [],
      },
    });
  });

  it('returns ORDER_FETCH_FAILED when the SAF order cannot be found', async () => {
    const { repairStatusChangedMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/status-missing-payment-repair'
    );
    const { supabase } = buildSupabaseMock({
      orderResult: { data: null, error: { message: 'not found' } },
    });

    const result = await repairStatusChangedMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      verifiedPayment,
    });

    expect(result).toEqual({
      ok: false,
      code: 'ORDER_FETCH_FAILED',
      error: { message: 'not found' },
    });
    expect(mockEnsureTossPaymentRecord).not.toHaveBeenCalled();
  });

  it('returns PAYMENT_RECORD_FAILED when payment row creation fails', async () => {
    const { repairStatusChangedMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/status-missing-payment-repair'
    );
    const { supabase } = buildSupabaseMock();
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: false, error: 'db down' });

    const result = await repairStatusChangedMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      verifiedPayment,
    });

    expect(result).toEqual({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: 'db down',
    });
  });
});
