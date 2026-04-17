'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import type { Database } from '@/types/supabase';
import { logAdminAction } from './activity-log-writer';
import { getString, getStoragePathsForRemoval, validateBatchSize } from '@/lib/utils/form-helpers';
import { validateArtworkData, validateSaleInput } from '@/lib/actions/artwork-validation';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';

type EditionType = Database['public']['Enums']['edition_type'];
type ArtworkStatus = Database['public']['Enums']['artwork_status'];

function isMissingVoidedAtColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const merged = `${candidate.message || ''} ${candidate.details || ''} ${candidate.hint || ''}`
    .toLowerCase()
    .trim();

  return candidate.code === '42703' && merged.includes('voided_at');
}

/**
 * 활성(non-voided) 판매 기록 기반으로 artwork.status를 재계산하고 업데이트.
 * sold → available, available → sold 양방향 동기화.
 * reserved 상태는 관리자 수동 설정이므로 판매 완료가 아닌 한 유지.
 */
export async function deriveAndSyncArtworkStatus(
  supabase: Awaited<ReturnType<typeof createSupabaseAdminClient>>,
  artworkId: string
): Promise<'available' | 'sold' | 'reserved'> {
  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, status, sold_at, edition_type, edition_limit')
    .eq('id', artworkId)
    .single();

  if (!artwork) return 'available';

  let { data: salesRows, error: salesError } = await supabase
    .from('artwork_sales')
    .select('quantity')
    .eq('artwork_id', artworkId)
    .is('voided_at', null);

  if (salesError && isMissingVoidedAtColumnError(salesError)) {
    ({ data: salesRows, error: salesError } = await supabase
      .from('artwork_sales')
      .select('quantity')
      .eq('artwork_id', artworkId));
  }
  if (salesError) return artwork.status as 'available' | 'sold' | 'reserved';

  const soldQuantity = (salesRows || []).reduce(
    (sum, row) => sum + Math.max(1, typeof row.quantity === 'number' ? row.quantity : 1),
    0
  );

  const editionType = artwork.edition_type || 'unique';
  const isSold =
    editionType === 'unique'
      ? soldQuantity >= 1
      : editionType === 'limited' && !!artwork.edition_limit
        ? soldQuantity >= artwork.edition_limit
        : false;

  if (isSold && artwork.status !== 'sold') {
    await supabase
      .from('artworks')
      .update({
        status: 'sold',
        sold_at: artwork.sold_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', artworkId);
    return 'sold';
  }

  if (!isSold && artwork.status === 'sold') {
    await supabase
      .from('artworks')
      .update({
        status: 'available',
        sold_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', artworkId);
    return 'available';
  }

  return artwork.status as 'available' | 'sold' | 'reserved';
}

type BatchArtworkMutationResult = {
  success: boolean;
  partial: boolean;
  count: number;
  succeededIds: string[];
  failedIds: string[];
  errors: string[];
};

export async function deleteAdminArtwork(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: artwork } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, artist_id, created_at, updated_at'
    )
    .eq('id', id)
    .single();

  const { count: activeOrderCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('artwork_id', id)
    .in('status', ['paid', 'preparing', 'awaiting_deposit', 'shipped']);
  if ((activeOrderCount ?? 0) > 0) {
    throw new Error('진행 중인 주문이 있어 삭제할 수 없습니다.');
  }

  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) throw error;

  let artistName: string | null = null;
  if (artwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artwork.artist_id)
      .single();
    artistName = artist?.name_ko ?? null;
  }
  revalidatePublicArtworkSurfaces([artistName]);

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
  const supabase = await createSupabaseAdminClient();

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
  const supabase = await createSupabaseAdminClient();

  const { data, error } = await supabase.from('artists').select('id, name_ko').order('name_ko');

  if (error) throw error;
  return data || [];
}

export async function updateArtworkDetails(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const dataValidation = validateArtworkData(formData);
  if (dataValidation.error) throw new Error(dataValidation.error);

  const title = getString(formData, 'title');
  const title_en = getString(formData, 'title_en') || null;
  const admin_product_name = getString(formData, 'admin_product_name') || null;
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const rawEditionType = getString(formData, 'edition_type') || 'unique';
  const edition_type = (
    ['unique', 'limited', 'open'].includes(rawEditionType) ? rawEditionType : 'unique'
  ) as EditionType;
  const edition_limit_raw = getString(formData, 'edition_limit');
  const edition_limit =
    edition_type === 'limited' && edition_limit_raw ? Number(edition_limit_raw) : null;
  const price = getString(formData, 'price');
  const tax_type = getString(formData, 'tax_type') || 'B';
  const category = getString(formData, 'category') || null;
  const artist_id = getString(formData, 'artist_id');

  const { data: oldArtwork } = await supabase
    .from('artworks')
    .select(
      'id, title, title_en, admin_product_name, artist_id, description, size, material, year, edition, edition_type, edition_limit, price, tax_type, status, sold_at, images, is_hidden, shop_url, updated_at'
    )
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artworks')
    .update({
      title,
      title_en,
      admin_product_name,
      description,
      size,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      tax_type,
      category,
      artist_id: artist_id || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  const { data: newArtwork } = await supabase
    .from('artworks')
    .select(
      'id, title, admin_product_name, artist_id, description, size, material, year, edition, edition_type, edition_limit, price, tax_type, status, sold_at, images, is_hidden, shop_url, updated_at'
    )
    .eq('id', id)
    .single();

  const artistNames: Array<string | null> = [];
  if (oldArtwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', oldArtwork.artist_id)
      .single();
    artistNames.push(artist?.name_ko ?? null);
  }
  if (artist_id && artist_id !== oldArtwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artist_id)
      .single();
    artistNames.push(artist?.name_ko ?? null);
  }
  revalidatePublicArtworkSurfaces(artistNames);
  revalidatePath(`/artworks/${id}`);
  revalidatePath(`/en/artworks/${id}`);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

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
  const supabase = await createSupabaseAdminClient();

  const dataValidation = validateArtworkData(formData);
  if (dataValidation.error) throw new Error(dataValidation.error);

  const title = getString(formData, 'title');
  const title_en = getString(formData, 'title_en') || null;
  const admin_product_name = getString(formData, 'admin_product_name') || null;
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const rawEditionType = getString(formData, 'edition_type') || 'unique';
  const edition_type = (
    ['unique', 'limited', 'open'].includes(rawEditionType) ? rawEditionType : 'unique'
  ) as EditionType;
  const edition_limit_raw = getString(formData, 'edition_limit');
  const edition_limit =
    edition_type === 'limited' && edition_limit_raw ? Number(edition_limit_raw) : null;
  const price = getString(formData, 'price');
  const tax_type = getString(formData, 'tax_type') || 'B';
  const category = getString(formData, 'category') || null;
  const artist_id = getString(formData, 'artist_id');

  if (!artist_id) throw new Error('작가를 선택해주세요.');

  const { data: artwork, error } = await supabase
    .from('artworks')
    .insert({
      title,
      title_en,
      admin_product_name,
      description,
      size,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      tax_type,
      category,
      shop_url: null,
      artist_id,
      status: 'available',
      is_hidden: false,
    })
    .select()
    .single();

  if (error) throw error;

  const { data: artist } = await supabase
    .from('artists')
    .select('name_ko')
    .eq('id', artist_id)
    .single();
  revalidatePublicArtworkSurfaces([artist?.name_ko]);
  revalidatePath('/admin/artworks');

  await logAdminAction('artwork_created', 'artwork', artwork.id, { title }, admin.id, {
    afterSnapshot: artwork,
    reversible: true,
  });

  return { success: true, id: artwork.id };
}

export async function updateArtworkImages(id: string, images: string[]) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: beforeArtwork } = await supabase
    .from('artworks')
    .select('id, title, images, updated_at')
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

  const previousImages = Array.isArray(beforeArtwork?.images)
    ? beforeArtwork.images.filter(
        (image): image is string => typeof image === 'string' && image.length > 0
      )
    : [];
  const removedUrls = previousImages.filter((url) => !images.includes(url));
  const removalPaths = getStoragePathsForRemoval(removedUrls, 'artworks');
  if (removalPaths.length > 0) {
    const { error: removeError } = await supabase.storage.from('artworks').remove(removalPaths);
    if (removeError) {
      console.error('[updateArtworkImages] orphan cleanup failed:', removeError.message);
    }
  }

  const { data: afterArtwork } = await supabase
    .from('artworks')
    .select('id, title, images, updated_at')
    .eq('id', id)
    .single();

  revalidatePublicArtworkSurfaces();
  revalidatePath(`/artworks/${id}`);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  await logAdminAction(
    'artwork_images_updated',
    'artwork',
    id,
    {
      title: beforeArtwork?.title || afterArtwork?.title,
      image_count: images.length,
    },
    admin.id,
    {
      summary: `작품 이미지 변경: ${beforeArtwork?.title || id}`,
      beforeSnapshot: beforeArtwork || null,
      afterSnapshot: afterArtwork || null,
      reversible: true,
    }
  );

  return { success: true };
}

