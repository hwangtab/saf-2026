import { getStoragePathFromPublicUrl, getStoragePathsForRemoval } from '@/lib/utils/form-helpers';
import { createSupabaseServerClient } from '@/lib/auth/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const MAX_IMAGES = 5;

export type ImageValidationResult = {
  urls: string[];
  error?: string;
};

export const parseUrlList = (
  value: FormDataEntryValue | null,
  label: string
): ImageValidationResult => {
  if (!value) return { urls: [] };
  if (typeof value !== 'string') {
    return { urls: [], error: `${label} 형식이 올바르지 않습니다.` };
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return { urls: [], error: `${label} 형식이 올바르지 않습니다.` };
    }
    const urls = parsed.filter((item) => typeof item === 'string') as string[];
    if (urls.length !== parsed.length) {
      return { urls: [], error: `${label} 형식이 올바르지 않습니다.` };
    }
    return { urls };
  } catch {
    return { urls: [], error: `${label} 형식이 올바르지 않습니다.` };
  }
};

export const getOwnedCanonicalImagePaths = (urls: string[], ownerPrefix: string) =>
  urls
    .map((url) => getStoragePathFromPublicUrl(url, 'artworks'))
    .filter((path): path is string => !!path && path.startsWith(`${ownerPrefix}/`));

export const getOwnedCleanupPaths = (urls: string[], ownerPrefix: string) =>
  getStoragePathsForRemoval(urls, 'artworks').filter((path) => path.startsWith(`${ownerPrefix}/`));

export const validateImageUrls = (urls: string[], ownerPrefix: string) => {
  const paths = getOwnedCanonicalImagePaths(urls, ownerPrefix);
  if (paths.length !== urls.length) {
    return { error: '유효하지 않은 이미지 URL이 포함되어 있습니다.' };
  }
  return { paths };
};

export const cleanupUploads = async (
  supabase: SupabaseServerClient,
  urls: string[],
  ownerPrefix: string
) => {
  const paths = getOwnedCleanupPaths(urls, ownerPrefix);
  if (paths.length > 0) {
    await supabase.storage.from('artworks').remove(paths);
  }
};

export const validateArtworkData = (formData: FormData) => {
  const title = (formData.get('title') as string) || '';
  const price = (formData.get('price') as string) || '';
  const edition_type = (formData.get('edition_type') as string) || 'unique';
  const edition_limit_str = formData.get('edition_limit') as string;
  const edition_limit = edition_limit_str ? parseInt(edition_limit_str) : null;

  if (!title.trim() || !price.trim()) {
    return { error: '필수 항목(제목, 가격)을 입력해주세요.' };
  }

  if (edition_type === 'limited' && !edition_limit) {
    return { error: '한정판은 에디션 수량을 입력해주세요.' };
  }

  return { success: true };
};
