import crypto from 'crypto';

const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockCreateSupabaseAdminClient = jest.fn();
const mockConfirmPayment = jest.fn();
const mockCancelPayment = jest.fn();
const mockNotifyEmail = jest.fn();
const mockSendBuyerEmail = jest.fn();
const mockSendBuyerSms = jest.fn();
const mockRunAllSettled = jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
  for (const task of tasks) {
    await task();
  }
});
const mockReserveUniqueArtworksOrRollback = jest.fn();

jest.mock('next/server', () => {
  return {
    after: (...args: unknown[]) => mockAfter(...(args as [() => unknown])),
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

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: (...args: unknown[]) => mockCancelPayment(...args),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: jest.fn(() => 'api_v1'),
}));

jest.mock('@/lib/integrations/toss/sanitize', () => ({
  sanitizeConfirmResponse: (value: unknown) => value,
  sanitizeMethodDetail: jest.fn(() => null),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
  sendBuyerEmail: (...args: unknown[]) => mockSendBuyerEmail(...args),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: (...args: unknown[]) => mockSendBuyerSms(...args),
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
  recordOrderArtworkSales: jest.fn(),
}));

jest.mock('@/lib/orders/reservations', () => ({
  reserveUniqueArtworksOrRollback: (...args: unknown[]) =>
    mockReserveUniqueArtworksOrRollback(...args),
}));

jest.mock('@/lib/artworks/status', () => ({
  deriveAndSyncArtworkStatus: jest.fn(),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logSystemAction: jest.fn(),
}));

function hashCheckoutToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSupabaseMock() {
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
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
      inserted: false,
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      in: jest.fn(() => builder),
      update: jest.fn((patch: Record<string, unknown>) => {
        builder.patch = patch;
        updates.push({ table, patch });
        return builder;
      }),
      insert: jest.fn(() => {
        builder.inserted = true;
        return builder;
      }),
      single: jest.fn(async () => ({ data: table === 'orders' ? order : null, error: null })),
      maybeSingle: jest.fn(async () => ({
        data:
          table === 'payments' && builder.inserted
            ? { id: 'payment-1' }
            : table === 'artworks'
              ? { edition_type: 'unique' }
              : null,
        error: null,
      })),
      then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
        const data =
          table === 'orders' && builder.patch
            ? [{ id: 'order-1' }]
            : table === 'artworks' && builder.patch?.status === 'reserved'
              ? []
              : table === 'payments' && builder.patch
                ? [{ id: 'payment-1' }]
                : [];
        return resolve({ data, error: null });
      },
    };
    return builder;
  };

  return {
    updates,
    client: {
      from: jest.fn((table: string) => makeBuilder(table)),
      rpc: jest.fn(async () => ({ data: [{ is_available: true }], error: null })),
    },
  };
}

describe('Toss confirm virtual-account reservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmPayment.mockResolvedValue({
      success: true,
      data: {
        paymentKey: 'pay-key',
        orderId: 'SAF-001',
        method: '가상계좌',
        status: 'WAITING_FOR_DEPOSIT',
        totalAmount: 100000,
        currency: 'KRW',
        approvedAt: null,
        virtualAccount: {
          bankName: '테스트은행',
          accountNumber: '123-456',
          dueDate: '2026-06-20T00:00:00+09:00',
        },
      },
    });
    mockCancelPayment.mockResolvedValue({ success: true, data: { status: 'CANCELED' } });
    mockReserveUniqueArtworksOrRollback.mockResolvedValue({
      ok: false,
      failedArtworkId: 'art-1',
      reservedArtworkIds: [],
    });
  });

  it('cancels the Toss virtual account and suppresses deposit instructions when unique reservation fails', async () => {
    const supabase = createSupabaseMock();
    mockCreateSupabaseAdminClient.mockReturnValue(supabase.client);
    const { POST } = await import('@/app/api/payments/toss/confirm/route');

    const request = {
      headers: { get: jest.fn(() => 'ko-KR,ko;q=0.9') },
      cookies: { get: jest.fn(() => undefined) },
      json: jest.fn(async () => ({
        paymentKey: 'pay-key',
        orderId: 'SAF-001',
        amount: 100000,
        checkoutToken: 'checkout-token',
      })),
    };

    const response = await POST(request as never);

    expect(response.status).toBe(409);
    expect(mockReserveUniqueArtworksOrRollback).toHaveBeenCalledWith(
      supabase.client,
      ['art-1'],
      expect.any(String)
    );
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pay-key',
      expect.objectContaining({ cancelReason: expect.stringContaining('작품 예약 실패') }),
      'auto-cancel-reservation-SAF-001',
      'api_v1'
    );
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'orders',
        patch: expect.objectContaining({ status: 'cancelled' }),
      })
    );
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'payments',
        patch: expect.objectContaining({ status: 'CANCELED' }),
      })
    );
    expect(mockRunAllSettled).not.toHaveBeenCalledWith(
      'tossConfirm.virtualAccountIssued.notifications',
      expect.any(Array)
    );
    expect(mockSendBuyerEmail).not.toHaveBeenCalledWith(
      expect.any(String),
      'virtual_account_issued',
      expect.any(Object),
      expect.any(String)
    );
    expect(mockSendBuyerSms).not.toHaveBeenCalledWith(
      expect.any(String),
      'virtual_account_issued',
      expect.any(Object),
      expect.any(String),
      expect.any(String)
    );
  });
});