// Batch operations
export async function batchUpdateArtworkStatus(
  ids: string[],
  status: ArtworkStatus
): Promise<BatchArtworkMutationResult> {
  const admin = await requireAdmin();
  if (ids.length === 0) {
    return {
      success: true,
      partial: false,
      count: 0,
      succeededIds: [],
      failedIds: [],
      errors: [],
    } satisfies BatchArtworkMutationResult;
  }
  validateBatchSize(ids);
  const supabase = await createSupabaseAdminClient();

  if (!['available', 'reserved', 'sold'].includes(status)) {
    throw new Error('Invalid status');
  }

  const { data: beforeArtworks } = await supabase
    .from('artworks')
    .select('id, title, status, sold_at, updated_at')
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
    .select('id, title, status, sold_at, updated_at')
    .in('id', ids);

  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_status',
    'artwork',
    ids.join(','),
    {
      count: ids.length,
      status,
      target_names: Object.fromEntries(
        (beforeArtworks || []).filter((a) => a.title).map((a) => [a.id, a.title])
      ),
    },
    admin.id,
    {
      summary: `작품 상태 일괄 변경: ${ids.length}건 → ${status}`,
      beforeSnapshot: { items: beforeArtworks || [] },
      afterSnapshot: { items: afterArtworks || [] },
      reversible: true,
    }
  );

  return {
    success: true,
    partial: false,
    count: ids.length,
    succeededIds: ids,
    failedIds: [],
    errors: [],
  } satisfies BatchArtworkMutationResult;
}

