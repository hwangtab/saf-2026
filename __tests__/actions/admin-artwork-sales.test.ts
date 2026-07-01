const mockRevalidatePath = jest.fn();
const mockRequireAdmin = jest.fn();
const mockRequireAdminClient = jest.fn();
const mockLogAdminAction = jest.fn();
const mockGetString = jest.fn();
const mockValidateSaleInput = jest.fn();
const mockRecordManualArtworkSale = jest.fn();
const mockVoidManualArtworkSale = jest.fn();
const mockRevalidatePublicArtworkDetails = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  requireAdminClient: (...args: unknown[]) => mockRequireAdminClient(...args),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

jest.mock('@/lib/utils/form-helpers', () => ({
  getString: (...args: unknown[]) => mockGetString(...args),
}));

jest.mock('@/lib/actions/artwork-validation', () => ({
  validateSaleInput: (...args: unknown[]) => mockValidateSaleInput(...args),
}));

jest.mock('@/lib/artworks/sales', () => ({
  listArtworkSales: jest.fn(),
  recordManualArtworkSale: (...args: unknown[]) => mockRecordManualArtworkSale(...args),
  updateManualArtworkSale: jest.fn(),
  voidManualArtworkSale: (...args: unknown[]) => mockVoidManualArtworkSale(...args),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkDetails: (...args: unknown[]) =>
    mockRevalidatePublicArtworkDetails(...args),
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
}));

describe('admin artwork sales actions', () => {
  const supabase = { from: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
    mockRequireAdminClient.mockResolvedValue(supabase);
    mockGetString.mockImplementation((formData: FormData, key: string) => {
      const value = formData.get(key);
      return typeof value === 'string' ? value : '';
    });
    mockValidateSaleInput.mockReturnValue(null);
  });

  it('records manual artwork sales with existing validation, audit, and revalidation behavior', async () => {
    const formData = new FormData();
    formData.set('artwork_id', 'art-1');
    formData.set('sale_price', '120000');
    formData.set('quantity', '2');
    formData.set('buyer_name', '홍길동');
    formData.set('buyer_phone', '010-0000-0000');
    formData.set('note', '현장 판매');
    formData.set('sold_at', '2026-07-01T10:00:00.000Z');
    mockRecordManualArtworkSale.mockResolvedValue({ artworkTitle: '봄의 정원' });

    const { recordArtworkSale } = await import('@/app/actions/admin-artwork-sales');

    const result = await recordArtworkSale(formData);

    expect(result).toEqual({ success: true });
    expect(mockValidateSaleInput).toHaveBeenCalledWith('120000', '2');
    expect(mockRecordManualArtworkSale).toHaveBeenCalledWith(supabase, {
      artworkId: 'art-1',
      salePrice: 120000,
      quantity: 2,
      buyerName: '홍길동',
      buyerPhone: '010-0000-0000',
      note: '현장 판매',
      soldAt: '2026-07-01T10:00:00.000Z',
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'artwork_sold',
      'artwork',
      'art-1',
      {
        title: '봄의 정원',
        sale_price: 120000,
        quantity: 2,
        buyer_name: '홍길동',
        buyer_phone: '[set]',
      },
      'admin-1',
      {
        summary: '작품 판매 기록: 봄의 정원 (2점)',
        beforeSnapshot: null,
        afterSnapshot: null,
        reversible: true,
      }
    );
    expect(mockRevalidatePublicArtworkDetails).toHaveBeenCalledWith(['art-1']);
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalledWith();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks/art-1');
  });

  it('voids sales with trimmed domain reason while preserving audit payloads and admin reporting revalidation', async () => {
    mockVoidManualArtworkSale.mockResolvedValue({
      artworkId: 'art-1',
      artworkTitle: '봄의 정원',
      existingSale: {
        sale_price: 120000,
        quantity: 1,
        buyer_name: '홍길동',
        source: 'manual',
      },
    });

    const { voidArtworkSale } = await import('@/app/actions/admin-artwork-sales');

    const result = await voidArtworkSale('sale-1', '  오입력  ');

    expect(result).toEqual({ success: true });
    expect(mockVoidManualArtworkSale).toHaveBeenCalledWith(supabase, {
      saleId: 'sale-1',
      reason: '오입력',
      now: expect.any(String),
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'artwork_sale_voided',
      'artwork',
      'art-1',
      {
        title: '봄의 정원',
        sale_id: 'sale-1',
        reason: '  오입력  ',
        source: 'manual',
      },
      'admin-1',
      {
        summary: '판매 취소: 봄의 정원 (1점, 홍길동)',
        beforeSnapshot: {
          sale_price: 120000,
          quantity: 1,
          buyer_name: '홍길동',
        },
        afterSnapshot: null,
        reversible: false,
      }
    );
    expect(mockRevalidatePublicArtworkDetails).toHaveBeenCalledWith(['art-1']);
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalledWith();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/buyers');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/revenue');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artist-sales');
  });
});
