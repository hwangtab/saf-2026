const mockAfterCallbacks: Array<() => unknown | Promise<unknown>> = [];
const mockRevalidatePath = jest.fn();
const mockRequireAdmin = jest.fn();
const mockRequireAdminClient = jest.fn();
const mockLogAdminAction = jest.fn();
const mockLogSystemAction = jest.fn();
const mockNotifyEmail = jest.fn();
const mockParseAdminArtworkCreateFormData = jest.fn();
const mockParseAdminArtworkDetailsFormData = jest.fn();
const mockCreateAdminArtworkRecordMutation = jest.fn();
const mockUpdateAdminArtworkDetailsMutation = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();
const mockRevalidatePublicArtworkDetails = jest.fn();
const mockResolvePublicArtworkRevalidationConfig = jest.fn();
const mockNormalizeRevalidationArtistNames = jest.fn();

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('next/server', () => ({
  after: (callback: () => unknown | Promise<unknown>) => {
    mockAfterCallbacks.push(callback);
  },
}));

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  requireAdminClient: (...args: unknown[]) => mockRequireAdminClient(...args),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
  logSystemAction: (...args: unknown[]) => mockLogSystemAction(...args),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
}));

jest.mock('@/lib/artworks/details-form', () => ({
  parseAdminArtworkCreateFormData: (...args: unknown[]) =>
    mockParseAdminArtworkCreateFormData(...args),
  parseAdminArtworkDetailsFormData: (...args: unknown[]) =>
    mockParseAdminArtworkDetailsFormData(...args),
}));

jest.mock('@/lib/artworks/details-mutations', () => ({
  createAdminArtworkRecordMutation: (...args: unknown[]) =>
    mockCreateAdminArtworkRecordMutation(...args),
  updateAdminArtworkDetailsMutation: (...args: unknown[]) =>
    mockUpdateAdminArtworkDetailsMutation(...args),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
  revalidatePublicArtworkDetails: (...args: unknown[]) =>
    mockRevalidatePublicArtworkDetails(...args),
}));

jest.mock('@/lib/admin/public-artwork-revalidation', () => ({
  normalizeRevalidationArtistNames: (...args: unknown[]) =>
    mockNormalizeRevalidationArtistNames(...args),
  resolvePublicArtworkRevalidationConfig: (...args: unknown[]) =>
    mockResolvePublicArtworkRevalidationConfig(...args),
}));

describe('admin artwork details actions', () => {
  const supabase = { from: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAfterCallbacks.length = 0;
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
    mockRequireAdminClient.mockResolvedValue(supabase);
    mockNormalizeRevalidationArtistNames.mockImplementation((names: Array<string | null>) =>
      names.filter(Boolean)
    );
    mockResolvePublicArtworkRevalidationConfig.mockReturnValue({
      ok: true,
      baseUrl: 'https://saf.test',
      cronSecret: 'cron-secret',
    });
    Object.assign(global, {
      fetch: jest.fn().mockResolvedValue({ ok: true, status: 200 }),
    });
  });

  it('creates an artwork, revalidates the admin list immediately, and schedules public cache refresh after the response', async () => {
    const details = { title: '봄의 정원', images: ['https://img.test/art.jpg'] };
    const artwork = { id: 'art-1', title: '봄의 정원' };
    const formData = new FormData();
    mockParseAdminArtworkCreateFormData.mockReturnValue(details);
    mockCreateAdminArtworkRecordMutation.mockResolvedValue({
      artwork,
      artistName: '홍길동',
    });

    const { createAdminArtwork } = await import('@/app/actions/admin-artwork-details');

    const result = await createAdminArtwork(formData);

    expect(result).toEqual({ success: true, id: 'art-1' });
    expect(mockCreateAdminArtworkRecordMutation).toHaveBeenCalledWith(supabase, { details });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'artwork_created',
      'artwork',
      'art-1',
      { title: '봄의 정원' },
      'admin-1',
      {
        afterSnapshot: artwork,
        reversible: true,
      }
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks');
    expect(mockRevalidatePublicArtworkSurfaces).not.toHaveBeenCalled();
    expect(mockAfterCallbacks).toHaveLength(1);

    await mockAfterCallbacks[0]();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://saf.test/api/internal/revalidate-artwork-surfaces',
      {
        method: 'POST',
        headers: {
          authorization: 'Bearer cron-secret',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ artistNames: ['홍길동'] }),
      }
    );
    expect(mockNotifyEmail).not.toHaveBeenCalled();
    expect(mockLogSystemAction).not.toHaveBeenCalled();
  });

  it('updates artwork details with the existing public/admin revalidation and audit snapshots', async () => {
    const details = { title: '수정된 정원' };
    const oldArtwork = { id: 'art-1', title: '봄의 정원' };
    const newArtwork = { id: 'art-1', title: '수정된 정원' };
    const formData = new FormData();
    mockParseAdminArtworkDetailsFormData.mockReturnValue(details);
    mockUpdateAdminArtworkDetailsMutation.mockResolvedValue({
      oldArtwork,
      newArtwork,
      artistNames: ['홍길동', '김작가'],
    });

    const { updateArtworkDetails } = await import('@/app/actions/admin-artwork-details');

    const result = await updateArtworkDetails('art-1', formData);

    expect(result).toEqual({ success: true });
    expect(mockUpdateAdminArtworkDetailsMutation).toHaveBeenCalledWith(supabase, {
      id: 'art-1',
      details,
      now: expect.any(String),
    });
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalledWith(['홍길동', '김작가']);
    expect(mockRevalidatePublicArtworkDetails).toHaveBeenCalledWith(['art-1']);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks/art-1');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'artwork_updated',
      'artwork',
      'art-1',
      { title: '수정된 정원' },
      'admin-1',
      {
        summary: '작품 수정: 수정된 정원',
        beforeSnapshot: oldArtwork,
        afterSnapshot: newArtwork,
        reversible: true,
      }
    );
  });
});