export async function updateArtworkCategory(id: string, category: string | null) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: before } = await supabase
    .from('artworks')
    .select('id, title, category')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artworks')
    .update({ category, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  revalidatePublicArtworkSurfaces();
  revalidatePath(`/artworks/${id}`);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  await logAdminAction(
    'update_artwork_category',
    'artwork',
    id,
    { title: before?.title, category, previous_category: before?.category },
    admin.id,
    {
      summary: `작품 카테고리 변경: ${before?.title || id} → ${category || '없음'}`,
      beforeSnapshot: { category: before?.category },
      afterSnapshot: { category },
      reversible: true,
    }
  );

  return { success: true };
}

export async function getArtworkSales(artworkId: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  let { data, error } = await supabase
    .from('artwork_sales')
    .select('*')
    .eq('artwork_id', artworkId)
    .is('voided_at', null)
    .order('sold_at', { ascending: false });

  if (error && isMissingVoidedAtColumnError(error)) {
    ({ data, error } = await supabase
      .from('artwork_sales')
      .select('*')
      .eq('artwork_id', artworkId)
      .order('sold_at', { ascending: false }));
  }

  if (error) throw error;
  return data || [];
}

export async function recordArtworkSale(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const artworkId = getString(formData, 'artwork_id');
  const salePriceRaw = getString(formData, 'sale_price');
  const quantityRaw = getString(formData, 'quantity') || '1';
  const buyerName = getString(formData, 'buyer_name');
  const buyerPhone = getString(formData, 'buyer_phone');
  const note = getString(formData, 'note');
  const soldAt = getString(formData, 'sold_at') || new Date().toISOString();

  if (!artworkId || !salePriceRaw) {
    throw new Error('필수 정보가 누락되었습니다.');
  }

  const validationError = validateSaleInput(salePriceRaw, quantityRaw || '1');
  if (validationError) throw new Error(validationError);

  const salePrice = Number(salePriceRaw);
  const quantity = Number(quantityRaw);

  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, title, edition_type, edition_limit')
    .eq('id', artworkId)
    .single();

  if (!artwork) throw new Error('작품을 찾을 수 없습니다.');

  if (artwork.edition_type === 'limited' && artwork.edition_limit) {
    let { data: sales, error: salesError } = await supabase
      .from('artwork_sales')
      .select('quantity')
      .eq('artwork_id', artworkId)
      .is('voided_at', null);

    if (salesError && isMissingVoidedAtColumnError(salesError)) {
      ({ data: sales, error: salesError } = await supabase
        .from('artwork_sales')
        .select('quantity')
        .eq('artwork_id', artworkId));
    }
    if (salesError) throw salesError;

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
    buyer_phone: buyerPhone || null,
    note,
    sold_at: soldAt,
  });

  if (error) throw error;

  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);

  await logAdminAction(
    'artwork_sold',
    'artwork',
    artworkId,
    {
      title: artwork.title,
      sale_price: salePrice,
      quantity,
      buyer_name: buyerName,
      buyer_phone: buyerPhone ? '[set]' : null,
    },
    admin.id,
    {
      summary: `작품 판매 기록: ${artwork.title} (${quantity}점)`,
      beforeSnapshot: null,
      afterSnapshot: null,
      reversible: true,
    }
  );

  await deriveAndSyncArtworkStatus(supabase, artworkId);

  return { success: true };
}

