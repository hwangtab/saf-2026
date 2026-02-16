'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireArtistActive } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logArtistAction } from './admin-logs';
import {
  MAX_IMAGES,
  parseUrlList,
  validateImageUrls,
  cleanupUploads,
  validateArtworkData,
} from '@/lib/actions/artwork-validation';

export type ActionState = {
  message: string;
  error?: boolean;
  errors?: Record<string, string[]>;
  cleanupUrls?: string[];
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function createArtwork(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let supabase: SupabaseServerClient | null = null;
  let cleanupUrls: string[] = [];
  let artistId: string | null = null;
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
    const title = (formData.get('title') as string) || '';
    const description = formData.get('description') as string;
    const size = formData.get('size') as string;
    const material = formData.get('material') as string;
    const year = formData.get('year') as string;
    const edition = formData.get('edition') as string;
    const edition_type = (formData.get('edition_type') as string) || 'unique';
    const edition_limit_str = formData.get('edition_limit') as string;
    const edition_limit = edition_limit_str ? parseInt(edition_limit_str) : null;
    const price = (formData.get('price') as string) || '';
    const rawStatus = (formData.get('status') as string) || 'available';
    const status = ['available', 'reserved', 'sold'].includes(rawStatus) ? rawStatus : 'available';
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
        description,
        size,
        material,
        year,
        edition,
        edition_type,
        edition_limit,
        price,
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

    const artistSlug = artist.name_ko ? encodeURIComponent(artist.name_ko) : null;
    revalidatePath('/dashboard/artworks');
    revalidatePath('/artworks');
    revalidatePath('/');
    if (artistSlug) {
      revalidatePath(`/artworks/artist/${artistSlug}`);
    }
  } catch (error: any) {
    if (supabase && artistId && cleanupUrls.length > 0) {
      await cleanupUploads(supabase, cleanupUrls, artistId);
    }
    return { message: error.message, error: true, cleanupUrls };
  }

  redirect('/dashboard/artworks?result=created');
}

export async function updateArtwork(
  id: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let supabase: SupabaseServerClient | null = null;
  let cleanupUrls: string[] = [];
  let artistId: string | null = null;
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

    const title = (formData.get('title') as string) || '';
    const description = formData.get('description') as string;
    const size = formData.get('size') as string;
    const material = formData.get('material') as string;
    const year = formData.get('year') as string;
    const edition = formData.get('edition') as string;
    const edition_type = (formData.get('edition_type') as string) || 'unique';
    const edition_limit_str = formData.get('edition_limit') as string;
    const edition_limit = edition_limit_str ? parseInt(edition_limit_str) : null;
    const price = (formData.get('price') as string) || '';
    const rawStatus = (formData.get('status') as string) || 'available';
    const status = ['available', 'reserved', 'sold'].includes(rawStatus) ? rawStatus : 'available';
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
        description,
        size,
        material,
        year,
        edition,
        edition_type,
        edition_limit,
        price,
        status,
        is_hidden: hidden,
        images,
        shop_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('artist_id', artist.id); // Security check via query addition, though RLS handles it too

    if (error) throw error;

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

    const artistSlug = artist.name_ko ? encodeURIComponent(artist.name_ko) : null;
    revalidatePath('/dashboard/artworks');
    revalidatePath('/artworks');
    revalidatePath('/');
    revalidatePath(`/artworks/${id}`);
    if (artistSlug) {
      revalidatePath(`/artworks/artist/${artistSlug}`);
    }
  } catch (error: any) {
    if (supabase && artistId && cleanupUrls.length > 0) {
      await cleanupUploads(supabase, cleanupUrls, artistId);
    }
    return { message: error.message, error: true, cleanupUrls };
  }

  redirect('/dashboard/artworks?result=updated');
}

export async function deleteArtwork(id: string): Promise<ActionState> {
  try {
    await requireArtistActive();
    const supabase = await createSupabaseServerClient();

    const { data: artwork } = await supabase
      .from('artworks')
      .select(
        'id, title, images, artist_id, description, size, material, year, edition, price, status, sold_at, is_hidden, shop_url, created_at, updated_at'
      )
      .eq('id', id)
      .single();

    // RLS will ensure they only delete their own
    const { error } = await supabase.from('artworks').delete().eq('id', id);

    if (error) throw error;

    if (artwork?.artist_id) {
      const { data: artist } = await supabase
        .from('artists')
        .select('name_ko')
        .eq('id', artwork.artist_id)
        .single();
      if (artist?.name_ko) {
        const artistSlug = encodeURIComponent(artist.name_ko);
        revalidatePath(`/artworks/artist/${artistSlug}`);
      }
    }

    revalidatePath('/dashboard/artworks');
    revalidatePath('/artworks');
    revalidatePath('/');

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
  } catch (error: any) {
    return { message: '삭제 실패: ' + error.message, error: true };
  }
}
