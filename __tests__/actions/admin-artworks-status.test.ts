/**
 * 관리자 작품 판매 상태 정책 테스트
 *
 * @jest-environment node
 */

const mockRequireAdmin = jest.fn();
const mockRequireAdminClient = jest.fn();
const mockLogAdminAction = jest.fn(async () => {});
const mockRevalidatePath = jest.fn();
const mockRevalidatePublicArtworkDetails = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  requireAdminClient: (...args: unknown[]) => mockRequireAdminClient(...args),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkDetails: (...args: unknown[]) =>
    mockRevalidatePublicArtworkDetails(...args),
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
}));

jest.mock('@/lib/orders/active-order-guard', () => ({
  hasActiveOrdersForArtworks: jest.fn(async () => false),
}));

function buildDeriveSupabaseMock(options: {
  artwork: Record<string, unknown> | null;
  salesRows?: Array<{ quantity?: number | null }>;
  salesError?: unknown;
}) {
  const updates: Array<Record<string, unknown>> = [];

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'artworks') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({ data: options.artwork, error: null })),
            })),
          })),
          update: jest.fn((patch: Record<string, unknown>) => {
            updates.push(patch);
            return { eq: jest.fn(async () => ({ data: null, error: null })) };
          }),
        };
      }

      if (table === 'artwork_sales') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              is: jest.fn(async () => ({
                data: options.salesRows ?? [],
                error: options.salesError ?? null,
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, updates };
}

function buildBatchSupabaseMock(beforeRows: Array<Record<string, unknown>>) {
  const updates: Array<Record<string, unknown>> = [];
  const selectRows = [
    beforeRows,
    beforeRows.map((row) => ({
      ...row,
      ...updates.reduce((merged, patch) => ({ ...merged, ...patch }), {}),
    })),
  ];

  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'artworks') throw new Error(`Unexpected table: ${table}`);

      return {
        select: jest.fn(() => ({
          in: jest.fn(async () => ({ data: selectRows.shift() ?? [], error: null })),
        })),
        update: jest.fn((patch: Record<string, unknown>) => {
          updates.push(patch);
          return { in: jest.fn(async () => ({ data: null, error: null })) };
        }),
      };
    }),
  };

  return { supabase, updates };
}

describe('deriveAndSyncArtworkStatus manual sold override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
  });

  it('관리자 수동 sold override 작품은 active sale이 없어도 available로 되돌리지 않는다', async () => {
    const { deriveAndSyncArtworkStatus } = await import('@/app/actions/admin-artworks');
    const { supabase, updates } = buildDeriveSupabaseMock({
      artwork: {
        id: 'art-1',
        status: 'sold',
        sold_at: '2026-06-09T04:23:22.360Z',
        edition_type: 'open',
        edition_limit: null,
        manual_sold_override: true,
      },
      salesRows: [],
    });

    await expect(deriveAndSyncArtworkStatus(supabase as never, 'art-1')).resolves.toBe('sold');

    expect(updates).toHaveLength(0);
  });

  it('자동 sold 작품은 active sale이 사라지면 기존처럼 available로 복원한다', async () => {
    const { deriveAndSyncArtworkStatus } = await import('@/app/actions/admin-artworks');
    const { supabase, updates } = buildDeriveSupabaseMock({
      artwork: {
        id: 'art-1',
        status: 'sold',
        sold_at: '2026-06-09T04:23:22.360Z',
        edition_type: 'unique',
        edition_limit: null,
        manual_sold_override: false,
      },
      salesRows: [],
    });

    await expect(deriveAndSyncArtworkStatus(supabase as never, 'art-1')).resolves.toBe('available');

    expect(updates[0]).toMatchObject({
      status: 'available',
      sold_at: null,
      manual_sold_override: false,
    });
  });
});

describe('batchUpdateArtworkStatus manual sold override', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
  });

  it('관리자 sold 변경은 manual_sold_override를 켜고 sold_at 누락 행만 보정한다', async () => {
    const { batchUpdateArtworkStatus } = await import('@/app/actions/admin-artworks');
    const { supabase, updates } = buildBatchSupabaseMock([
      {
        id: 'art-1',
        title: '칼노래',
        status: 'available',
        sold_at: null,
        manual_sold_override: false,
        updated_at: '2026-06-09T04:23:22.360Z',
      },
    ]);
    mockRequireAdminClient.mockResolvedValue(supabase);

    await expect(batchUpdateArtworkStatus(['art-1'], 'sold')).resolves.toMatchObject({
      success: true,
    });

    expect(updates[0]).toMatchObject({ status: 'sold', manual_sold_override: true });
    expect(updates[1]).toMatchObject({ sold_at: expect.any(String) });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'batch_artwork_status',
      'artwork',
      'art-1',
      expect.objectContaining({ status: 'sold' }),
      'admin-1',
      expect.objectContaining({ reversible: true })
    );
  });

  it('관리자 available 변경은 manual_sold_override와 sold_at을 함께 해제한다', async () => {
    const { batchUpdateArtworkStatus } = await import('@/app/actions/admin-artworks');
    const { supabase, updates } = buildBatchSupabaseMock([
      {
        id: 'art-1',
        title: '칼노래',
        status: 'sold',
        sold_at: '2026-06-09T04:23:22.360Z',
        manual_sold_override: true,
        updated_at: '2026-06-09T04:23:22.360Z',
      },
    ]);
    mockRequireAdminClient.mockResolvedValue(supabase);

    await expect(batchUpdateArtworkStatus(['art-1'], 'available')).resolves.toMatchObject({
      success: true,
    });

    expect(updates[0]).toMatchObject({
      status: 'available',
      sold_at: null,
      manual_sold_override: false,
    });
  });
});