export async function updateArtworkSale(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const saleId = getString(formData, 'sale_id');
  const artworkId = getString(formData, 'artwork_id');
  const salePriceRaw = getString(formData, 'sale_price');
  const quantityRaw = getString(formData, 'quantity') || '1';
  const buyerName = getString(formData, 'buyer_name');
  const buyerPhone = getString(formData, 'buyer_phone');
  const note = getString(formData, 'note');
  const soldAt = getString(formData, 'sold_at');

  if (!saleId || !artworkId || !salePriceRaw) {
    throw new Error('필수 정보가 누락되었습니다.');
  }

  const { data: existing } = await supabase
    .from('artwork_sales')
    .select('id, artwork_id, source, sale_price, quantity, buyer_name, buyer_phone, note, sold_at')
    .eq('id', saleId)
    .single();

  if (!existing) throw new Error('판매 기록을 찾을 수 없습니다.');
  if (existing.artwork_id !== artworkId) {
    throw new Error('판매 기록과 작품 정보가 일치하지 않습니다.');
  }
  if (existing.source === 'toss') {
    throw new Error('외부 동기화 판매 기록은 수정할 수 없습니다.');
  }

  const validationError = validateSaleInput(salePriceRaw, quantityRaw);
  if (validationError) throw new Error(validationError);

  const salePrice = Number(salePriceRaw);
  const quantity = Number(quantityRaw);

  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, title, edition_type, edition_limit')
    .eq('id', artworkId)
    .single();

  if (!artwork) throw new Error('작품을 찾을 수 없습니다.');

  if (artwork.edition_type === 'limited' && artwork.edition_limit) {
    let { data: sales, error: salesError } = await supabase
      .from('artwork_sales')
      .select('id, quantity')
      .eq('artwork_id', artworkId)
      .is('voided_at', null);

    if (salesError && isMissingVoidedAtColumnError(salesError)) {
      ({ data: sales, error: salesError } = await supabase
        .from('artwork_sales')
        .select('id, quantity')
        .eq('artwork_id', artworkId));
    }
    if (salesError) throw salesError;

    const currentSold =
      sales?.filter((s) => s.id !== saleId).reduce((sum, sale) => sum + (sale.quantity || 1), 0) ||
      0;

    if (currentSold + quantity > artwork.edition_limit) {
      throw new Error(
        `에디션 수량을 초과할 수 없습니다. (현재: ${currentSold}, 제한: ${artwork.edition_limit}, 수정시도: ${quantity})`
      );
    }
  }

  const { error } = await supabase
    .from('artwork_sales')
    .update({
      sale_price: salePrice,
      quantity,
      buyer_name: buyerName || null,
      buyer_phone: buyerPhone || null,
      note: note || null,
      sold_at: soldAt || new Date().toISOString(),
    })
    .eq('id', saleId);

  if (error) throw error;

  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);
  revalidatePath('/admin/buyers');
  revalidatePath('/admin/revenue');
  revalidatePath('/admin/artist-sales');

  await logAdminAction(
    'artwork_sale_updated',
    'artwork',
    artworkId,
    { title: artwork.title, sale_id: saleId },
    admin.id,
    {
      summary: `판매 기록 수정: ${artwork.title}`,
      beforeSnapshot: {
        sale_price: existing.sale_price,
        quantity: existing.quantity,
        buyer_name: existing.buyer_name,
      },
      afterSnapshot: { sale_price: salePrice, quantity, buyer_name: buyerName },
      reversible: true,
    }
  );

  await deriveAndSyncArtworkStatus(supabase, artworkId);

  return { success: true };
}

