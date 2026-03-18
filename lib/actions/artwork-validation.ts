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
  } catch (error) {
    console.error('[artwork-validation] URL list parsing failed:', error);
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

export function validateSaleInput(salePriceRaw: string, quantityRaw: string): string | null {
  const salePrice = Number(salePriceRaw);
  const quantity = Number(quantityRaw);
  if (
    isNaN(salePrice) ||
    salePrice < 0 ||
    !Number.isInteger(salePrice) ||
    isNaN(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return '유효하지 않은 가격 또는 수량입니다.';
  }
  return null;
}

export const validateArtworkData = (formData: FormData) => {
  const title = (formData.get('title') as string) || '';
  const price = (formData.get('price') as string) || '';
  const edition_type = (formData.get('edition_type') as string) || 'unique';
  const edition_limit_str = formData.get('edition_limit') as string;

  if (!title.trim() || !price.trim()) {
    return { error: '필수 항목(제목, 가격)을 입력해주세요.' };
  }

  if (edition_type === 'limited') {
    if (!edition_limit_str || edition_limit_str.trim() === '') {
      return { error: '한정판은 에디션 수량을 입력해주세요.' };
    }
    const n = Number(edition_limit_str);
    if (!Number.isInteger(n) || n <= 0) {
      return { error: '에디션 수량은 1 이상의 정수여야 합니다.' };
    }
    if (n > 10000) {
      return { error: '에디션 수량은 10,000을 초과할 수 없습니다.' };
    }
  }

  return { success: true };
};
