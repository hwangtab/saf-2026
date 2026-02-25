'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { syncArtworkToCafe24 } from '@/lib/integrations/cafe24/sync-artwork';
import { purgeCafe24ProductsFromTrashEntry } from '@/lib/integrations/cafe24/trash-purge';
import { logAdminAction } from './admin-logs';
import { getString, getStoragePathsForRemoval, validateBatchSize } from '@/lib/utils/form-helpers';

type Cafe24SyncFeedback = {
  status: 'synced' | 'warning' | 'failed' | 'pending_auth';
  reason: string | null;
};

const CAFE24_SYNC_CONCURRENCY = 6;
const CAFE24_MISSING_LINK_SYNC_CONCURRENCY = 4;

function toCafe24SyncFeedback(
  result: Awaited<ReturnType<typeof syncArtworkToCafe24>>
): Cafe24SyncFeedback {
  if (result.ok) {
    return {
      status: result.reason ? 'warning' : 'synced',
      reason: result.reason || null,
    };
  }

  const reason = result.reason || null;
  if (reason?.includes('OAuth 연결')) {
    return {
      status: 'pending_auth',
      reason,
    };
  }

  return {
    status: 'failed',
    reason,
  };
}

type Cafe24BatchSyncResult = {
  succeeded: number;
  failed: number;
  succeededIds: string[];
  failedIds: string[];
  errors: string[];
};

type BatchArtworkMutationResult = {
  success: boolean;
  partial: boolean;
  count: number;
  succeededIds: string[];
  failedIds: string[];
  errors: string[];
};

