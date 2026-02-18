import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => 0.5 - Math.random());
}

/**
 * Formats artist name for display by appending '작가' suffix.
 * Special case: '작가미상' (unknown artist) is displayed as-is without suffix.
 *
 * @param artistName - The artist's name
 * @param addSuffix - Whether to add '작가' suffix (default: true)
 * @returns Formatted artist name
 *
 * @example
 * formatArtistName('김철수') // Returns: '김철수 작가'
 * formatArtistName('작가미상') // Returns: '작가미상'
 * formatArtistName('김철수', false) // Returns: '김철수'
 */
export function formatArtistName(artistName: string, addSuffix: boolean = true): string {
  if (!artistName || !addSuffix) {
    return artistName || '';
  }

  // Special case: "작가미상" should not have "작가" suffix
  if (artistName === '작가미상') {
    return artistName;
  }

  return `${artistName} 작가`;
}

export function resolveArtworkImageUrl(image: string): string {
  if (!image) return '';
  const normalizedImage = image.trim();
  if (!normalizedImage) return '';
  if (normalizedImage.startsWith('http://') || normalizedImage.startsWith('https://')) {
    return normalizedImage;
  }
  if (normalizedImage.startsWith('/')) {
    return normalizedImage;
  }
  return `/images/artworks/${normalizedImage}`;
}

export const ARTWORK_IMAGE_VARIANTS = ['thumb', 'card', 'detail', 'hero', 'original'] as const;
export type ArtworkImageVariant = (typeof ARTWORK_IMAGE_VARIANTS)[number];
export type ArtworkImagePreset = 'slider' | 'card' | 'detail' | 'hero' | 'original';

export const ARTWORK_TRANSFORM_PRESETS = {
  slider: { width: 400, quality: 75 },
  card: { width: 960, quality: 75 },
  detail: { width: 1600, quality: 80 },
  hero: { width: 1920, quality: 80 },
  original: {},
} as const;

const ARTWORK_VARIANT_FILENAME_REGEX =
  /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i;
const ARTWORK_STORAGE_MARKERS = [
  '/storage/v1/object/public/artworks/',
  '/storage/v1/render/image/public/artworks/',
];

const PRESET_TO_VARIANT: Record<ArtworkImagePreset, ArtworkImageVariant> = {
  slider: 'thumb',
  card: 'card',
  detail: 'detail',
  hero: 'hero',
  original: 'original',
};

export function resolveArtworkVariantUrl(image: string, variant: ArtworkImageVariant): string {
  const resolved = resolveArtworkImageUrl(image);
  if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
    return resolved;
  }

  let parsed: URL;
  try {
    parsed = new URL(resolved);
  } catch {
    return resolved;
  }

  const isArtworkStorageUrl = ARTWORK_STORAGE_MARKERS.some((marker) =>
    parsed.pathname.includes(marker)
  );
  if (!isArtworkStorageUrl) {
    return resolved;
  }

  const fileName = parsed.pathname.split('/').pop() || '';
  if (!ARTWORK_VARIANT_FILENAME_REGEX.test(fileName)) {
    return resolved; // Legacy single-file uploads keep original URL
  }

  parsed.pathname = parsed.pathname.replace(ARTWORK_VARIANT_FILENAME_REGEX, `__${variant}.$2`);
  return parsed.toString();
}

export function resolveArtworkImageUrlForPreset(
  image: string,
  preset: ArtworkImagePreset = 'original'
): string {
  const variant = PRESET_TO_VARIANT[preset];

  if (preset === 'original') {
    return resolveArtworkVariantUrl(image, variant);
  }

  const transformPreset = ARTWORK_TRANSFORM_PRESETS[preset];
  const optimized = resolveOptimizedArtworkImageUrl(image, transformPreset);
  const resolved = resolveArtworkImageUrl(image);

  if (optimized !== resolved) {
    return optimized;
  }

  return resolveArtworkVariantUrl(image, variant);
}

export function getArtworkImageFamilyKey(imageUrl: string): string {
  const resolved = resolveArtworkImageUrl(imageUrl);
  if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
    return resolved;
  }

  try {
    const parsed = new URL(resolved);
    const isArtworkStorageUrl = ARTWORK_STORAGE_MARKERS.some((marker) =>
      parsed.pathname.includes(marker)
    );

    if (!isArtworkStorageUrl) {
      return `${parsed.origin}${parsed.pathname}`;
    }

    const familyPath = parsed.pathname.replace(ARTWORK_VARIANT_FILENAME_REGEX, '');
    return `${parsed.origin}${familyPath}`;
  } catch {
    return resolved;
  }
}

