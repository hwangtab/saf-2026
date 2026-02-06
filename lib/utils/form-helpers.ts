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
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return url.pathname.slice(index + marker.length);
  } catch {
    return null;
  }
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
