'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireArtistActive } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionState = {
  message: string;
  error?: boolean;
  errors?: Record<string, string[]>;
  cleanupUrls?: string[];
};

const MAX_IMAGES = 5;
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const getStoragePathFromPublicUrl = (publicUrl: string, bucket: string) => {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return url.pathname.slice(index + marker.length);
  } catch {
    return null;
  }
};

const parseUrlList = (value: FormDataEntryValue | null, label: string) => {
  if (!value) return { urls: [] as string[] };
  if (typeof value !== 'string') {
    return { urls: [] as string[], error: `${label} 형식이 올바르지 않습니다.` };
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return { urls: [] as string[], error: `${label} 형식이 올바르지 않습니다.` };
    }
    const urls = parsed.filter((item) => typeof item === 'string') as string[];
    if (urls.length !== parsed.length) {
      return { urls: [] as string[], error: `${label} 형식이 올바르지 않습니다.` };
    }
    return { urls };
  } catch {
    return { urls: [] as string[], error: `${label} 형식이 올바르지 않습니다.` };
  }
};

const getOwnedImagePaths = (urls: string[], artistId: string) =>
  urls
    .map((url) => getStoragePathFromPublicUrl(url, 'artworks'))
    .filter((path): path is string => !!path && path.startsWith(`${artistId}/`));

const validateImageUrls = (urls: string[], artistId: string) => {
  const paths = getOwnedImagePaths(urls, artistId);
  if (paths.length !== urls.length) {
    return { error: '유효하지 않은 이미지 URL이 포함되어 있습니다.' };
  }
  return { paths };
};

const cleanupUploads = async (supabase: SupabaseServerClient, urls: string[], artistId: string) => {
  const paths = getOwnedImagePaths(urls, artistId);
  if (paths.length > 0) {
    await supabase.storage.from('artworks').remove(paths);
  }
};

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

    const validation = validateImageUrls(images, artist.id);
    if (validation.error) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: validation.error, error: true, cleanupUrls };
    }

    // 3. Validation (Basic)
    if (!title.trim() || !price.trim()) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: '필수 항목(제목, 가격)을 입력해주세요.', error: true, cleanupUrls };
    }

    // 4. Insert
    const { error } = await supabase.from('artworks').insert({
      artist_id: artist.id,
      title,
      description,
      size,
      material,
      year,
      edition,
      price, // Stored as text (formatted) or number string based on schema. Schema allows text default '₩0'
      status,
      images,
      is_hidden: false,
      shop_url: null,
    });

    if (error) throw error;

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

    const validation = validateImageUrls(images, artist.id);
    if (validation.error) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: validation.error, error: true, cleanupUrls };
    }

    if (!title.trim() || !price.trim()) {
      if (supabase && artistId) {
        await cleanupUploads(supabase, cleanupUrls, artistId);
      }
      return { message: '필수 항목(제목, 가격)을 입력해주세요.', error: true, cleanupUrls };
    }

    const { error } = await supabase
      .from('artworks')
      .update({
        title,
        description,
        size,
        material,
        year,
        edition,
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
      .select('images, artist_id')
      .eq('id', id)
      .single();

    // RLS will ensure they only delete their own
    const { error } = await supabase.from('artworks').delete().eq('id', id);

    if (error) throw error;

    const paths = (artwork?.images || [])
      .map((url: string) => getStoragePathFromPublicUrl(url, 'artworks'))
      .filter((path: string | null): path is string => !!path);

    if (paths.length > 0) {
      await supabase.storage.from('artworks').remove(paths);
    }

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
    return { message: '작품이 삭제되었습니다.', error: false };
  } catch (error: any) {
    return { message: '삭제 실패: ' + error.message, error: true };
  }
}
