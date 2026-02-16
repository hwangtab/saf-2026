'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { logAdminAction } from './admin-logs';
import { getString, validateBatchSize } from '@/lib/utils/form-helpers';

export async function deleteAdminArtwork(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artwork } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, artist_id, created_at, updated_at'
    )
    .eq('id', id)
    .single();

  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  if (artwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artwork.artist_id)
      .single();
    if (artist?.name_ko) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
    }
  }

  await logAdminAction(
    'artwork_deleted',
    'artwork',
    id,
    {
      title: artwork?.title || 'Unknown',
      storage_cleanup_deferred: true,
    },
    admin.id,
    {
      summary: `작품 삭제: ${artwork?.title || id}`,
      beforeSnapshot: artwork || null,
      afterSnapshot: null,
      reversible: true,
    }
  );
}

export async function getArtworkById(id: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase
    .from('artworks')
    .select('*, artists(id, name_ko)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllArtists() {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase.from('artists').select('id, name_ko').order('name_ko');

  if (error) throw error;
  return data || [];
}

export async function updateArtworkDetails(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const edition_type = getString(formData, 'edition_type') || 'unique';
  const edition_limit_raw = getString(formData, 'edition_limit');
  const edition_limit =
    edition_type === 'limited' && edition_limit_raw ? parseInt(edition_limit_raw, 10) : null;
  const price = getString(formData, 'price');
  const shop_url = getString(formData, 'shop_url');
  const artist_id = getString(formData, 'artist_id');

  const { data: oldArtwork } = await supabase
    .from('artworks')
    .select(
      'id, title, artist_id, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, images, is_hidden, shop_url, updated_at'
    )
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artworks')
    .update({
      title,
      description,
      size,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      shop_url,
      artist_id: artist_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  const { data: newArtwork } = await supabase
    .from('artworks')
    .select(
      'id, title, artist_id, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, images, is_hidden, shop_url, updated_at'
    )
    .eq('id', id)
    .single();

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath(`/artworks/${id}`);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  // Revalidate both old and new artist pages
  if (oldArtwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', oldArtwork.artist_id)
      .single();
    if (artist?.name_ko) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
    }
  }
  if (artist_id && artist_id !== oldArtwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artist_id)
      .single();
    if (artist?.name_ko) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
    }
  }

  await logAdminAction('artwork_updated', 'artwork', id, { title }, admin.id, {
    summary: `작품 수정: ${title}`,
    beforeSnapshot: oldArtwork || null,
    afterSnapshot: newArtwork || null,
    reversible: true,
  });

  return { success: true };
}

