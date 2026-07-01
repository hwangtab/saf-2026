import {
  buildAdminArtworkCreateInsert,
  buildAdminArtworkDetailsUpdate,
  parseAdminArtworkCreateFormData,
  parseAdminArtworkDetailsFormData,
} from '@/lib/artworks/details-form';

function buildBaseFormData() {
  const formData = new FormData();
  formData.set('title', '칼노래');
  formData.set('description', '설명');
  formData.set('width_cm', '10');
  formData.set('height_cm', '20');
  formData.set('material', 'Oil');
  formData.set('year', '2026');
  formData.set('edition', '1/1');
  formData.set('edition_type', 'unique');
  formData.set('price', '₩1,000,000');
  formData.set('artist_id', 'artist-new');
  return formData;
}

function buildUpdateSupabaseMock() {
  const updates: Array<Record<string, unknown>> = [];
  const oldArtwork = {
    id: 'art-1',
    title: '옛 제목',
    artist_id: 'artist-old',
    updated_at: '2026-06-01T00:00:00.000Z',
  };
  const newArtwork = {
    id: 'art-1',
    title: '칼노래',
    artist_id: 'artist-new',
    updated_at: '2026-06-30T05:00:00.000Z',
  };
  const artworkSelectRows = [oldArtwork, newArtwork];

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'artworks') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({ data: artworkSelectRows.shift(), error: null })),
            })),
          })),
          update: jest.fn((patch: Record<string, unknown>) => {
            updates.push(patch);
            return { eq: jest.fn(async () => ({ error: null })) };
          }),
        };
      }

      if (table === 'artists') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((column: string, value: string) => ({
              single: jest.fn(async () => ({
                data: { name_ko: value === 'artist-old' ? '이전 작가' : '새 작가' },
                error: null,
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

function buildCreateSupabaseMock() {
  const inserts: Array<Record<string, unknown>> = [];
  const artwork = {
    id: 'art-new',
    title: '칼노래',
    artist_id: 'artist-new',
  };
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'artworks') {
        return {
          insert: jest.fn((payload: Record<string, unknown>) => {
            inserts.push(payload);
            return {
              select: jest.fn(() => ({
                single: jest.fn(async () => ({ data: artwork, error: null })),
              })),
            };
          }),
        };
      }

      if (table === 'artists') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({ data: { name_ko: '새 작가' }, error: null })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, inserts, artwork };
}

describe('admin artwork details mutations', () => {
  it('updates details and returns before/after snapshots plus affected artist names', async () => {
    const { updateAdminArtworkDetailsMutation } = await import('@/lib/artworks/details-mutations');
    const formData = buildBaseFormData();
    const details = parseAdminArtworkDetailsFormData(formData);
    const { supabase, updates } = buildUpdateSupabaseMock();

    const result = await updateAdminArtworkDetailsMutation(supabase as never, {
      id: 'art-1',
      details,
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(updates[0]).toEqual(buildAdminArtworkDetailsUpdate(details, '2026-06-30T05:00:00.000Z'));
    expect(result.oldArtwork).toEqual(expect.objectContaining({ artist_id: 'artist-old' }));
    expect(result.newArtwork).toEqual(expect.objectContaining({ artist_id: 'artist-new' }));
    expect(result.artistNames).toEqual(['이전 작가', '새 작가']);
  });

  it('creates an artwork and returns the artist name needed for public revalidation', async () => {
    const { createAdminArtworkRecordMutation } = await import('@/lib/artworks/details-mutations');
    const formData = buildBaseFormData();
    formData.set('image_owner_prefix', 'admin-artwork-draft-abc');
    formData.set('images', JSON.stringify([]));
    const details = parseAdminArtworkCreateFormData(formData);
    const { supabase, inserts, artwork } = buildCreateSupabaseMock();

    const result = await createAdminArtworkRecordMutation(supabase as never, { details });

    expect(inserts[0]).toEqual(buildAdminArtworkCreateInsert(details));
    expect(result.artwork).toEqual(artwork);
    expect(result.artistName).toBe('새 작가');
  });
});
