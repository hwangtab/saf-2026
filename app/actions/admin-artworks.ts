'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import type { Database } from '@/types/supabase';
import { logAdminAction } from './activity-log-writer';
import {
  getString,
  getStoragePathsForRemoval,
  validateBatchSize,
  buildArtworkSizeFields,
} from '@/lib/utils/form-helpers';
import {
  parseUrlList,
  validateArtworkData,
  validateImageUrls,
  validateSaleInput,
} from '@/lib/actions/artwork-validation';
import { normalizeAdminTagInput, type AdminTagInput } from '@/lib/admin-artwork-tags';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { hasActiveOrdersForArtworks } from '@/lib/orders/active-order-guard';

type EditionType = Database['public']['Enums']['edition_type'];
type ArtworkStatus = Database['public']['Enums']['artwork_status'];
const ADMIN_ARTWORK_MAX_IMAGES = 10;
const INTERNAL_ARTWORK_REVALIDATE_PATH = '/api/internal/revalidate-artwork-surfaces';

function getInternalRevalidateBaseUrl(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) return siteUrl.replace(/\/+$/, '');

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;

  return null;
}

function schedulePublicArtworkSurfaceRevalidation(artistNames: Array<string | null | undefined>) {
  const baseUrl = getInternalRevalidateBaseUrl();
  const cronSecret = process.env.CRON_SECRET;

  if (!baseUrl || !cronSecret) {
    console.error(
      '[admin-artworks] public artwork revalidation skipped: missing NEXT_PUBLIC_SITE_URL/VERCEL_URL or CRON_SECRET'
    );
    return;
  }

  const normalizedArtistNames = artistNames
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim());

  after(async () => {
    try {
      const response = await fetch(`${baseUrl}${INTERNAL_ARTWORK_REVALIDATE_PATH}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${cronSecret}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ artistNames: normalizedArtistNames }),
      });

      if (!response.ok) {
        console.error(
          `[admin-artworks] public artwork revalidation route failed: ${response.status}`
        );
      }
    } catch (err) {
      console.error('[admin-artworks] public artwork revalidation route failed:', err);
    }
  });
}

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
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  artworkId: string
): Promise<'available' | 'sold' | 'reserved'> {
  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, status, sold_at, edition_type, edition_limit, manual_sold_override')
    .eq('id', artworkId)
    .single();

  if (!artwork) return 'available';

  if (artwork.manual_sold_override && artwork.status === 'sold') {
    if (!artwork.sold_at) {
      await supabase
        .from('artworks')
        .update({
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artworkId);
    }
    return 'sold';
  }

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
        manual_sold_override: false,
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
  const supabase = await requireAdminClient();

  const { data: artwork, error: artworkFetchError } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, artist_id, created_at, updated_at'
    )
    .eq('id', id)
    .single();

  if (artworkFetchError) {
    if ((artworkFetchError as { code?: string }).code === 'PGRST116') {
      throw new Error('작품을 찾을 수 없습니다.');
    }
    throw artworkFetchError;
  }
  if (!artwork) {
    throw new Error('작품을 찾을 수 없습니다.');
  }

  if (await hasActiveOrdersForArtworks(supabase, [id])) {
    throw new Error('진행 중인 주문이 있어 삭제할 수 없습니다.');
  }

  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) {
    // order_items/orders FK는 ON DELETE NO ACTION(회계 기록 보존). 환불·취소된 과거
    // 주문이라도 행이 남아 있으면 DELETE가 23503으로 실패한다. raw FK 에러 대신 운영자가
    // 이해할 수 있는 안내로 변환한다(삭제 대신 '숨김' 권장). 회귀: 2026-06-19 삭제 멈춤.
    if ((error as { code?: string }).code === '23503') {
      throw new Error(
        '주문·판매 이력이 연결돼 있어 삭제할 수 없습니다. 작품을 "숨김" 처리해 목록에서 가려주세요.'
      );
    }
    throw error;
  }

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
  const supabase = await requireAdminClient();

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
  const supabase = await requireAdminClient();

  const { data, error } = await supabase.from('artists').select('id, name_ko').order('name_ko');

  if (error) throw error;
  return data || [];
}

export async function updateArtworkDetails(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const dataValidation = validateArtworkData(formData);
  if (dataValidation.error) throw new Error(dataValidation.error);

  const title = getString(formData, 'title');
  const title_en = getString(formData, 'title_en') || null;
  const admin_product_name = getString(formData, 'admin_product_name') || null;
  const description = getString(formData, 'description');
  const sizeFields = buildArtworkSizeFields(formData);
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
  const tone = formData
    .getAll('tone')
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
  const quote = getString(formData, 'quote') || null;
  const quote_en = getString(formData, 'quote_en') || null;

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
      ...sizeFields,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      tax_type,
      category,
      tone: tone.length ? tone : null,
      quote,
      quote_en,
      artist_id: artist_id || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  const { data: newArtwork } = await supabase
    .from('artworks')
    .select(
      'id, title, admin_product_name, artist_id, description, size, material, year, edition, edition_type, edition_limit, price, tax_type, status, sold_at, images, tone, is_hidden, shop_url, updated_at'
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

async function createAdminArtworkRecord(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const dataValidation = validateArtworkData(formData);
  if (dataValidation.error) throw new Error(dataValidation.error);

  const title = getString(formData, 'title');
  const title_en = getString(formData, 'title_en') || null;
  const admin_product_name = getString(formData, 'admin_product_name') || null;
  const description = getString(formData, 'description');
  const sizeFields = buildArtworkSizeFields(formData);
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
  const tone = formData
    .getAll('tone')
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
  const quote = getString(formData, 'quote') || null;
  const quote_en = getString(formData, 'quote_en') || null;
  const imageOwnerPrefix = getString(formData, 'image_owner_prefix');
  const imageList = parseUrlList(formData.get('images'), '이미지');
  if (imageList.error) throw new Error(imageList.error);
  if (imageList.urls.length > ADMIN_ARTWORK_MAX_IMAGES) {
    throw new Error(`이미지는 최대 ${ADMIN_ARTWORK_MAX_IMAGES}장까지 등록할 수 있습니다.`);
  }
  if (imageList.urls.length > 0) {
    if (!imageOwnerPrefix.startsWith('admin-artwork-draft-')) {
      throw new Error('이미지 업로드 경로가 올바르지 않습니다.');
    }
    const imageValidation = validateImageUrls(imageList.urls, imageOwnerPrefix);
    if (imageValidation.error) throw new Error(imageValidation.error);
  }

  if (!artist_id) throw new Error('작가를 선택해주세요.');

  const { data: artwork, error } = await supabase
    .from('artworks')
    .insert({
      title,
      title_en,
      admin_product_name,
      description,
      ...sizeFields,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      tax_type,
      category,
      tone: tone.length ? tone : null,
      quote,
      quote_en,
      shop_url: null,
      artist_id,
      status: 'available',
      is_hidden: false,
      images: imageList.urls,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('artwork_created', 'artwork', artwork.id, { title }, admin.id, {
    afterSnapshot: artwork,
    reversible: true,
  });

  let artistName: string | null = null;
  const { data: artist } = await supabase
    .from('artists')
    .select('name_ko')
    .eq('id', artist_id)
    .single();
  artistName = artist?.name_ko ?? null;

  // 등록 응답에는 관리자 목록만 가볍게 싣고, 공개면 tag/path 무효화는 응답 후 수행한다.
  // 하드 내비게이션 기반 등록 UX를 유지하면서도 KO/EN 목록·API tag·작가 경로는 같은 정책으로 갱신한다.
  revalidatePath('/admin/artworks');
  schedulePublicArtworkSurfaceRevalidation([artistName]);

  return artwork;
}

export async function createAdminArtwork(formData: FormData) {
  const artwork = await createAdminArtworkRecord(formData);
  return { success: true, id: artwork.id };
}

export async function updateArtworkImages(id: string, images: string[]) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: beforeArtwork } = await supabase
    .from('artworks')
    .select('id, title, images, updated_at')
    .eq('id', id)
    .single();

  // 낙관적 잠금: beforeArtwork.updated_at 기준으로 UPDATE 조건 추가 — 두 관리자가
  // 동시에 이미지를 편집할 때 한쪽의 업로드 URL이 사라지고 storage path가 삭제되는
  // 비가역적 orphan 사고를 방지.
  const { data: updatedRows, error } = await supabase
    .from('artworks')
    .update({
      images,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('updated_at', beforeArtwork?.updated_at ?? '')
    .select('id');

  if (error) throw error;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('다른 관리자가 먼저 수정했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
  }

  // storage cleanup은 UPDATE 성공 분기에서만 실행 (race 패배 시 orphan 삭제 방지)
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
  const supabase = await requireAdminClient();

  if (!['available', 'reserved', 'sold'].includes(status)) {
    throw new Error('Invalid status');
  }

  const { data: beforeArtworks } = await supabase
    .from('artworks')
    .select('id, title, status, sold_at, manual_sold_override, updated_at')
    .in('id', ids);

  const nowIso = new Date().toISOString();
  if (status === 'sold') {
    const { error: statusOnlyError } = await supabase
      .from('artworks')
      .update({
        status,
        manual_sold_override: true,
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
        manual_sold_override: false,
        updated_at: nowIso,
      })
      .in('id', ids);

    if (error) throw error;
  }

  const { data: afterArtworks } = await supabase
    .from('artworks')
    .select('id, title, status, sold_at, manual_sold_override, updated_at')
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
  const supabase = await requireAdminClient();

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
  const supabase = await requireAdminClient();

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
  const supabase = await requireAdminClient();

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
  const supabase = await requireAdminClient();

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
  const supabase = await requireAdminClient();

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
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  validateBatchSize(ids);

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
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  validateBatchSize(ids);

  // Keep full snapshots so deleted rows can be restored from activity logs.
  const { data: artworks, error: artworkFetchError } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, artist_id, created_at, updated_at'
    )
    .in('id', ids);
  if (artworkFetchError) throw artworkFetchError;

  const foundIds = (artworks || [])
    .map((artwork) => artwork.id)
    .filter((id): id is string => typeof id === 'string');
  const foundSet = new Set(foundIds);
  const missingIds = ids.filter((id) => !foundSet.has(id));

  if (foundIds.length === 0) {
    throw new Error('선택한 작품을 찾을 수 없습니다.');
  }

  if (await hasActiveOrdersForArtworks(supabase, ids)) {
    throw new Error('진행 중인 주문이 있는 작품이 포함되어 삭제할 수 없습니다.');
  }

  const { error } = await supabase.from('artworks').delete().in('id', foundIds);
  if (error) {
    // 단건 삭제와 동일: order_items/orders FK(NO ACTION) 때문에 주문 이력 있는 작품이
    // 하나라도 끼면 일괄 DELETE가 23503으로 실패. 운영자 안내 메시지로 변환.
    if ((error as { code?: string }).code === '23503') {
      throw new Error(
        '선택한 작품 중 주문·판매 이력이 연결된 작품이 있어 삭제할 수 없습니다. 해당 작품은 "숨김" 처리해 주세요.'
      );
    }
    throw error;
  }

  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_deleted',
    'artwork',
    foundIds.join(','),
    {
      count: foundIds.length,
      missing_count: missingIds.length,
      storage_cleanup_deferred: true,
    },
    admin.id,
    {
      summary: `작품 일괄 삭제: ${foundIds.length}건`,
      beforeSnapshot: { items: artworks || [] },
      afterSnapshot: null,
      reversible: true,
    }
  );

  return {
    success: true,
    partial: missingIds.length > 0,
    count: foundIds.length,
    succeededIds: foundIds,
    failedIds: missingIds,
    errors: missingIds.map((id) => `${id}: 작품을 찾을 수 없습니다.`),
  } satisfies BatchArtworkMutationResult;
}

function normalizeTagInput(input: AdminTagInput) {
  return normalizeAdminTagInput(input);
}

export async function getAdminTags(includeArchived = false) {
  await requireAdmin();
  const supabase = await requireAdminClient();

  let query = supabase
    .from('admin_tags')
    .select('id, name, slug, color, description, archived_at, created_at, updated_at')
    .order('name', { ascending: true });

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getArtworkAdminTags(artworkId: string) {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from('artwork_admin_tags')
    .select('admin_tags(id, name, slug, color, description, archived_at, created_at, updated_at)')
    .eq('artwork_id', artworkId);

  if (error) throw error;

  return (data || [])
    .map((row) => (Array.isArray(row.admin_tags) ? row.admin_tags[0] : row.admin_tags))
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export async function createAdminTag(input: AdminTagInput) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const tag = normalizeTagInput(input);

  const { data: archivedMatch, error: archivedError } = await supabase
    .from('admin_tags')
    .select('id, name, archived_at')
    .eq('slug', tag.slug)
    .not('archived_at', 'is', null)
    .maybeSingle();

  if (archivedError) throw archivedError;
  if (archivedMatch) {
    throw new Error('보관 처리된 동일한 이름의 태그가 있습니다. 기존 태그를 수정해 주세요.');
  }

  const { data, error } = await supabase
    .from('admin_tags')
    .insert({
      ...tag,
      created_by: admin.id,
      updated_by: admin.id,
    })
    .select('id, name, slug, color, description, archived_at, created_at, updated_at')
    .single();

  if (error?.code === '23505') {
    throw new Error('이미 같은 이름의 태그가 있습니다.');
  }
  if (error) throw error;

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_created', 'admin_tag', data.id, { name: data.name }, admin.id, {
    summary: `관리자 태그 생성: ${data.name}`,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function updateAdminTag(id: string, input: AdminTagInput) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const tag = normalizeTagInput(input);

  const { data: before } = await supabase
    .from('admin_tags')
    .select('id, name, slug, color, description, archived_at, updated_at')
    .eq('id', id)
    .single();

  if (before?.archived_at) {
    throw new Error('보관 처리된 태그는 수정할 수 없습니다.');
  }

  const { data, error } = await supabase
    .from('admin_tags')
    .update({
      ...tag,
      updated_by: admin.id,
    })
    .eq('id', id)
    .is('archived_at', null)
    .select('id, name, slug, color, description, archived_at, created_at, updated_at')
    .single();

  if (error?.code === '23505') {
    throw new Error('이미 같은 이름의 태그가 있습니다.');
  }
  if (error) throw error;

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_updated', 'admin_tag', id, { name: data.name }, admin.id, {
    summary: `관리자 태그 수정: ${data.name}`,
    beforeSnapshot: before || null,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function archiveAdminTag(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: before } = await supabase
    .from('admin_tags')
    .select('id, name, slug, color, description, archived_at, updated_at')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('admin_tags')
    .update({
      archived_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq('id', id)
    .is('archived_at', null)
    .select('id, name, slug, color, description, archived_at, created_at, updated_at')
    .single();

  if (error) throw error;

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_archived', 'admin_tag', id, { name: data.name }, admin.id, {
    summary: `관리자 태그 보관: ${data.name}`,
    beforeSnapshot: before || null,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function restoreAdminTag(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: before } = await supabase
    .from('admin_tags')
    .select('id, name, slug, color, description, archived_at, updated_at')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('admin_tags')
    .update({
      archived_at: null,
      updated_by: admin.id,
    })
    .eq('id', id)
    .not('archived_at', 'is', null)
    .select('id, name, slug, color, description, archived_at, created_at, updated_at')
    .single();

  if (error) throw error;

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_restored', 'admin_tag', id, { name: data.name }, admin.id, {
    summary: `관리자 태그 복원: ${data.name}`,
    beforeSnapshot: before || null,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function deleteAdminTag(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: tag, error: tagError } = await supabase
    .from('admin_tags')
    .select('id, name, slug, color, description, archived_at, created_at, updated_at')
    .eq('id', id)
    .single();

  if (tagError) throw tagError;

  const { data: links, error: linksError } = await supabase
    .from('artwork_admin_tags')
    .select('artwork_id, tag_id')
    .eq('tag_id', id);

  if (linksError) throw linksError;

  const artworkIds = [...new Set((links || []).map((link) => link.artwork_id))];

  const { error } = await supabase.from('admin_tags').delete().eq('id', id);

  if (error) throw error;

  revalidatePath('/admin/artworks');
  for (const artworkId of artworkIds) {
    revalidatePath(`/admin/artworks/${artworkId}`);
  }

  await logAdminAction(
    'admin_tag_deleted',
    'admin_tag',
    id,
    { name: tag.name, artwork_count: artworkIds.length },
    admin.id,
    {
      summary: `관리자 태그 영구 삭제: ${tag.name} (${artworkIds.length}개 작품 연결 제거)`,
      beforeSnapshot: { tag, links: links || [] },
      afterSnapshot: null,
      reversible: false,
    }
  );

  return { success: true, tagId: id, artworkIds, count: artworkIds.length };
}

export async function createAndAttachAdminTagToArtwork(artworkId: string, input: AdminTagInput) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const tag = normalizeTagInput(input);

  const { data: archivedMatch, error: archivedError } = await supabase
    .from('admin_tags')
    .select('id, name, archived_at')
    .eq('slug', tag.slug)
    .not('archived_at', 'is', null)
    .maybeSingle();

  if (archivedError) throw archivedError;
  if (archivedMatch) {
    throw new Error('보관 처리된 동일한 이름의 태그가 있습니다. 기존 태그를 복원해 주세요.');
  }

  const { data: createdTag, error: createError } = await supabase
    .from('admin_tags')
    .insert({
      ...tag,
      created_by: admin.id,
      updated_by: admin.id,
    })
    .select('id, name, slug, color, description, archived_at, created_at, updated_at')
    .single();

  if (createError?.code === '23505') {
    throw new Error('이미 같은 이름의 태그가 있습니다.');
  }
  if (createError) throw createError;

  const { error: attachError } = await supabase.from('artwork_admin_tags').insert({
    artwork_id: artworkId,
    tag_id: createdTag.id,
    created_by: admin.id,
  });

  if (attachError) {
    await supabase
      .from('admin_tags')
      .update({
        archived_at: new Date().toISOString(),
        updated_by: admin.id,
      })
      .eq('id', createdTag.id);
    throw attachError;
  }

  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);

  await logAdminAction(
    'admin_tag_created_and_attached',
    'artwork',
    artworkId,
    { tag_id: createdTag.id, tag_name: createdTag.name },
    admin.id,
    {
      summary: `관리자 태그 생성 및 작품 추가: ${createdTag.name}`,
      afterSnapshot: { artwork_id: artworkId, tag: createdTag },
      reversible: false,
    }
  );

  return createdTag;
}

export async function addAdminTagToArtworks(artworkIds: string[], tagId: string) {
  if (artworkIds.length === 0) {
    return { success: true, count: 0 };
  }
  validateBatchSize(artworkIds);
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: tag, error: tagError } = await supabase
    .from('admin_tags')
    .select('id, name, archived_at')
    .eq('id', tagId)
    .single();

  if (tagError) throw tagError;
  if (tag.archived_at) {
    throw new Error('보관 처리된 태그는 추가할 수 없습니다.');
  }

  const rows = [...new Set(artworkIds)].map((artworkId) => ({
    artwork_id: artworkId,
    tag_id: tagId,
    created_by: admin.id,
  }));

  const { error } = await supabase.from('artwork_admin_tags').upsert(rows, {
    onConflict: 'artwork_id,tag_id',
    ignoreDuplicates: true,
  });

  if (error) throw error;

  revalidatePath('/admin/artworks');
  for (const artworkId of artworkIds) {
    revalidatePath(`/admin/artworks/${artworkId}`);
  }

  await logAdminAction(
    'artwork_admin_tag_added',
    'artwork',
    artworkIds.join(','),
    { count: rows.length, tag_id: tagId, tag_name: tag.name },
    admin.id,
    {
      summary: `작품 내부 태그 추가: ${tag.name} (${rows.length}건)`,
      afterSnapshot: { artwork_ids: artworkIds, tag },
      reversible: false,
    }
  );

  return { success: true, count: rows.length };
}

export async function removeAdminTagFromArtworks(artworkIds: string[], tagId: string) {
  if (artworkIds.length === 0) {
    return { success: true, count: 0 };
  }
  validateBatchSize(artworkIds);
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from('artwork_admin_tags')
    .select('artwork_id, tag_id, admin_tags(name)')
    .in('artwork_id', artworkIds)
    .eq('tag_id', tagId);

  if (existingError) throw existingError;

  const { error } = await supabase
    .from('artwork_admin_tags')
    .delete()
    .in('artwork_id', artworkIds)
    .eq('tag_id', tagId);

  if (error) throw error;

  revalidatePath('/admin/artworks');
  for (const artworkId of artworkIds) {
    revalidatePath(`/admin/artworks/${artworkId}`);
  }

  const firstTag = Array.isArray(existing?.[0]?.admin_tags)
    ? existing?.[0]?.admin_tags[0]
    : existing?.[0]?.admin_tags;
  const tagName = firstTag?.name || tagId;

  await logAdminAction(
    'artwork_admin_tag_removed',
    'artwork',
    artworkIds.join(','),
    { count: existing?.length || 0, tag_id: tagId, tag_name: tagName },
    admin.id,
    {
      summary: `작품 내부 태그 제거: ${tagName} (${existing?.length || 0}건)`,
      beforeSnapshot: { items: existing || [] },
      reversible: false,
    }
  );

  return { success: true, count: existing?.length || 0 };
}