export async function createAdminArtwork(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const edition_type = getString(formData, 'edition_type') || 'unique';
  const edition_limit_raw = getString(formData, 'edition_limit');
  const edition_limit =
    edition_type === 'limited' && edition_limit_raw ? parseInt(edition_limit_raw, 10) : null;
  const price = getString(formData, 'price');
  const shop_url = getString(formData, 'shop_url');
  const artist_id = getString(formData, 'artist_id');

  if (!title) throw new Error('작품명을 입력해주세요.');
  if (!artist_id) throw new Error('작가를 선택해주세요.');

  const { data: artwork, error } = await supabase
    .from('artworks')
    .insert({
      title,
      description,
      size,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      shop_url,
      artist_id,
      status: 'available',
      is_hidden: false,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');

  const { data: artist } = await supabase
    .from('artists')
    .select('name_ko')
    .eq('id', artist_id)
    .single();

  if (artist?.name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
  }

  await logAdminAction('artwork_created', 'artwork', artwork.id, { title }, admin.id, {
    afterSnapshot: artwork,
    reversible: true,
  });

  return { success: true, id: artwork.id };
}

export async function updateArtworkImages(id: string, images: string[]) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: beforeArtwork } = await supabase
    .from('artworks')
    .select('id, images, updated_at')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artworks')
    .update({
      images,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  const { data: afterArtwork } = await supabase
    .from('artworks')
    .select('id, images, updated_at')
    .eq('id', id)
    .single();

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath(`/artworks/${id}`);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  await logAdminAction(
    'artwork_images_updated',
    'artwork',
    id,
    {
      image_count: images.length,
    },
    admin.id,
    {
      summary: `작품 이미지 변경: ${id}`,
      beforeSnapshot: beforeArtwork || null,
      afterSnapshot: afterArtwork || null,
      reversible: true,
    }
  );

  return { success: true };
}

// Batch operations
export async function batchUpdateArtworkStatus(ids: string[], status: string) {
  if (ids.length === 0) return { success: true, count: 0 };
  validateBatchSize(ids);
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  if (!['available', 'reserved', 'sold'].includes(status)) {
    throw new Error('Invalid status');
  }

  const { data: beforeArtworks } = await supabase
    .from('artworks')
    .select('id, status, sold_at, updated_at')
    .in('id', ids);

  const nowIso = new Date().toISOString();
  if (status === 'sold') {
    const { error: statusOnlyError } = await supabase
      .from('artworks')
      .update({
        status,
        updated_at: nowIso,
      })
      .in('id', ids);

    if (statusOnlyError) throw statusOnlyError;

    const idsMissingSoldAt = (beforeArtworks || [])
      .filter((artwork) => !artwork.sold_at)
      .map((artwork) => artwork.id);

    if (idsMissingSoldAt.length > 0) {
      const { error: soldAtError } = await supabase
        .from('artworks')
        .update({
          sold_at: nowIso,
          updated_at: nowIso,
        })
        .in('id', idsMissingSoldAt);

      if (soldAtError) throw soldAtError;
    }
  } else {
    const { error } = await supabase
      .from('artworks')
      .update({
        status,
        sold_at: null,
        updated_at: nowIso,
      })
      .in('id', ids);

    if (error) throw error;
  }

  const { data: afterArtworks } = await supabase
    .from('artworks')
    .select('id, status, sold_at, updated_at')
    .in('id', ids);

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_status',
    'artwork',
    ids.join(','),
    {
      count: ids.length,
      status,
    },
    admin.id,
    {
      summary: `작품 상태 일괄 변경: ${ids.length}건 → ${status}`,
      beforeSnapshot: { items: beforeArtworks || [] },
      afterSnapshot: { items: afterArtworks || [] },
      reversible: true,
    }
  );

  return { success: true, count: ids.length };
}

export async function getArtworkSales(artworkId: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase
    .from('artwork_sales')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('sold_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function recordArtworkSale(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const artworkId = getString(formData, 'artwork_id');
  const salePriceRaw = getString(formData, 'sale_price');
  const quantityRaw = getString(formData, 'quantity') || '1';
  const buyerName = getString(formData, 'buyer_name');
  const note = getString(formData, 'note');
  const soldAt = getString(formData, 'sold_at') || new Date().toISOString();

  if (!artworkId || !salePriceRaw) {
    throw new Error('필수 정보가 누락되었습니다.');
  }

  const salePrice = parseInt(salePriceRaw, 10);
  const quantity = parseInt(quantityRaw, 10);

  if (isNaN(salePrice) || isNaN(quantity) || quantity < 1) {
    throw new Error('유효하지 않은 가격 또는 수량입니다.');
  }

  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, title, edition_type, edition_limit')
    .eq('id', artworkId)
    .single();

  if (!artwork) throw new Error('작품을 찾을 수 없습니다.');

  if (artwork.edition_type === 'limited' && artwork.edition_limit) {
    const { data: sales } = await supabase
      .from('artwork_sales')
      .select('quantity')
      .eq('artwork_id', artworkId);

    const currentSold = sales?.reduce((sum, sale) => sum + (sale.quantity || 1), 0) || 0;

    if (currentSold + quantity > artwork.edition_limit) {
      throw new Error(
        `에디션 수량을 초과할 수 없습니다. (현재: ${currentSold}, 제한: ${artwork.edition_limit}, 추가시도: ${quantity})`
      );
    }
  }

  const { error } = await supabase.from('artwork_sales').insert({
    artwork_id: artworkId,
    sale_price: salePrice,
    quantity,
    buyer_name: buyerName,
    note,
    sold_at: soldAt,
  });

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);

  await logAdminAction(
    'artwork_sold',
    'artwork',
    artworkId,
    {
      sale_price: salePrice,
      quantity,
      buyer_name: buyerName,
    },
    admin.id,
    {
      summary: `작품 판매 기록: ${artwork.title} (${quantity}점)`,
      beforeSnapshot: null,
      afterSnapshot: null,
      reversible: true,
    }
  );

  return { success: true };
}

export async function batchToggleHidden(ids: string[], isHidden: boolean) {
  if (ids.length === 0) return { success: true, count: 0 };
  validateBatchSize(ids);
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: beforeArtworks } = await supabase
    .from('artworks')
    .select('id, is_hidden, updated_at')
    .in('id', ids);

  const { error } = await supabase
    .from('artworks')
    .update({ is_hidden: isHidden, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;

  const { data: afterArtworks } = await supabase
    .from('artworks')
    .select('id, is_hidden, updated_at')
    .in('id', ids);

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_visibility',
    'artwork',
    ids.join(','),
    {
      count: ids.length,
      hidden: isHidden,
    },
    admin.id,
    {
      summary: `작품 숨김 일괄 변경: ${ids.length}건`,
      beforeSnapshot: { items: beforeArtworks || [] },
      afterSnapshot: { items: afterArtworks || [] },
      reversible: true,
    }
  );

  return { success: true, count: ids.length };
}

export async function batchDeleteArtworks(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 };
  validateBatchSize(ids);
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  // Keep full snapshots so deleted rows can be restored from activity logs.
  const { data: artworks } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, artist_id, created_at, updated_at'
    )
    .in('id', ids);

  const { error } = await supabase.from('artworks').delete().in('id', ids);
  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_deleted',
    'artwork',
    ids.join(','),
    {
      count: ids.length,
      storage_cleanup_deferred: true,
    },
    admin.id,
    {
      summary: `작품 일괄 삭제: ${ids.length}건`,
      beforeSnapshot: { items: artworks || [] },
      afterSnapshot: null,
      reversible: true,
    }
  );

  return { success: true, count: ids.length };
}
