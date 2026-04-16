'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import type { Database } from '@/types/supabase';
import { requireArtistActive } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logArtistAction } from './activity-log-writer';
import {
  MAX_IMAGES,
  getOwnedCleanupPaths,
  parseUrlList,
  validateImageUrls,
  cleanupUploads,
  validateArtworkData,
} from '@/lib/actions/artwork-validation';
import { getString } from '@/lib/utils/form-helpers';
import { getActionErrorMessage } from '@/lib/utils/action-error';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { ActionState } from '@/types';

export type { ActionState } from '@/types';

type EditionType = Database['public']['Enums']['edition_type'];
type ArtworkStatus = Database['public']['Enums']['artwork_status'];

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function buildRedirectPath(result: 'created' | 'updated') {
  return `/dashboard/artworks?result=${result}`;
}

export async function createArtwork(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let supabase: SupabaseServerClient | null = null;
  let cleanupUrls: string[] = [];
  let artistId: string | null = null;
  let redirectPath = buildRedirectPath('created');
  try {
    void prevState;
    const user = await requireArtistActive();
    supabase = await createSupabaseServerClient();

    // 1. Get Artist ID
    const { data: artist } = await supabase
      .from('artists')
      .select('id, name_ko')
      .eq('user_id', user.id)
      .single();

    if (!artist) throw new Error('Artist profile not found.');
    artistId = artist.id;

    // 2. Extract Data
    const title = getString(formData, 'title');
    const title_en = getString(formData, 'title_en') || null;
    const description = getString(formData, 'description');
    const size = getString(formData, 'size');
    const material = getString(formData, 'material');
    const year = getString(formData, 'year');
    const edition = getString(formData, 'edition');
    const rawEditionType = getString(formData, 'edition_type') || 'unique';
    const edition_type = (
      ['unique', 'limited', 'open'].includes(rawEditionType) ? rawEditionType : 'unique'
    ) as EditionType;
    const edition_limit_str = getString(formData, 'edition_limit');
    const edition_limit =
      edition_type === 'limited' && edition_limit_str ? Number(edition_limit_str) : null;
    const price = getString(formData, 'price');
    const category = getString(formData, 'category') || null;
    const rawStatus = getString(formData, 'status') || 'available';
    const status = (
      ['available', 'reserved', 'sold'].includes(rawStatus) ? rawStatus : 'available'
    ) as ArtworkStatus;
    const { urls: images, error: imagesError } = parseUrlList(formData.get('images'), '이미지');
    const { urls: newUploads, error: newUploadsError } = parseUrlList(
      formData.get('new_uploads'),
      '신규 업로드'
    );

    cleanupUrls = newUploads;

    if (imagesError || newUploadsError) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return {
        message: imagesError || newUploadsError || '입력 형식이 올바르지 않습니다.',
        error: true,
        cleanupUrls,
      };
    }

    if (images.length === 0 || images.length > MAX_IMAGES) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return {
        message: `이미지는 1~${MAX_IMAGES}장까지 등록할 수 있습니다.`,
        error: true,
        cleanupUrls,
      };
    }

    const validationResult = validateImageUrls(images, artist.id);
    if (validationResult.error) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: validationResult.error, error: true, cleanupUrls };
    }

    // 3. Validation (Basic)
    const dataValidation = validateArtworkData(formData);
    if (dataValidation.error) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: dataValidation.error, error: true, cleanupUrls };
    }

    const { data: insertedArtwork, error } = await supabase
      .from('artworks')
      .insert({
        artist_id: artist.id,
        title,
        title_en,
        description,
        size,
        material,
        year,
        edition,
        edition_type,
        edition_limit,
        price,
        category,
        status,
        images,
        is_hidden: false,
        shop_url: null,
      })
      .select(
        'id, title, artist_id, description, size, material, year, edition, price, status, images, is_hidden, shop_url, updated_at'
      )
      .single();

    if (error) throw error;

    const unusedUploadUrls = newUploads.filter((url) => !images.includes(url));
    if (unusedUploadUrls.length > 0) {
      await cleanupUploads(supabase, unusedUploadUrls, artist.id);
    }

    await logArtistAction(
      'artist_artwork_created',
      'artwork',
      insertedArtwork.id,
      { title: insertedArtwork.title },
      {
        summary: `작품 등록: ${insertedArtwork.title}`,
        afterSnapshot: insertedArtwork,
        reversible: true,
      }
    );

    revalidatePath('/dashboard/artworks');
    revalidatePublicArtworkSurfaces([artist.name_ko]);
  } catch (error: unknown) {
    if (supabase && artistId && cleanupUrls.length > 0) {
      await cleanupUploads(supabase, cleanupUrls, artistId);
    }
    return {
      message: getActionErrorMessage(error, '작품 등록 중 오류가 발생했습니다.'),
      error: true,
      cleanupUrls,
    };
  }

  redirect(redirectPath);
}

