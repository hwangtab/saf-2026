const mockDeriveAndSyncArtworkStatus = jest.fn();

jest.mock('@/lib/artworks/status', () => ({
  deriveAndSyncArtworkStatus: (...args: unknown[]) => mockDeriveAndSyncArtworkStatus(...args),
}));

function buildDepositConfirmationSupabaseMock(options: {
  order: Record<string, unknown> | null;
  orderError?: unknown;
  rpcData?: unknown;
  rpcError?: { message?: string; code?: string } | null;
}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const supabase = {
    rpc: jest.fn((name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({
        data: options.rpcData ?? [{ order_id: 'ord-1', artwork_ids: ['art-1', 'art-2'] }],
        error: options.rpcError ?? null,
      });
    }),
    from: jest.fn((table: string) => {
      if (table !== 'orders') throw new Error(`Unexpected table: ${table}`);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({
              data: options.order,
              error: options.orderError ?? null,
            })),
          })),
        })),
      };
    }),
  };
  return { supabase, rpcCalls };
}

const awaitingOrder = {
  id: 'ord-1',
  order_no: 'SAF-001',
  status: 'awaiting_deposit',
  artwork_id: null,
  total_amount: 800000,
  buyer_name: '홍길동',
  buyer_phone: '010-0000-0000',
  buyer_email: 'buyer@example.com',
  metadata: { locale: 'ko' },
  order_items: [
    { artwork_id: 'art-1', quantity: 1, unit_price: 500000 },
    { artwork_id: 'art-2', quantity: 1, unit_price: 300000 },
  ],
};

describe('admin order deposit confirmation mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeriveAndSyncArtworkStatus.mockResolvedValue(undefined);
  });

  it('confirms awaiting deposit orders through the RPC and resyncs returned artwork ids', async () => {
    const { confirmDepositMutation } = await import('@/lib/orders/deposit-confirmation');
    const { supabase, rpcCalls } = buildDepositConfirmationSupabaseMock({
      order: awaitingOrder,
      rpcData: [{ order_id: 'ord-1', artwork_ids: ['art-1', 'art-2', null, ''] }],
    });

    const result = await confirmDepositMutation(supabase as never, {
      orderId: 'ord-1',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      order: awaitingOrder,
      artworkIds: ['art-1', 'art-2'],
    });
    expect(rpcCalls).toEqual([
      {
        name: 'confirm_bank_transfer_order',
        args: {
          p_order_id: 'ord-1',
          p_sold_at: '2026-06-30T05:00:00.000Z',
        },
      },
    ]);
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledTimes(2);
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenNthCalledWith(1, supabase, 'art-1');
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenNthCalledWith(2, supabase, 'art-2');
  });

  it('rejects non-awaiting orders before calling the RPC', async () => {
    const { confirmDepositMutation } = await import('@/lib/orders/deposit-confirmation');
    const { supabase, rpcCalls } = buildDepositConfirmationSupabaseMock({
      order: { ...awaitingOrder, status: 'paid' },
    });

    await expect(
      confirmDepositMutation(supabase as never, {
        orderId: 'ord-1',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('입금 확인은 입금 대기 상태에서만 가능합니다. (현재 상태: paid)');
    expect(rpcCalls).toHaveLength(0);
  });

  it('maps UNIQUE_EDITION_TAKEN RPC errors to the operator conflict message', async () => {
    const { confirmDepositMutation } = await import('@/lib/orders/deposit-confirmation');
    const { supabase } = buildDepositConfirmationSupabaseMock({
      order: awaitingOrder,
      rpcData: null,
      rpcError: { message: 'UNIQUE_EDITION_TAKEN', code: 'P0001' },
    });

    await expect(
      confirmDepositMutation(supabase as never, {
        orderId: 'ord-1',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow(
      '이미 다른 주문이 결제 완료한 작품입니다. 이 주문은 입금 확인할 수 없으니 구매자에게 환불을 안내해 주세요.'
    );
  });

  it('fails when the RPC returns no artwork ids', async () => {
    const { confirmDepositMutation } = await import('@/lib/orders/deposit-confirmation');
    const { supabase } = buildDepositConfirmationSupabaseMock({
      order: awaitingOrder,
      rpcData: [{ order_id: 'ord-1', artwork_ids: [] }],
    });

    await expect(
      confirmDepositMutation(supabase as never, {
        orderId: 'ord-1',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow(
      '판매 기록 생성에 실패해 입금 확인을 중단했습니다. 작품 판매 상태와 주문을 확인해 주세요.'
    );
    expect(mockDeriveAndSyncArtworkStatus).not.toHaveBeenCalled();
  });
});