type SupabaseImageResizeMode = 'cover' | 'contain' | 'fill';

export interface SupabaseImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'origin' | 'webp' | 'avif';
  resize?: SupabaseImageResizeMode;
}

const SUPABASE_OBJECT_PUBLIC_PATH = '/storage/v1/object/public/';
const SUPABASE_RENDER_PUBLIC_PATH = '/storage/v1/render/image/public/';
const ENABLE_SUPABASE_RENDER_TRANSFORM =
  process.env.NEXT_PUBLIC_SUPABASE_RENDER_TRANSFORM === 'true';

const toPositiveInteger = (value: number | undefined): number | null => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value as number);
  return rounded > 0 ? rounded : null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function resolveOptimizedArtworkImageUrl(
  image: string,
  options: SupabaseImageTransformOptions = {}
): string {
  const resolved = resolveArtworkImageUrl(image);
  if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
    return resolved;
  }

  let parsed: URL;
  try {
    parsed = new URL(resolved);
  } catch {
    return resolved;
  }

  const hasObjectPath = parsed.pathname.includes(SUPABASE_OBJECT_PUBLIC_PATH);
  const hasRenderPath = parsed.pathname.includes(SUPABASE_RENDER_PUBLIC_PATH);

  if (!hasObjectPath && !hasRenderPath) {
    return resolved;
  }

  // Supabase render endpoint can return 401 depending on project settings/plan.
  // Keep object/public as default and only opt-in to render via env flag.
  if (!ENABLE_SUPABASE_RENDER_TRANSFORM && hasObjectPath) {
    return resolved;
  }

  if (hasObjectPath && ENABLE_SUPABASE_RENDER_TRANSFORM) {
    parsed.pathname = parsed.pathname.replace(
      SUPABASE_OBJECT_PUBLIC_PATH,
      SUPABASE_RENDER_PUBLIC_PATH
    );
  }

  const widthValue = toPositiveInteger(options.width);
  const heightValue = toPositiveInteger(options.height);
  const qualityValue = toPositiveInteger(options.quality);

  const width = widthValue ? clamp(widthValue, 1, 2500) : null;
  const height = heightValue ? clamp(heightValue, 1, 2500) : null;
  const quality = qualityValue ? clamp(qualityValue, 20, 100) : null;

  if (width) parsed.searchParams.set('width', String(width));
  if (height) parsed.searchParams.set('height', String(height));
  if (quality) parsed.searchParams.set('quality', String(quality));
  if (options.resize) parsed.searchParams.set('resize', options.resize);
  if (options.format) parsed.searchParams.set('format', options.format);

  return parsed.toString();
}

export function resolveSupabaseOriginalPublicUrl(url: string): string {
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!parsed.pathname.includes(SUPABASE_RENDER_PUBLIC_PATH)) {
    return url;
  }

  parsed.pathname = parsed.pathname.replace(
    SUPABASE_RENDER_PUBLIC_PATH,
    SUPABASE_OBJECT_PUBLIC_PATH
  );

  // Remove transform-specific params for object/public endpoint fallback.
  parsed.searchParams.delete('width');
  parsed.searchParams.delete('height');
  parsed.searchParams.delete('quality');
  parsed.searchParams.delete('format');
  parsed.searchParams.delete('resize');

  return parsed.toString();
}

export function resolveArtworkImageFallbackUrl(url: string): string {
  const originalVariantUrl = resolveArtworkVariantUrl(url, 'original');
  return resolveSupabaseOriginalPublicUrl(originalVariantUrl);
}

export function formatPriceForDisplay(priceValue: string | number | null | undefined): string {
  if (priceValue === null || priceValue === undefined) return '';
  const priceStr = String(priceValue).trim();
  if (!priceStr) return '';
  if (priceStr === '문의' || priceStr === '확인 중') return priceStr;

  const numericStr = priceStr.replace(/[^\d]/g, '');
  if (!numericStr) return priceStr;

  const numeric = Number(numericStr);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';

  return `₩${numeric.toLocaleString('ko-KR')}`;
}
