function buildBaseFormData() {
  const formData = new FormData();
  formData.set('title', '  칼노래  ');
  formData.set('title_en', '  Sword Song  ');
  formData.set('admin_product_name', '  Admin Name  ');
  formData.set('description', '  설명  ');
  formData.set('width_cm', '10');
  formData.set('height_cm', '20');
  formData.set('depth_cm', '');
  formData.set('material', '  Oil  ');
  formData.set('year', '  2026  ');
  formData.set('edition', '  1/5  ');
  formData.set('edition_type', 'limited');
  formData.set('edition_limit', '5');
  formData.set('price', '  ₩1,000,000  ');
  formData.set('tax_type', 'A');
  formData.set('category', '  painting  ');
  formData.set('artist_id', 'artist-1');
  formData.append('tone', ' warm ');
  formData.append('tone', ' ');
  formData.append('tone', 'quiet');
  formData.set('quote', '  인용  ');
  formData.set('quote_en', '  quote  ');
  return formData;
}

describe('admin artwork details form parser', () => {
  it('normalizes shared artwork detail fields for update/create actions', async () => {
    const { parseAdminArtworkDetailsFormData } = await import('@/lib/artworks/details-form');
    const parsed = parseAdminArtworkDetailsFormData(buildBaseFormData());

    expect(parsed).toMatchObject({
      title: '칼노래',
      title_en: 'Sword Song',
      admin_product_name: 'Admin Name',
      description: '설명',
      size: '10x20cm',
      width_cm: 10,
      height_cm: 20,
      depth_cm: null,
      material: 'Oil',
      year: '2026',
      edition: '1/5',
      edition_type: 'limited',
      edition_limit: 5,
      price: '₩1,000,000',
      tax_type: 'A',
      category: 'painting',
      artist_id: 'artist-1',
      tone: ['warm', 'quiet'],
      quote: '인용',
      quote_en: 'quote',
    });
  });

  it('falls back unknown edition type to unique and clears limited edition limit', async () => {
    const { parseAdminArtworkDetailsFormData } = await import('@/lib/artworks/details-form');
    const formData = buildBaseFormData();
    formData.set('edition_type', 'strange');

    const parsed = parseAdminArtworkDetailsFormData(formData);

    expect(parsed.edition_type).toBe('unique');
    expect(parsed.edition_limit).toBeNull();
  });

  it('validates create-only image ownership and returns parsed image urls', async () => {
    const { parseAdminArtworkCreateFormData } = await import('@/lib/artworks/details-form');
    const formData = buildBaseFormData();
    formData.set('image_owner_prefix', 'admin-artwork-draft-abc');
    formData.set(
      'images',
      JSON.stringify([
        'https://example.supabase.co/storage/v1/object/public/artworks/admin-artwork-draft-abc/main__original.webp',
      ])
    );

    const parsed = parseAdminArtworkCreateFormData(formData);

    expect(parsed.images).toEqual([
      'https://example.supabase.co/storage/v1/object/public/artworks/admin-artwork-draft-abc/main__original.webp',
    ]);
  });

  it('rejects create images from non-draft ownership paths', async () => {
    const { parseAdminArtworkCreateFormData } = await import('@/lib/artworks/details-form');
    const formData = buildBaseFormData();
    formData.set('image_owner_prefix', 'artist-1');
    formData.set(
      'images',
      JSON.stringify([
        'https://example.supabase.co/storage/v1/object/public/artworks/artist-1/main__original.webp',
      ])
    );

    expect(() => parseAdminArtworkCreateFormData(formData)).toThrow(
      '이미지 업로드 경로가 올바르지 않습니다.'
    );
  });

  it('rejects create requests without an artist', async () => {
    const { parseAdminArtworkCreateFormData } = await import('@/lib/artworks/details-form');
    const formData = buildBaseFormData();
    formData.set('artist_id', ' ');

    expect(() => parseAdminArtworkCreateFormData(formData)).toThrow('작가를 선택해 주세요.');
  });
});
