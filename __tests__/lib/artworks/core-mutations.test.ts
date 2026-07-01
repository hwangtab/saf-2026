const OLD_IMAGE =
  'https://example.supabase.co/storage/v1/object/public/artworks/art-1/old__original.webp';
const KEEP_IMAGE =
  'https://example.supabase.co/storage/v1/object/public/artworks/art-1/keep__original.webp';
const NEW_IMAGE =
  'https://example.supabase.co/storage/v1/object/public/artworks/art-1/new__original.webp';

function buildImageSupabaseMock(options: {
  before: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  updatedRows: Array<Record<string, unknown>> | null;
  updateError?: unknown;
  removeError?: unknown;
}) {
  const updates: Array<Record<string, unknown>> = [];
  const removeMock = jest.fn(async () => ({ error: options.removeError ?? null }));
  let artworkSelectCall = 0;

  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'artworks') throw new Error(`Unexpected table: ${table}`);

      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => {
              artworkSelectCall += 1;
              return {
                data: artworkSelectCall === 1 ? options.before : options.after,
                error: null,
              };
            }),
          })),
        })),
        update: jest.fn((patch: Record<string, unknown>) => {
          updates.push(patch);
          return {
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(async () => ({
                  data: options.updatedRows,
                  error: options.updateError ?? null,
                })),
              })),
            })),
          };
        }),
      };
    }),
    storage: {
      from: jest.fn(() => ({ remove: removeMock })),
    },
  };

  return { supabase, updates, removeMock };
}

function buildCategorySupabaseMock(before: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = [];
  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'artworks') throw new Error(`Unexpected table: ${table}`);

      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: before, error: null })),
          })),
        })),
        update: jest.fn((patch: Record<string, unknown>) => {
          updates.push(patch);
          return { eq: jest.fn(async () => ({ error: null })) };
        }),
      };
    }),
  };

  return { supabase, updates };
}

describe('artwork core mutations', () => {
  it('updates artwork images with optimistic locking and removes only deleted storage variants', async () => {
    const { updateArtworkImagesMutation } = await import('@/lib/artworks/core-mutations');
    const { supabase, updates, removeMock } = buildImageSupabaseMock({
      before: {
        id: 'art-1',
        title: '칼노래',
        images: [OLD_IMAGE, KEEP_IMAGE],
        updated_at: '2026-06-01T00:00:00.000Z',
      },
      after: {
        id: 'art-1',
        title: '칼노래',
        images: [KEEP_IMAGE, NEW_IMAGE],
        updated_at: '2026-06-30T05:00:00.000Z',
      },
      updatedRows: [{ id: 'art-1' }],
    });

    const result = await updateArtworkImagesMutation(supabase as never, {
      id: 'art-1',
      images: [KEEP_IMAGE, NEW_IMAGE],
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(updates[0]).toEqual({
      images: [KEEP_IMAGE, NEW_IMAGE],
      updated_at: '2026-06-30T05:00:00.000Z',
    });
    expect(removeMock).toHaveBeenCalledWith([
      'art-1/old__thumb.webp',
      'art-1/old__card.webp',
      'art-1/old__detail.webp',
      'art-1/old__hero.webp',
      'art-1/old__original.webp',
    ]);
    expect(result.beforeArtwork).toEqual(expect.objectContaining({ title: '칼노래' }));
    expect(result.afterArtwork).toEqual(
      expect.objectContaining({ images: [KEEP_IMAGE, NEW_IMAGE] })
    );
    expect(result.removeError).toBeNull();
  });

  it('does not remove storage paths when optimistic image update loses the race', async () => {
    const { updateArtworkImagesMutation } = await import('@/lib/artworks/core-mutations');
    const { supabase, removeMock } = buildImageSupabaseMock({
      before: {
        id: 'art-1',
        title: '칼노래',
        images: [OLD_IMAGE],
        updated_at: '2026-06-01T00:00:00.000Z',
      },
      updatedRows: [],
    });

    await expect(
      updateArtworkImagesMutation(supabase as never, {
        id: 'art-1',
        images: [NEW_IMAGE],
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow(
      '다른 관리자가 먼저 수정했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
    );
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('updates artwork category and returns the previous snapshot for audit logging', async () => {
    const { updateArtworkCategoryMutation } = await import('@/lib/artworks/core-mutations');
    const { supabase, updates } = buildCategorySupabaseMock({
      id: 'art-1',
      title: '칼노래',
      category: 'painting',
    });

    const result = await updateArtworkCategoryMutation(supabase as never, {
      id: 'art-1',
      category: 'drawing',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(updates[0]).toEqual({
      category: 'drawing',
      updated_at: '2026-06-30T05:00:00.000Z',
    });
    expect(result.beforeArtwork).toEqual(
      expect.objectContaining({ title: '칼노래', category: 'painting' })
    );
  });
});
