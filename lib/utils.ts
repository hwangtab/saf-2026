import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  if (image.startsWith('/')) {
    return image;
  }
  return `/images/artworks/${image}`;
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

  const width = toPositiveInteger(options.width);
  const height = toPositiveInteger(options.height);
  const quality = toPositiveInteger(options.quality);

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
