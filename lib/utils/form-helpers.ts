/**
 * FormData parsing utilities for server actions
 */

import { classifyBucket, type SizeBucket } from '@/lib/artwork-size';

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

export interface ArtworkSizeFields {
  size: string;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  size_bucket: SizeBucket | null;
}

/**
 * 작품 크기 cm 폼 입력(width_cm/height_cm/depth_cm) → size 텍스트 자동 합성 + 구조화 컬럼.
 * admin·exhibitor·artist 작품 폼 공통 헬퍼. 가로·세로 누락 시 '확인 중' + 컬럼 NULL.
 * 깊이 입력 시 3D(WxHxDcm). number→string float 노이즈는 toFixed로 제거.
 */
export const buildArtworkSizeFields = (formData: FormData): ArtworkSizeFields => {
  const num = (k: string): number | null => {
    const v = getString(formData, k);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const width_cm = num('width_cm');
  const height_cm = num('height_cm');
  const depth_cm = num('depth_cm');
  if (width_cm == null || height_cm == null) {
    return { size: '확인 중', width_cm: null, height_cm: null, depth_cm: null, size_bucket: null };
  }
  const fmt = (n: number) => String(parseFloat(n.toFixed(2)));
  const size =
    depth_cm != null
      ? `${fmt(width_cm)}x${fmt(height_cm)}x${fmt(depth_cm)}cm`
      : `${fmt(width_cm)}x${fmt(height_cm)}cm`;
  const size_bucket = classifyBucket({ width: width_cm, height: height_cm, depth: depth_cm });
  return { size, width_cm, height_cm, depth_cm, size_bucket };
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
  } catch (error) {
    console.error('[form-helpers] Storage path parsing failed:', error);
    return null;
  }
};

const ARTWORK_VARIANT_SUFFIX_REGEX =
  /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i;

export const expandArtworkVariantPaths = (path: string): string[] => {
  const match = path.match(ARTWORK_VARIANT_SUFFIX_REGEX);
  if (!match) return [path];
  const prefix = path.replace(ARTWORK_VARIANT_SUFFIX_REGEX, '');
  const ext = match[2] || 'webp';
  return ['thumb', 'card', 'detail', 'hero', 'original'].map(
    (variant) => `${prefix}__${variant}.${ext.toLowerCase()}`
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