export async function updateArtwork(
  id: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let supabase: SupabaseServerClient | null = null;
  let cleanupUrls: string[] = [];
  let artistId: string | null = null;
  let redirectPath = buildRedirectPath('updated');
  try {
    void prevState;
    const user = await requireArtistActive();
    supabase = await createSupabaseServerClient();

    const { data: artist } = await supabase
      .from('artists')
      .select('id, name_ko')
      .eq('user_id', user.id)
      .single();
    if (!artist) throw new Error('Artist not found');
    artistId = artist.id;

    const title = getString(formData, 'title');
    const title_en = getString(formData, 'title_en') || null;
    const description = getString(formData, 'description');
    const size = getString(formData, 'size');
    const material = getString(formData, 'material');
    const year = getString(formData, 'year');
    const edition = getString(formData, 'edition');
    const rawEditionType = getString(formData, 'edition_type') || 'unique';
    const edition_type = (
      ['unique', 'limited', 'open'].includes(rawEditionType) ? rawEditionType : 'unique'
    ) as EditionType;
    const edition_limit_str = getString(formData, 'edition_limit');
    const edition_limit =
      edition_type === 'limited' && edition_limit_str ? Number(edition_limit_str) : null;
    const price = getString(formData, 'price');
    const category = getString(formData, 'category') || null;
    const rawStatus = getString(formData, 'status') || 'available';
    const status = (
      ['available', 'reserved', 'sold'].includes(rawStatus) ? rawStatus : 'available'
    ) as ArtworkStatus;
    const hidden = formData.get('hidden') === 'on';
    const { urls: images, error: imagesError } = parseUrlList(formData.get('images'), '이미지');
    const { urls: newUploads, error: newUploadsError } = parseUrlList(
      formData.get('new_uploads'),
      '신규 업로드'
    );

    cleanupUrls = newUploads;

    if (imagesError || newUploadsError) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return {
        message: imagesError || newUploadsError || '입력 형식이 올바르지 않습니다.',
        error: true,
        cleanupUrls,
      };
    }

    if (images.length === 0 || images.length > MAX_IMAGES) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return {
        message: `이미지는 1~${MAX_IMAGES}장까지 등록할 수 있습니다.`,
        error: true,
        cleanupUrls,
      };
    }

    const validationResult = validateImageUrls(images, artist.id);
    if (validationResult.error) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: validationResult.error, error: true, cleanupUrls };
    }

    const dataValidation = validateArtworkData(formData);
    if (dataValidation.error) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: dataValidation.error, error: true, cleanupUrls };
    }

    const { data: beforeArtwork } = await supabase
      .from('artworks')
      .select(
        'id, title, artist_id, description, size, material, year, edition, price, status, images, is_hidden, shop_url, updated_at'
      )
      .eq('id', id)
      .eq('artist_id', artist.id)
      .single();

    const { error } = await supabase
      .from('artworks')
      .update({
        title,
        title_en,
        description,
        size,
        material,
        year,
        edition,
        edition_type,
        edition_limit,
        price,
        category,
        status,
        is_hidden: hidden,
        images,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('artist_id', artist.id); // Security check via query addition, though RLS handles it too

    if (error) throw error;

    const unusedUploadUrls = newUploads.filter((url) => !images.includes(url));
    if (unusedUploadUrls.length > 0) {
      await cleanupUploads(supabase, unusedUploadUrls, artist.id);
    }

    const previousImages = Array.isArray(beforeArtwork?.images)
      ? beforeArtwork.images.filter(
          (image): image is string => typeof image === 'string' && image.length > 0
        )
      : [];
    const removedUrls = previousImages.filter((url) => !images.includes(url));
    const removalPaths = getOwnedCleanupPaths(removedUrls, artist.id);
    if (removalPaths.length > 0) {
      const { error: removeError } = await supabase.storage.from('artworks').remove(removalPaths);
      if (removeError) {
        console.error('[updateArtwork] orphan cleanup failed:', removeError.message);
      }
    }

    const { data: afterArtwork } = await supabase
      .from('artworks')
      .select(
        'id, title, artist_id, description, size, material, year, edition, price, status, images, is_hidden, shop_url, updated_at'
      )
      .eq('id', id)
      .eq('artist_id', artist.id)
      .single();

    await logArtistAction(
      'artist_artwork_updated',
      'artwork',
      id,
      { title },
      {
        summary: `작품 수정: ${title}`,
        beforeSnapshot: beforeArtwork || null,
        afterSnapshot: afterArtwork || null,
        reversible: true,
      }
    );

    revalidatePath('/dashboard/artworks');
    revalidatePath(`/artworks/${id}`);
    revalidatePublicArtworkSurfaces([artist.name_ko]);
  } catch (error: unknown) {
    if (supabase && artistId && cleanupUrls.length > 0) {
      await cleanupUploads(supabase, cleanupUrls, artistId);
    }
    return {
      message: getActionErrorMessage(error, '작품 수정 중 오류가 발생했습니다.'),
      error: true,
      cleanupUrls,
    };
  }

  redirect(redirectPath);
}

export async function deleteArtwork(id: string): Promise<ActionState> {
  try {
    const user = await requireArtistActive();
    const supabase = await createSupabaseServerClient();

    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!artist) {
      return { message: '아티스트 프로필을 찾을 수 없습니다.', error: true };
    }

    const { data: artwork } = await supabase
      .from('artworks')
      .select(
        'id, title, images, artist_id, description, size, material, year, edition, price, status, sold_at, is_hidden, shop_url, created_at, updated_at'
      )
      .eq('id', id)
      .eq('artist_id', artist.id)
      .single();

    const { error } = await supabase
      .from('artworks')
      .delete()
      .eq('id', id)
      .eq('artist_id', artist.id);

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

    revalidatePath('/dashboard/artworks');
    revalidatePublicArtworkSurfaces([artistName]);

    if (artwork) {
      await logArtistAction(
        'artist_artwork_deleted',
        'artwork',
        id,
        { title: artwork.title || id },
        {
          summary: `작품 삭제: ${artwork.title || id}`,
          beforeSnapshot: artwork,
          afterSnapshot: null,
          reversible: true,
        }
      );
    }

    return { message: '작품이 삭제되었습니다.', error: false };
  } catch (error: unknown) {
    return {
      message: getActionErrorMessage(error, '작품 삭제 중 오류가 발생했습니다.'),
      error: true,
    };
  }
}
