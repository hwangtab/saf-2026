/**
 * FormData parsing utilities for server actions
 */

export const getString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return value ? String(value).trim() : '';
};

export const getNumber = (formData: FormData, key: string, fallback = 0): number => {
  const raw = formData.get(key);
  if (raw === null || raw === undefined || raw === '') return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Extract storage path from Supabase public URL
 * @param publicUrl - Full public URL of the file
 * @param bucket - Storage bucket name
 * @returns Path relative to the bucket, or null if invalid
 */
export const getStoragePathFromPublicUrl = (publicUrl: string, bucket: string): string | null => {
  try {
    const url = new URL(publicUrl);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);
      if (index !== -1) {
        return url.pathname.slice(index + marker.length);
      }
    }

    return null;
  } catch {
    return null;
  }
};

const ARTWORK_VARIANT_SUFFIX_REGEX = /__(thumb|card|detail|hero|original)\.webp$/i;

export const expandArtworkVariantPaths = (path: string): string[] => {
  const match = path.match(ARTWORK_VARIANT_SUFFIX_REGEX);
  if (!match) return [path];
  const prefix = path.replace(ARTWORK_VARIANT_SUFFIX_REGEX, '');
  return ['thumb', 'card', 'detail', 'hero', 'original'].map(
    (variant) => `${prefix}__${variant}.webp`
  );
};

export const getStoragePathsForRemoval = (urls: string[], bucket: string): string[] => {
  const paths = urls
    .map((url) => getStoragePathFromPublicUrl(url, bucket))
    .filter((path): path is string => !!path)
    .flatMap((path) => (bucket === 'artworks' ? expandArtworkVariantPaths(path) : [path]));

  return Array.from(new Set(paths));
};

/**
 * Batch operation constants
 */
export const MAX_BATCH_SIZE = 100;

/**
 * Validate batch operation size
 * @throws Error if batch size exceeds limit
 */
export const validateBatchSize = (ids: string[]): void => {
  if (ids.length > MAX_BATCH_SIZE) {
    throw new Error(`한 번에 최대 ${MAX_BATCH_SIZE}개까지 처리할 수 있습니다.`);
  }
};
