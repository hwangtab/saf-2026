'use server';

import { revalidatePath } from 'next/cache';
import { requireExhibitor } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { syncArtworkToCafe24 } from '@/lib/integrations/cafe24/sync-artwork';
import { purgeCafe24ProductsFromTrashEntry } from '@/lib/integrations/cafe24/trash-purge';
import {
  getStoragePathFromPublicUrl,
  getString,
  getStoragePathsForRemoval,
} from '@/lib/utils/form-helpers';
import { logExhibitorAction } from './admin-logs';
import { validateArtworkData } from '@/lib/actions/artwork-validation';

type Cafe24SyncFeedback = {
  status: 'synced' | 'warning' | 'failed' | 'pending_auth';
  reason: string | null;
};

const MAX_EXHIBITOR_IMAGES = 10;

function getAllowedArtworkImagePrefixes(artistId: string, artworkId: string): string[] {
  return [`${artistId}/`, `exhibitor-artwork-${artworkId}/`];
}

function validateExhibitorArtworkImages(
  images: string[],
  allowedPrefixes: string[]
): { normalizedImages: string[] } {
  if (!Array.isArray(images)) {
    throw new Error('이미지 형식이 올바르지 않습니다.');
  }

  const normalizedImages = images
    .filter((image): image is string => typeof image === 'string')
    .map((image) => image.trim())
    .filter((image) => image.length > 0);

  if (normalizedImages.length !== images.length) {
    throw new Error('이미지 형식이 올바르지 않습니다.');
  }

  if (normalizedImages.length === 0 || normalizedImages.length > MAX_EXHIBITOR_IMAGES) {
    throw new Error(`이미지는 1~${MAX_EXHIBITOR_IMAGES}장까지 등록할 수 있습니다.`);
  }

  const paths = normalizedImages.map((image) => getStoragePathFromPublicUrl(image, 'artworks'));
  if (paths.some((path) => !path)) {
    throw new Error('유효하지 않은 이미지 URL이 포함되어 있습니다.');
  }

  const resolvedPaths = paths as string[];
  const unauthorizedPath = resolvedPaths.find(
    (path) => !allowedPrefixes.some((prefix) => path.startsWith(prefix))
  );
  if (unauthorizedPath) {
    throw new Error('허용되지 않은 이미지 경로가 포함되어 있습니다.');
  }

  return { normalizedImages };
}

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

export async function getExhibitorArtworks() {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artworks, error } = await supabase
    .from('artworks')
    .select('*, artists!inner(id, name_ko, owner_id)')
    .eq('artists.owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (artworks || []).map((artwork: any) => ({
    ...artwork,
    artists: artwork.artists || null,
  }));
}

export async function getExhibitorArtworkById(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artwork, error } = await supabase
    .from('artworks')
    .select('*, artists!inner(id, name_ko, owner_id)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (error) throw error;

  return {
    ...artwork,
    artists: artwork.artists || null,
  };
}

export async function createExhibitorArtwork(formData: FormData) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Validate Data
  const validation = validateArtworkData(formData);
  if (validation.error) {
    throw new Error(validation.error);
  }

  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const edition_type = getString(formData, 'edition_type') || 'unique';
  const edition_limit_str = getString(formData, 'edition_limit');
  const edition_limit = edition_limit_str ? parseInt(edition_limit_str) : null;
  const price = getString(formData, 'price');
  const artist_id = getString(formData, 'artist_id');

  if (!artist_id) throw new Error('작가를 선택해주세요.');

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name_ko')
    .eq('id', artist_id)
    .eq('owner_id', user.id)
    .single();

  if (artistError || !artist) {
    throw new Error('선택한 작가에 대한 권한이 없습니다.');
  }

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
      artist_id,
      status: 'available',
      is_hidden: false,
      shop_url: null,
    })
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artwork_created',
    'artwork',
    artwork.id,
    {
      title,
      artist: artist.name_ko,
    },
    {
      afterSnapshot: artwork,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artworks');
  if (artist.name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
  }

  const syncResult = await syncArtworkToCafe24(artwork.id);

  return {
    success: true,
    id: artwork.id,
    cafe24: toCafe24SyncFeedback(syncResult),
  };
}

