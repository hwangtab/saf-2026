describe('artwork admin tag mutations', () => {
  it('blocks creating a tag when an archived tag with the same slug exists', async () => {
    const { createAdminTagMutation } = await import('@/lib/artworks/admin-tags');
    const insertMock = jest.fn();
    const supabase = {
      from: jest.fn((table: string) => {
        if (table !== 'admin_tags') throw new Error(`Unexpected table: ${table}`);
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              not: jest.fn(() => ({
                maybeSingle: jest.fn(async () => ({
                  data: { id: 'tag-1', name: '봄 큐레이션', archived_at: '2026-06-01' },
                  error: null,
                })),
              })),
            })),
          })),
          insert: insertMock,
        };
      }),
    };

    await expect(
      createAdminTagMutation(supabase as never, {
        input: { name: '봄 큐레이션' },
        adminId: 'admin-1',
      })
    ).rejects.toThrow('보관 처리된 동일한 이름의 태그가 있습니다. 기존 태그를 수정해 주세요.');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('blocks updating archived tags before issuing an update', async () => {
    const { updateAdminTagMutation } = await import('@/lib/artworks/admin-tags');
    const updateMock = jest.fn();
    const supabase = {
      from: jest.fn((table: string) => {
        if (table !== 'admin_tags') throw new Error(`Unexpected table: ${table}`);
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({
                data: { id: 'tag-1', name: '봄 큐레이션', archived_at: '2026-06-01' },
                error: null,
              })),
            })),
          })),
          update: updateMock,
        };
      }),
    };

    await expect(
      updateAdminTagMutation(supabase as never, {
        id: 'tag-1',
        input: { name: '봄 큐레이션' },
        adminId: 'admin-1',
      })
    ).rejects.toThrow('보관 처리된 태그는 수정할 수 없습니다.');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('archives a newly created tag when attaching it to an artwork fails', async () => {
    const { createAndAttachAdminTagToArtworkMutation } = await import('@/lib/artworks/admin-tags');
    const rollbackEqMock = jest.fn(async () => ({ error: null }));
    const updateMock = jest.fn(() => ({ eq: rollbackEqMock }));
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'admin_tags') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                not: jest.fn(() => ({
                  maybeSingle: jest.fn(async () => ({ data: null, error: null })),
                })),
              })),
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(async () => ({
                  data: {
                    id: 'tag-new',
                    name: 'VIP',
                    slug: 'vip',
                    color: '#6b7280',
                    description: null,
                    archived_at: null,
                    created_at: '2026-06-30',
                    updated_at: '2026-06-30',
                  },
                  error: null,
                })),
              })),
            })),
            update: updateMock,
          };
        }

        if (table === 'artwork_admin_tags') {
          return {
            insert: jest.fn(async () => ({ error: { message: 'attach failed' } })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    await expect(
      createAndAttachAdminTagToArtworkMutation(supabase as never, {
        artworkId: 'art-1',
        input: { name: 'VIP' },
        adminId: 'admin-1',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toMatchObject({ message: 'attach failed' });
    expect(updateMock).toHaveBeenCalledWith({
      archived_at: '2026-06-30T05:00:00.000Z',
      updated_by: 'admin-1',
    });
    expect(rollbackEqMock).toHaveBeenCalledWith('id', 'tag-new');
  });

  it('deduplicates artwork ids before adding a tag in bulk', async () => {
    const { addAdminTagToArtworksMutation } = await import('@/lib/artworks/admin-tags');
    const upsertMock = jest.fn(async () => ({ error: null }));
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'admin_tags') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({
                  data: { id: 'tag-1', name: 'VIP', archived_at: null },
                  error: null,
                })),
              })),
            })),
          };
        }

        if (table === 'artwork_admin_tags') {
          return { upsert: upsertMock };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await addAdminTagToArtworksMutation(supabase as never, {
      artworkIds: ['art-1', 'art-1', 'art-2'],
      tagId: 'tag-1',
      adminId: 'admin-1',
    });

    expect(upsertMock).toHaveBeenCalledWith(
      [
        { artwork_id: 'art-1', tag_id: 'tag-1', created_by: 'admin-1' },
        { artwork_id: 'art-2', tag_id: 'tag-1', created_by: 'admin-1' },
      ],
      {
        onConflict: 'artwork_id,tag_id',
        ignoreDuplicates: true,
      }
    );
    expect(result.result).toEqual({ success: true, count: 2 });
  });

  it('returns linked artwork ids and snapshots when deleting a tag', async () => {
    const { deleteAdminTagMutation } = await import('@/lib/artworks/admin-tags');
    const deleteEqMock = jest.fn(async () => ({ error: null }));
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'admin_tags') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({
                  data: { id: 'tag-1', name: 'VIP', archived_at: null },
                  error: null,
                })),
              })),
            })),
            delete: jest.fn(() => ({ eq: deleteEqMock })),
          };
        }

        if (table === 'artwork_admin_tags') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(async () => ({
                data: [
                  { artwork_id: 'art-1', tag_id: 'tag-1' },
                  { artwork_id: 'art-1', tag_id: 'tag-1' },
                  { artwork_id: 'art-2', tag_id: 'tag-1' },
                ],
                error: null,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await deleteAdminTagMutation(supabase as never, { id: 'tag-1' });

    expect(deleteEqMock).toHaveBeenCalledWith('id', 'tag-1');
    expect(result.artworkIds).toEqual(['art-1', 'art-2']);
    expect(result.links).toHaveLength(3);
    expect(result.result).toEqual({
      success: true,
      tagId: 'tag-1',
      artworkIds: ['art-1', 'art-2'],
      count: 2,
    });
  });
});
