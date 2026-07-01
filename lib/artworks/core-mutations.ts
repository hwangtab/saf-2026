import type { SupabaseClient } from '@supabase/supabase-js';

import { getStoragePathsForRemoval } from '@/lib/utils/form-helpers';
import type { Database } from '@/types/supabase';

export type ArtworkCoreMutationClient = SupabaseClient<Database>;

export type ArtworkImageMutationRow = {
  id: string;
  title: string | null;
  images: unknown;
  updated_at: string | null;
};

export type ArtworkCategoryMutationRow = {
  id: string;
  title: string | null;
  category: string | null;
};

export type UpdateArtworkImagesMutationInput = {
  id: string;
  images: string[];
  now: string;
};

export type UpdateArtworkImagesMutationResult = {
  beforeArtwork: ArtworkImageMutationRow | null;
  afterArtwork: ArtworkImageMutationRow | null;
  removalPaths: string[];
  removeError: { message?: string } | null;
};

export type UpdateArtworkCategoryMutationInput = {
  id: string;
  category: string | null;
  now: string;
};

export type UpdateArtworkCategoryMutationResult = {
  beforeArtwork: ArtworkCategoryMutationRow | null;
};

function getPreviousImages(beforeArtwork: ArtworkImageMutationRow | null): string[] {
  return Array.isArray(beforeArtwork?.images)
    ? beforeArtwork.images.filter(
        (image): image is string => typeof image === 'string' && image.length > 0
      )
    : [];
}

export async function updateArtworkImagesMutation(
  supabase: ArtworkCoreMutationClient,
  { id, images, now }: UpdateArtworkImagesMutationInput
): Promise<UpdateArtworkImagesMutationResult> {
  const { data: beforeArtwork } = await supabase
    .from('artworks')
    .select('id, title, images, updated_at')
    .eq('id', id)
    .single();

  if (!beforeArtwork) {
    throw new Error('작품을 찾을 수 없습니다. 삭제되었거나 권한이 없는 작품입니다.');
  }

  const { data: updatedRows, error } = await supabase
    .from('artworks')
    .update({
      images,
      updated_at: now,
    })
    .eq('id', id)
    .eq('updated_at', beforeArtwork?.updated_at ?? '')
    .select('id');

  if (error) throw error;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('다른 관리자가 먼저 수정했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
  }

  const previousImages = getPreviousImages(beforeArtwork as ArtworkImageMutationRow | null);
  const removedUrls = previousImages.filter((url) => !images.includes(url));
  const removalPaths = getStoragePathsForRemoval(removedUrls, 'artworks');
  let removeError: { message?: string } | null = null;

  if (removalPaths.length > 0) {
    const { error: storageRemoveError } = await supabase.storage
      .from('artworks')
      .remove(removalPaths);
    removeError = storageRemoveError ? { message: storageRemoveError.message } : null;
  }

  const { data: afterArtwork } = await supabase
    .from('artworks')
    .select('id, title, images, updated_at')
    .eq('id', id)
    .single();

  return {
    beforeArtwork: (beforeArtwork || null) as ArtworkImageMutationRow | null,
    afterArtwork: (afterArtwork || null) as ArtworkImageMutationRow | null,
    removalPaths,
    removeError,
  };
}

export async function updateArtworkCategoryMutation(
  supabase: ArtworkCoreMutationClient,
  { id, category, now }: UpdateArtworkCategoryMutationInput
): Promise<UpdateArtworkCategoryMutationResult> {
  const { data: beforeArtwork } = await supabase
    .from('artworks')
    .select('id, title, category')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artworks')
    .update({ category, updated_at: now })
    .eq('id', id);

  if (error) throw error;

  return {
    beforeArtwork: (beforeArtwork || null) as ArtworkCategoryMutationRow | null,
  };
}