async function syncCafe24Batch(ids: string[]): Promise<Cafe24BatchSyncResult> {
  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id)));
  if (uniqueIds.length === 0) {
    return { succeeded: 0, failed: 0, succeededIds: [], failedIds: [], errors: [] };
  }

  let cursor = 0;
  const succeededIds: string[] = [];
  const failedIds: string[] = [];
  const errors: string[] = [];

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= uniqueIds.length) return;

      const id = uniqueIds[index];
      try {
        const result = await syncArtworkToCafe24(id);
        if (result.ok) {
          succeededIds.push(id);
        } else {
          failedIds.push(id);
          errors.push(`${id}: ${result.reason || '알 수 없는 오류'}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failedIds.push(id);
        errors.push(`${id}: ${message}`);
      }
    }
  };

  const workerCount = Math.min(CAFE24_SYNC_CONCURRENCY, uniqueIds.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return {
    succeeded: succeededIds.length,
    failed: failedIds.length,
    succeededIds,
    failedIds,
    errors,
  };
}

export async function deleteAdminArtwork(id: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artwork } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, cafe24_product_no, artist_id, created_at, updated_at'
    )
    .eq('id', id)
    .single();

  if (artwork) {
    const cafe24Cleanup = await purgeCafe24ProductsFromTrashEntry({
      targetType: 'artwork',
      beforeSnapshot: artwork,
    });
    if (cafe24Cleanup.failed > 0) {
      throw new Error(`카페24 상품 삭제 실패: ${cafe24Cleanup.errors.join(' | ')}`);
    }
  }

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

  const syncResult = await syncArtworkToCafe24(id);

  return { success: true, cafe24: toCafe24SyncFeedback(syncResult) };
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
      shop_url: null,
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

  const syncResult = await syncArtworkToCafe24(artwork.id);

  return { success: true, id: artwork.id, cafe24: toCafe24SyncFeedback(syncResult) };
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

  const syncResult = await syncArtworkToCafe24(id);

  return { success: true, cafe24: toCafe24SyncFeedback(syncResult) };
}

type MissingPurchaseLinkSyncError = {
  id: string;
  title: string;
  reason: string;
};

type MissingPurchaseLinkSyncResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: MissingPurchaseLinkSyncError[];
};

export async function syncMissingArtworkPurchaseLinks(): Promise<MissingPurchaseLinkSyncResult> {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: targets, error } = await supabase
    .from('artworks')
    .select('id, title')
    .or(
      'shop_url.is.null,shop_url.eq.,cafe24_product_no.is.null,cafe24_sync_status.in.(failed,pending_auth)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`동기화 대상 조회 실패: ${error.message}`);
  }

  const rows = targets || [];
  if (rows.length === 0) {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };
  }

  let succeeded = 0;
  const errors: MissingPurchaseLinkSyncError[] = [];
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= rows.length) return;

      const row = rows[index];
      try {
        const result = await syncArtworkToCafe24(row.id);
        if (result.ok) {
          succeeded += 1;
          continue;
        }

        errors.push({
          id: row.id,
          title: row.title || '(제목 없음)',
          reason: result.reason || '알 수 없는 오류',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          id: row.id,
          title: row.title || '(제목 없음)',
          reason: message,
        });
      }
    }
  };

  const workerCount = Math.min(CAFE24_MISSING_LINK_SYNC_CONCURRENCY, rows.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const failed = errors.length;

  revalidatePath('/admin/artworks');
  revalidatePath('/artworks');
  revalidatePath('/');

  await logAdminAction(
    'batch_cafe24_missing_shop_url_sync',
    'artwork',
    rows.map((row) => row.id).join(','),
    {
      total: rows.length,
      succeeded,
      failed,
    },
    admin.id,
    {
      summary: `구매 링크 누락 작품 동기화: ${succeeded}/${rows.length} 성공`,
      afterSnapshot: {
        succeeded,
        failed,
        errors,
      },
      reversible: false,
    }
  );

  return {
    total: rows.length,
    succeeded,
    failed,
    errors,
  };
}

// Batch operations
export async function batchUpdateArtworkStatus(ids: string[], status: string) {
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

  const syncBatchResult = await syncCafe24Batch(ids);
  if (syncBatchResult.failed > 0) {
    const beforeMap = new Map((beforeArtworks || []).map((artwork) => [artwork.id, artwork]));
    const rollbackErrors: string[] = [];

    for (const failedId of syncBatchResult.failedIds) {
      const before = beforeMap.get(failedId);
      if (!before) continue;
      const { error } = await supabase
        .from('artworks')
        .update({
          status: before.status,
          sold_at: before.sold_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', failedId);
      if (error) {
        rollbackErrors.push(`${failedId}: ${error.message}`);
      }
    }

    revalidatePath('/artworks');
    revalidatePath('/');
    revalidatePath('/admin/artworks');

    if (rollbackErrors.length > 0) {
      throw new Error(
        `카페24 동기화 실패 후 롤백 실패: ${rollbackErrors.join(' | ')} | sync: ${syncBatchResult.errors.join(
          ' | '
        )}`
      );
    }

    return {
      success: false,
      partial: true,
      count: syncBatchResult.succeededIds.length,
      succeededIds: syncBatchResult.succeededIds,
      failedIds: syncBatchResult.failedIds,
      errors: syncBatchResult.errors,
    } satisfies BatchArtworkMutationResult;
  }

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

  return {
    success: true,
    partial: false,
    count: ids.length,
    succeededIds: ids,
    failedIds: [],
    errors: [],
  } satisfies BatchArtworkMutationResult;
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
    let { data: sales, error: salesError } = await supabase
      .from('artwork_sales')
      .select('quantity')
      .eq('artwork_id', artworkId)
      .is('voided_at', null);

    if (salesError && salesError.message.includes('voided_at')) {
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

  const syncResult = await syncArtworkToCafe24(artworkId);

  return {
    success: true,
    cafe24: toCafe24SyncFeedback(syncResult),
  };
}

export async function batchToggleHidden(ids: string[], isHidden: boolean) {
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

  const syncBatchResult = await syncCafe24Batch(ids);
  if (syncBatchResult.failed > 0) {
    const beforeMap = new Map((beforeArtworks || []).map((artwork) => [artwork.id, artwork]));
    const rollbackErrors: string[] = [];

    for (const failedId of syncBatchResult.failedIds) {
      const before = beforeMap.get(failedId);
      if (!before) continue;
      const { error: rollbackError } = await supabase
        .from('artworks')
        .update({
          is_hidden: before.is_hidden,
          updated_at: new Date().toISOString(),
        })
        .eq('id', failedId);
      if (rollbackError) {
        rollbackErrors.push(`${failedId}: ${rollbackError.message}`);
      }
    }

    revalidatePath('/artworks');
    revalidatePath('/');
    revalidatePath('/admin/artworks');

    if (rollbackErrors.length > 0) {
      throw new Error(
        `카페24 동기화 실패 후 롤백 실패: ${rollbackErrors.join(' | ')} | sync: ${syncBatchResult.errors.join(
          ' | '
        )}`
      );
    }

    return {
      success: false,
      partial: true,
      count: syncBatchResult.succeededIds.length,
      succeededIds: syncBatchResult.succeededIds,
      failedIds: syncBatchResult.failedIds,
      errors: syncBatchResult.errors,
    } satisfies BatchArtworkMutationResult;
  }

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
  const supabase = await createSupabaseAdminOrServerClient();

  // Keep full snapshots so deleted rows can be restored from activity logs.
  const { data: artworks } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, cafe24_product_no, artist_id, created_at, updated_at'
    )
    .in('id', ids);

  const purgedArtworkIds: string[] = [];
  for (const artwork of artworks || []) {
    const cafe24Cleanup = await purgeCafe24ProductsFromTrashEntry({
      targetType: 'artwork',
      beforeSnapshot: artwork,
    });
    if (cafe24Cleanup.failed > 0) {
      const rollback = await syncCafe24Batch(purgedArtworkIds);
      if (rollback.failed > 0) {
        throw new Error(
          `카페24 상품 삭제 실패(작품 ${artwork.id}): ${cafe24Cleanup.errors.join(
            ' | '
          )} | 롤백 실패: ${rollback.errors.join(' | ')}`
        );
      }
      throw new Error(
        `카페24 상품 삭제 실패(작품 ${artwork.id}): ${cafe24Cleanup.errors.join(' | ')}`
      );
    }
    if (cafe24Cleanup.deleted > 0 && typeof artwork.id === 'string' && artwork.id) {
      purgedArtworkIds.push(artwork.id);
    }
  }

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
