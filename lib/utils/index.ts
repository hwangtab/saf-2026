export { cn } from './cn';

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

const KOREAN_DATE_PATTERN = /^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일$/;

export function formatEffectiveDateForLocale(rawDate: string, locale: 'ko' | 'en'): string {
  const normalizedDate = rawDate.trim();

  if (locale === 'ko' || !normalizedDate) {
    return normalizedDate;
  }

  const matched = normalizedDate.match(KOREAN_DATE_PATTERN);
  if (!matched) {
    return normalizedDate;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime())) {
    return normalizedDate;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// Re-export all artwork image utilities for backwards compatibility
export {
  ARTWORK_IMAGE_VARIANTS,
  ARTWORK_TRANSFORM_PRESETS,
  getArtworkImageFamilyKey,
  resolveArtworkImageFallbackUrl,
  resolveArtworkImageUrl,
  resolveArtworkImageUrlForPreset,
  resolveArtworkVariantUrl,
  resolveOptimizedArtworkImageUrl,
  resolveSupabaseOriginalPublicUrl,
} from './artwork-image';

export type {
  ArtworkImagePreset,
  ArtworkImageVariant,
  SupabaseImageTransformOptions,
} from './artwork-image';