export async function voidArtworkSale(saleId: string, reason: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  if (!saleId) throw new Error('판매 기록 ID가 필요합니다.');
  if (!reason.trim()) throw new Error('취소 사유를 입력해주세요.');

  const { data: existing } = await supabase
    .from('artwork_sales')
    .select('id, artwork_id, source, sale_price, quantity, buyer_name')
    .eq('id', saleId)
    .single();

  if (!existing) throw new Error('판매 기록을 찾을 수 없습니다.');

  const { error } = await supabase
    .from('artwork_sales')
    .update({ voided_at: new Date().toISOString(), void_reason: reason.trim() })
    .eq('id', saleId);

  if (error) throw error;

  const artworkId = existing.artwork_id;

  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);
  revalidatePath('/admin/buyers');
  revalidatePath('/admin/revenue');
  revalidatePath('/admin/artist-sales');

  const { data: artwork } = await supabase
    .from('artworks')
    .select('title')
    .eq('id', artworkId)
    .single();

  await logAdminAction(
    'artwork_sale_voided',
    'artwork',
    artworkId,
    { title: artwork?.title, sale_id: saleId, reason, source: existing.source },
    admin.id,
    {
      summary: `판매 취소: ${artwork?.title || artworkId} (${existing.quantity}점, ${existing.buyer_name || '구매자 미상'})`,
      beforeSnapshot: {
        sale_price: existing.sale_price,
        quantity: existing.quantity,
        buyer_name: existing.buyer_name,
      },
      afterSnapshot: null,
      reversible: false,
    }
  );

  await deriveAndSyncArtworkStatus(supabase, artworkId);

  return { success: true };
}

export async function batchToggleHidden(
  ids: string[],
  isHidden: boolean
): Promise<BatchArtworkMutationResult> {
  if (ids.length === 0) {
    return {
      success: true,
      partial: false,
      count: 0,
      succeededIds: [],
      failedIds: [],
      errors: [],
    } satisfies BatchArtworkMutationResult;
  }
  validateBatchSize(ids);
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: beforeArtworks } = await supabase
    .from('artworks')
    .select('id, title, is_hidden, updated_at')
    .in('id', ids);

  const { error } = await supabase
    .from('artworks')
    .update({ is_hidden: isHidden, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;

  const { data: afterArtworks } = await supabase
    .from('artworks')
    .select('id, title, is_hidden, updated_at')
    .in('id', ids);

  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_visibility',
    'artwork',
    ids.join(','),
    {
      count: ids.length,
      hidden: isHidden,
      target_names: Object.fromEntries(
        (beforeArtworks || []).filter((a) => a.title).map((a) => [a.id, a.title])
      ),
    },
    admin.id,
    {
      summary: `작품 숨김 일괄 변경: ${ids.length}건`,
      beforeSnapshot: { items: beforeArtworks || [] },
      afterSnapshot: { items: afterArtworks || [] },
      reversible: true,
    }
  );

  return {
    success: true,
    partial: false,
    count: ids.length,
    succeededIds: ids,
    failedIds: [],
    errors: [],
  } satisfies BatchArtworkMutationResult;
}

export async function batchDeleteArtworks(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 };
  validateBatchSize(ids);
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  // Keep full snapshots so deleted rows can be restored from activity logs.
  const { data: artworks } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, artist_id, created_at, updated_at'
    )
    .in('id', ids);

  const { count: activeOrderCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('artwork_id', ids)
    .in('status', ['paid', 'preparing', 'awaiting_deposit', 'shipped']);
  if ((activeOrderCount ?? 0) > 0) {
    throw new Error('진행 중인 주문이 있는 작품이 포함되어 삭제할 수 없습니다.');
  }

  const { error } = await supabase.from('artworks').delete().in('id', ids);
  if (error) throw error;

  revalidatePublicArtworkSurfaces();
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
