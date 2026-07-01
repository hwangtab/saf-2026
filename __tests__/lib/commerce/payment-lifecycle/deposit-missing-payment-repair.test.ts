const mockFetchPayment = jest.fn();
const mockResolveOrderProvider = jest.fn();
const mockEnsureTossPaymentRecord = jest.fn();

jest.mock('@/lib/integrations/toss/confirm', () => ({
  fetchPayment: (...args: unknown[]) => mockFetchPayment(...args),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: (...args: unknown[]) => mockResolveOrderProvider(...args),
}));

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

const verifiedPayment = {
  paymentKey: 'pay-key',
  orderId: 'SAF-001',
  orderName: 'SAF artwork',
  status: 'DONE',
  method: '가상계좌',
  totalAmount: 100000,
  balanceAmount: 100000,
  currency: 'KRW',
  approvedAt: '2026-06-20T12:00:00+09:00',
  requestedAt: '2026-06-20T11:59:00+09:00',
  virtualAccount: { secret: 'deposit-secret' },
};

function buildSupabaseMock({
  orderResult = {
    data: { id: 'order-1', metadata: { payment_provider: 'domestic' } },
    error: null,
  },
  paymentRefetchResult = {
    data: {
      id: 'payment-refetched',
      order_id: 'order-1',
      webhook_responses: [],
      confirm_response: verifiedPayment,
    },
    error: null,
  },
}: {
  orderResult?: { data: { id: string; metadata: unknown } | null; error: unknown };
  paymentRefetchResult?: {
    data: {
      id: string;
      order_id: string;
      webhook_responses: unknown[];
      confirm_response: unknown;
    } | null;
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

describe('repairDepositCallbackMissingPaymentRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveOrderProvider.mockReturnValue('domestic');
    mockFetchPayment.mockResolvedValue(verifiedPayment);
    mockEnsureTossPaymentRecord.mockResolvedValue({
      ok: true,
      paymentId: 'payment-1',
      created: true,
    });
  });

  it('verifies the Toss payment and returns a payment record when ensure creates one', async () => {
    const { repairDepositCallbackMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-missing-payment-repair'
    );
    const { supabase, orderBuilder } = buildSupabaseMock();

    const result = await repairDepositCallbackMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      webhookOrderId: 'SAF-001',
    });

    expect(orderBuilder.select).toHaveBeenCalledWith('id, metadata');
    expect(orderBuilder.eq).toHaveBeenCalledWith('order_no', 'SAF-001');
    expect(mockResolveOrderProvider).toHaveBeenCalledWith({ payment_provider: 'domestic' });
    expect(mockFetchPayment).toHaveBeenCalledWith('pay-key', 'domestic');
    expect(mockEnsureTossPaymentRecord).toHaveBeenCalledWith({
      supabase,
      orderId: 'order-1',
      tossPayment: verifiedPayment,
      idempotencyKey: 'webhook-deposit-pay-key',
    });
    expect(result).toEqual({
      ok: true,
      provider: 'domestic',
      verifiedPayment,
      paymentRecord: {
        id: 'payment-1',
        order_id: 'order-1',
        webhook_responses: [],
        confirm_response: verifiedPayment,
      },
    });
  });

  it('refetches the payment record when ensure reports an existing row without id', async () => {
    const { repairDepositCallbackMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-missing-payment-repair'
    );
    const { supabase, paymentBuilder } = buildSupabaseMock();
    mockEnsureTossPaymentRecord.mockResolvedValue({
      ok: true,
      paymentId: null,
      created: false,
    });

    const result = await repairDepositCallbackMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      webhookOrderId: 'SAF-001',
    });

    expect(paymentBuilder.select).toHaveBeenCalledWith(
      'id, order_id, webhook_responses, confirm_response'
    );
    expect(paymentBuilder.eq).toHaveBeenCalledWith('payment_key', 'pay-key');
    expect(result).toEqual({
      ok: true,
      provider: 'domestic',
      verifiedPayment,
      paymentRecord: {
        id: 'payment-refetched',
        order_id: 'order-1',
        webhook_responses: [],
        confirm_response: verifiedPayment,
      },
    });
  });

  it('returns VERIFY_FAILED when Toss API does not confirm DONE for the webhook order', async () => {
    const { repairDepositCallbackMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-missing-payment-repair'
    );
    const { supabase } = buildSupabaseMock();
    mockFetchPayment.mockResolvedValue({ ...verifiedPayment, status: 'WAITING_FOR_DEPOSIT' });

    const result = await repairDepositCallbackMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      webhookOrderId: 'SAF-001',
    });

    expect(result).toEqual({
      ok: false,
      code: 'VERIFY_FAILED',
      provider: 'domestic',
      verifiedPayment: { ...verifiedPayment, status: 'WAITING_FOR_DEPOSIT' },
    });
    expect(mockEnsureTossPaymentRecord).not.toHaveBeenCalled();
  });

  it('returns ORDER_FETCH_FAILED when the SAF order cannot be found', async () => {
    const { repairDepositCallbackMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-missing-payment-repair'
    );
    const { supabase } = buildSupabaseMock({
      orderResult: { data: null, error: { message: 'not found' } },
    });

    const result = await repairDepositCallbackMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      webhookOrderId: 'SAF-001',
    });

    expect(result).toEqual({
      ok: false,
      code: 'ORDER_FETCH_FAILED',
      error: { message: 'not found' },
    });
    expect(mockFetchPayment).not.toHaveBeenCalled();
  });

  it('returns PAYMENT_RECORD_FAILED when payment row creation fails', async () => {
    const { repairDepositCallbackMissingPaymentRecord } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-missing-payment-repair'
    );
    const { supabase } = buildSupabaseMock();
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: false, error: 'db down' });

    const result = await repairDepositCallbackMissingPaymentRecord({
      supabase: supabase as never,
      paymentKey: 'pay-key',
      webhookOrderId: 'SAF-001',
    });

    expect(result).toEqual({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      provider: 'domestic',
      error: 'db down',
    });
  });
});
