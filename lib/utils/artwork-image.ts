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
  // bare filename (legacy) — local files no longer exist, return placeholder
  return '/images/og-image.png';
}

export function resolveArtworkVariantUrl(image: string, variant: ArtworkImageVariant): string {
  const resolved = resolveArtworkImageUrl(image);
  if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) {
    return resolved;
  }

  let parsed: URL;
  try {
    parsed = new URL(resolved);
  } catch (error) {
    console.error('[artwork-image] resolveArtworkVariantUrl URL parsing failed:', error);
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
  } catch (error) {
    console.error('[artwork-image] resolveOptimizedArtworkImageUrl URL parsing failed:', error);
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

  const variantUrl = resolveArtworkVariantUrl(image, variant);

  // Prefer stored variant files for remote artwork URLs. If a legacy record is missing
  // the variant file, SafeImage falls back to the original public URL on load error.
  const isRemoteArtwork =
    (resolved.startsWith('http://') || resolved.startsWith('https://')) &&
    ARTWORK_STORAGE_MARKERS.some((marker) => resolved.includes(marker));

  if (isRemoteArtwork && variantUrl !== resolved) {
    return variantUrl;
  }

  return variantUrl;
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
  } catch (error) {
    console.error('[artwork-image] getArtworkImageFamilyKey URL parsing failed:', error);
    return resolved;
  }
}

export function resolveSupabaseOriginalPublicUrl(url: string): string {
  if (!url) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    console.error('[artwork-image] resolveSupabaseOriginalPublicUrl URL parsing failed:', error);
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
