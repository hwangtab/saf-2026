'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import type { Database } from '@/types/supabase';
import { logAdminAction } from './activity-log-writer';
import { validateBatchSize } from '@/lib/utils/form-helpers';
import {
  batchDeleteArtworksMutation,
  batchToggleArtworkHiddenMutation,
  deleteArtworkMutation,
  type BatchArtworkMutationResult,
} from '@/lib/artworks/batch-mutations';
import {
  updateArtworkCategoryMutation,
  updateArtworkImagesMutation,
} from '@/lib/artworks/core-mutations';
import { batchUpdateArtworkStatusMutation } from '@/lib/artworks/status-mutations';
import {
  revalidatePublicArtworkDetails,
  revalidatePublicArtworkSurfaces,
} from '@/lib/utils/revalidate';
import { deriveAndSyncArtworkStatus } from '@/lib/artworks/status';

type ArtworkStatus = Database['public']['Enums']['artwork_status'];

export { deriveAndSyncArtworkStatus };
export { createAdminArtwork, updateArtworkDetails } from './admin-artwork-details';
export {
  getArtworkSales,
  recordArtworkSale,
  updateArtworkSale,
  voidArtworkSale,
} from './admin-artwork-sales';
export {
  addAdminTagToArtworks,
  archiveAdminTag,
  createAdminTag,
  createAndAttachAdminTagToArtwork,
  deleteAdminTag,
  getAdminTags,
  getArtworkAdminTags,
  removeAdminTagFromArtworks,
  restoreAdminTag,
  updateAdminTag,
} from './admin-artwork-tags';

export async function deleteAdminArtwork(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { artwork, artistName } = await deleteArtworkMutation(supabase, { id });
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

export async function updateArtworkImages(id: string, images: string[]) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { beforeArtwork, afterArtwork, removeError } = await updateArtworkImagesMutation(supabase, {
    id,
    images,
    now: new Date().toISOString(),
  });

  if (removeError) {
    console.error('[updateArtworkImages] orphan cleanup failed:', removeError.message);
  }

  revalidatePublicArtworkSurfaces();
  revalidatePublicArtworkDetails([id]);
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

  const { beforeArtworks, afterArtworks } = await batchUpdateArtworkStatusMutation(supabase, {
    ids,
    status,
    now: new Date().toISOString(),
  });

  revalidatePublicArtworkSurfaces();
  revalidatePublicArtworkDetails(ids);
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_status',
    'artwork',
    ids.join(','),
    {
      count: ids.length,
      status,
      target_names: Object.fromEntries(
        beforeArtworks.filter((a) => a.title).map((a) => [a.id, a.title])
      ),
    },
    admin.id,
    {
      summary: `작품 상태 일괄 변경: ${ids.length}건 → ${status}`,
      beforeSnapshot: { items: beforeArtworks },
      afterSnapshot: { items: afterArtworks },
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
  const { beforeArtwork } = await updateArtworkCategoryMutation(supabase, {
    id,
    category,
    now: new Date().toISOString(),
  });

  revalidatePublicArtworkSurfaces();
  revalidatePublicArtworkDetails([id]);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  await logAdminAction(
    'update_artwork_category',
    'artwork',
    id,
    { title: beforeArtwork?.title, category, previous_category: beforeArtwork?.category },
    admin.id,
    {
      summary: `작품 카테고리 변경: ${beforeArtwork?.title || id} → ${category || '없음'}`,
      beforeSnapshot: { category: beforeArtwork?.category },
      afterSnapshot: { category },
      reversible: true,
    }
  );

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

  const { beforeArtworks, afterArtworks } = await batchToggleArtworkHiddenMutation(supabase, {
    ids,
    isHidden,
    now: new Date().toISOString(),
  });

  revalidatePublicArtworkSurfaces();
  revalidatePublicArtworkDetails(ids);
  revalidatePath('/admin/artworks');

  await logAdminAction(
    'batch_artwork_visibility',
    'artwork',
    ids.join(','),
    {
      count: ids.length,
      hidden: isHidden,
      target_names: Object.fromEntries(
        beforeArtworks.filter((a) => a.title).map((a) => [a.id, a.title])
      ),
    },
    admin.id,
    {
      summary: `작품 숨김 일괄 변경: ${ids.length}건`,
      beforeSnapshot: { items: beforeArtworks },
      afterSnapshot: { items: afterArtworks },
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

export async function batchDeleteArtworks(ids: string[]): Promise<BatchArtworkMutationResult> {
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

  const { artworks, foundIds, missingIds, batchResult } = await batchDeleteArtworksMutation(
    supabase,
    { ids }
  );

  revalidatePublicArtworkSurfaces();
  revalidatePublicArtworkDetails(foundIds);
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
      beforeSnapshot: { items: artworks },
      afterSnapshot: null,
      reversible: true,
    }
  );

  return batchResult;
}