export async function updateExhibitorArtwork(id: string, formData: FormData) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Validate Data
  const validation = validateArtworkData(formData);
  if (validation.error) {
    throw new Error(validation.error);
  }

  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const edition_type = getString(formData, 'edition_type') || 'unique';
  const edition_limit_str = getString(formData, 'edition_limit');
  const edition_limit = edition_limit_str ? parseInt(edition_limit_str) : null;
  const price = getString(formData, 'price');
  const artist_id = getString(formData, 'artist_id');

  // Fetch full existing artwork for snapshot
  const { data: oldArtwork, error: fetchError } = await supabase
    .from('artworks')
    .select('*, artists!inner(owner_id)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (fetchError || !oldArtwork) {
    throw new Error('작품을 수정할 권한이 없습니다.');
  }
  if (!oldArtwork.artist_id) {
    throw new Error('작품 작가 정보를 찾을 수 없습니다.');
  }

  if (artist_id && artist_id !== oldArtwork.artist_id) {
    const { data: newArtistCheck } = await supabase
      .from('artists')
      .select('id')
      .eq('id', artist_id)
      .eq('owner_id', user.id)
      .single();

    if (!newArtistCheck) {
      throw new Error('선택한 작가에 대한 권한이 없습니다.');
    }
  }

  const { data: newArtwork, error } = await supabase
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
      artist_id: artist_id || oldArtwork.artist_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artwork_updated',
    'artwork',
    id,
    { title },
    {
      beforeSnapshot: oldArtwork,
      afterSnapshot: newArtwork,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artworks');
  revalidatePath(`/exhibitor/artworks/${id}`);
  revalidatePath('/artworks');

  const syncResult = await syncArtworkToCafe24(id);

  return {
    success: true,
    cafe24: toCafe24SyncFeedback(syncResult),
  };
}

export async function updateExhibitorArtworkImages(id: string, images: string[]) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Fetch full existing artwork for snapshot
  const { data: oldArtwork, error: fetchError } = await supabase
    .from('artworks')
    .select('*, artists!inner(owner_id)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (fetchError || !oldArtwork) {
    throw new Error('작품을 수정할 권한이 없습니다.');
  }
  if (!oldArtwork.artist_id) {
    throw new Error('작품 작가 정보를 찾을 수 없습니다.');
  }

  const allowedPrefixes = getAllowedArtworkImagePrefixes(oldArtwork.artist_id, id);
  const { normalizedImages } = validateExhibitorArtworkImages(images, allowedPrefixes);

  const { data: newArtwork, error } = await supabase
    .from('artworks')
    .update({
      images: normalizedImages,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const previousImages = Array.isArray(oldArtwork.images)
    ? oldArtwork.images.filter(
        (image: unknown): image is string => typeof image === 'string' && image.length > 0
      )
    : [];
  const removedUrls = previousImages.filter((url: string) => !normalizedImages.includes(url));
  const removalPaths = getStoragePathsForRemoval(removedUrls, 'artworks').filter((path) =>
    allowedPrefixes.some((prefix) => path.startsWith(prefix))
  );
  if (removalPaths.length > 0) {
    const { error: removeError } = await supabase.storage.from('artworks').remove(removalPaths);
    if (removeError) {
      console.error('[updateExhibitorArtworkImages] orphan cleanup failed:', removeError.message);
    }
  }

  await logExhibitorAction(
    'exhibitor_artwork_images_updated',
    'artwork',
    id,
    {
      title: oldArtwork.title,
      imageCount: normalizedImages.length,
    },
    {
      beforeSnapshot: oldArtwork,
      afterSnapshot: newArtwork,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artworks');
  revalidatePath(`/exhibitor/artworks/${id}`);
  revalidatePath('/artworks');

  const syncResult = await syncArtworkToCafe24(id);

  return {
    success: true,
    cafe24: toCafe24SyncFeedback(syncResult),
  };
}

export async function deleteExhibitorArtwork(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Fetch full artwork for snapshot
  const { data: artwork, error: fetchError } = await supabase
    .from('artworks')
    .select('*, artists!inner(owner_id, name_ko)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (fetchError || !artwork) {
    throw new Error('작품을 삭제할 권한이 없습니다.');
  }
  if (!artwork.artist_id) {
    throw new Error('작품 작가 정보를 찾을 수 없습니다.');
  }

  const cafe24Cleanup = await purgeCafe24ProductsFromTrashEntry({
    targetType: 'artwork',
    beforeSnapshot: artwork,
  });

  if (cafe24Cleanup.failed > 0) {
    throw new Error(`카페24 상품 삭제 실패: ${cafe24Cleanup.errors.join(' | ')}`);
  }

  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artwork_deleted',
    'artwork',
    id,
    {
      title: artwork.title,
      artist: (artwork.artists as any)?.name_ko,
    },
    {
      beforeSnapshot: artwork,
      afterSnapshot: null,
      reversible: true,
    }
  );

  const allowedPrefixes = getAllowedArtworkImagePrefixes(artwork.artist_id, id);
  const paths = getStoragePathsForRemoval(artwork.images || [], 'artworks').filter((path) =>
    allowedPrefixes.some((prefix) => path.startsWith(prefix))
  );
  if (paths.length > 0) {
    await supabase.storage.from('artworks').remove(paths);
  }

  revalidatePath('/exhibitor/artworks');
  if (artwork.artists && (artwork.artists as any).name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent((artwork.artists as any).name_ko)}`);
  }

  return { success: true };
}
