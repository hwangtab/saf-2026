const mockDeriveAndSyncArtworkStatus = jest.fn();

jest.mock('@/lib/artworks/status', () => ({
  deriveAndSyncArtworkStatus: (...args: unknown[]) => mockDeriveAndSyncArtworkStatus(...args),
}));

type QueryResult = { data: unknown; error: { message: string; code?: string } | null };

function createSupabase({
  artwork = {
    id: 'art-1',
    title: '칼노래',
    edition_type: 'limited',
    edition_limit: 3,
  },
  salesRows = [{ id: 'sale-existing', quantity: 2 }],
  existingSale = {
    id: 'sale-1',
    artwork_id: 'art-1',
    source: 'manual',
    sale_price: 100000,
    quantity: 1,
    buyer_name: '기존 구매자',
    buyer_phone: '010-0000-0000',
    note: null,
    sold_at: '2026-06-01T00:00:00.000Z',
  },
  artworkTitle = { title: '칼노래' },
}: {
  artwork?: unknown;
  salesRows?: unknown[];
  existingSale?: unknown;
  artworkTitle?: unknown;
} = {}) {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const tableCalls: string[] = [];
  let artworkSelectCount = 0;

  const supabase = {
    from: jest.fn((table: string) => {
      tableCalls.push(table);

      if (table === 'artworks') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => {
                artworkSelectCount += 1;
                return { data: artworkSelectCount === 1 ? artwork : artworkTitle, error: null };
              }),
            })),
          })),
        };
      }

      if (table === 'artwork_sales') {
        return {
          select: jest.fn((columns?: string) => ({
            eq: jest.fn(() => ({
              is: jest.fn(async () => ({ data: salesRows, error: null })),
              single: jest.fn(async () => ({ data: existingSale, error: null })),
            })),
            order: jest.fn(async () => ({ data: salesRows, error: null })),
            __columns: columns,
          })),
          insert: jest.fn(async (payload: unknown) => {
            inserts.push(payload);
            return { error: null };
          }),
          update: jest.fn((payload: unknown) => {
            updates.push(payload);
            return {
              eq: jest.fn(async () => ({ error: null })),
            };
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, inserts, updates, tableCalls };
}

describe('artwork sales domain mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeriveAndSyncArtworkStatus.mockResolvedValue('sold');
  });

  it('blocks manual sale creation when limited edition capacity would be exceeded', async () => {
    const { recordManualArtworkSale } = await import('@/lib/artworks/sales');
    const { supabase, inserts } = createSupabase();

    await expect(
      recordManualArtworkSale(supabase as never, {
        artworkId: 'art-1',
        salePrice: 100000,
        quantity: 2,
        buyerName: '구매자',
        buyerPhone: '',
        note: '',
        soldAt: '2026-06-30T00:00:00.000Z',
      })
    ).rejects.toThrow('에디션 수량을 초과할 수 없습니다.');

    expect(inserts).toHaveLength(0);
    expect(mockDeriveAndSyncArtworkStatus).not.toHaveBeenCalled();
  });

  it('records a manual sale and syncs artwork status when capacity allows it', async () => {
    const { recordManualArtworkSale } = await import('@/lib/artworks/sales');
    const { supabase, inserts } = createSupabase({
      salesRows: [{ id: 'sale-existing', quantity: 1 }],
    });

    const result = await recordManualArtworkSale(supabase as never, {
      artworkId: 'art-1',
      salePrice: 100000,
      quantity: 2,
      buyerName: '구매자',
      buyerPhone: '',
      note: '',
      soldAt: '2026-06-30T00:00:00.000Z',
    });

    expect(result).toEqual({ artworkId: 'art-1', artworkTitle: '칼노래' });
    expect(inserts).toEqual([
      expect.objectContaining({
        artwork_id: 'art-1',
        sale_price: 100000,
        quantity: 2,
        buyer_name: '구매자',
        buyer_phone: null,
        note: '',
        sold_at: '2026-06-30T00:00:00.000Z',
      }),
    ]);
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase, 'art-1');
  });

  it('blocks updates to Toss-sourced sales records', async () => {
    const { updateManualArtworkSale } = await import('@/lib/artworks/sales');
    const { supabase, updates } = createSupabase({
      existingSale: {
        id: 'sale-1',
        artwork_id: 'art-1',
        source: 'toss',
        sale_price: 100000,
        quantity: 1,
        buyer_name: '구매자',
        buyer_phone: null,
        note: null,
        sold_at: '2026-06-01T00:00:00.000Z',
      },
    });

    await expect(
      updateManualArtworkSale(supabase as never, {
        saleId: 'sale-1',
        artworkId: 'art-1',
        salePrice: 120000,
        quantity: 1,
        buyerName: '수정 구매자',
        buyerPhone: '',
        note: '',
        soldAt: '',
      })
    ).rejects.toThrow('외부 동기화 판매 기록은 수정할 수 없습니다.');

    expect(updates).toHaveLength(0);
    expect(mockDeriveAndSyncArtworkStatus).not.toHaveBeenCalled();
  });

  it('voids a sale and syncs artwork status', async () => {
    const { voidManualArtworkSale } = await import('@/lib/artworks/sales');
    const { supabase, updates } = createSupabase();

    const result = await voidManualArtworkSale(supabase as never, {
      saleId: 'sale-1',
      reason: '관리자 취소',
      now: '2026-06-30T00:00:00.000Z',
    });

    expect(result).toEqual(
      expect.objectContaining({
        artworkId: 'art-1',
        artworkTitle: '칼노래',
        existingSale: expect.objectContaining({ id: 'sale-1' }),
      })
    );
    expect(updates).toEqual([
      { voided_at: '2026-06-30T00:00:00.000Z', void_reason: '관리자 취소' },
    ]);
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase, 'art-1');
  });
});
