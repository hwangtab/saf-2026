const mockRevalidatePath = jest.fn();
const mockRequireAdmin = jest.fn();
const mockRequireAdminClient = jest.fn();
const mockLogAdminAction = jest.fn();
const mockValidateBatchSize = jest.fn();
const mockDeleteAdminTagMutation = jest.fn();
const mockAddAdminTagToArtworksMutation = jest.fn();

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
  validateBatchSize: (...args: unknown[]) => mockValidateBatchSize(...args),
}));

jest.mock('@/lib/artworks/admin-tags', () => ({
  listAdminTags: jest.fn(),
  listArtworkAdminTags: jest.fn(),
  createAdminTagMutation: jest.fn(),
  updateAdminTagMutation: jest.fn(),
  archiveAdminTagMutation: jest.fn(),
  restoreAdminTagMutation: jest.fn(),
  deleteAdminTagMutation: (...args: unknown[]) => mockDeleteAdminTagMutation(...args),
  createAndAttachAdminTagToArtworkMutation: jest.fn(),
  addAdminTagToArtworksMutation: (...args: unknown[]) => mockAddAdminTagToArtworksMutation(...args),
  removeAdminTagFromArtworksMutation: jest.fn(),
}));

describe('admin artwork tag actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
    mockRequireAdminClient.mockResolvedValue({ from: jest.fn() });
  });

  it('revalidates linked artwork admin paths and preserves audit snapshots when deleting a tag', async () => {
    const { deleteAdminTag } = await import('@/app/actions/admin-artwork-tags');
    mockDeleteAdminTagMutation.mockResolvedValue({
      tag: { id: 'tag-1', name: 'VIP' },
      links: [{ artwork_id: 'art-1', tag_id: 'tag-1' }],
      artworkIds: ['art-1', 'art-2'],
      result: { success: true, tagId: 'tag-1', artworkIds: ['art-1', 'art-2'], count: 2 },
    });

    const result = await deleteAdminTag('tag-1');

    expect(result).toEqual({
      success: true,
      tagId: 'tag-1',
      artworkIds: ['art-1', 'art-2'],
      count: 2,
    });
    expect(mockDeleteAdminTagMutation).toHaveBeenCalledWith(expect.anything(), { id: 'tag-1' });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks/art-2');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'admin_tag_deleted',
      'admin_tag',
      'tag-1',
      { name: 'VIP', artwork_count: 2 },
      'admin-1',
      {
        summary: '관리자 태그 영구 삭제: VIP (2개 작품 연결 제거)',
        beforeSnapshot: {
          tag: { id: 'tag-1', name: 'VIP' },
          links: [{ artwork_id: 'art-1', tag_id: 'tag-1' }],
        },
        afterSnapshot: null,
        reversible: false,
      }
    );
  });

  it('returns immediately for empty bulk tag additions without auth or mutation calls', async () => {
    const { addAdminTagToArtworks } = await import('@/app/actions/admin-artwork-tags');

    const result = await addAdminTagToArtworks([], 'tag-1');

    expect(result).toEqual({ success: true, count: 0 });
    expect(mockValidateBatchSize).not.toHaveBeenCalled();
    expect(mockRequireAdmin).not.toHaveBeenCalled();
    expect(mockRequireAdminClient).not.toHaveBeenCalled();
    expect(mockAddAdminTagToArtworksMutation).not.toHaveBeenCalled();
  });

  it('validates batch size, revalidates affected admin paths, and logs bulk tag additions', async () => {
    const { addAdminTagToArtworks } = await import('@/app/actions/admin-artwork-tags');
    mockAddAdminTagToArtworksMutation.mockResolvedValue({
      tag: { id: 'tag-1', name: 'VIP' },
      rows: [
        { artwork_id: 'art-1', tag_id: 'tag-1' },
        { artwork_id: 'art-2', tag_id: 'tag-1' },
      ],
      result: { success: true, count: 2 },
    });

    const result = await addAdminTagToArtworks(['art-1', 'art-2'], 'tag-1');

    expect(result).toEqual({ success: true, count: 2 });
    expect(mockValidateBatchSize).toHaveBeenCalledWith(['art-1', 'art-2']);
    expect(mockAddAdminTagToArtworksMutation).toHaveBeenCalledWith(expect.anything(), {
      artworkIds: ['art-1', 'art-2'],
      tagId: 'tag-1',
      adminId: 'admin-1',
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/artworks/art-2');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'artwork_admin_tag_added',
      'artwork',
      'art-1,art-2',
      { count: 2, tag_id: 'tag-1', tag_name: 'VIP' },
      'admin-1',
      {
        summary: '작품 내부 태그 추가: VIP (2건)',
        afterSnapshot: { artwork_ids: ['art-1', 'art-2'], tag: { id: 'tag-1', name: 'VIP' } },
        reversible: false,
      }
    );
  });
});
