import { resolveOptimizedArtworkImageUrl } from '@/lib/utils';
import { containsHangul } from '@/lib/search-utils';

export function resolveSeoArtworkImageUrl(image: string): string {
  return resolveOptimizedArtworkImageUrl(image, {
    width: 1200,
    quality: 80,
    resize: 'contain',
  });
}

export function sanitizeForLocale(
  value: string | null | undefined,
  locale: 'ko' | 'en',
  fallback = ''
): string {
  if (!value) return '';
  if (locale === 'en' && containsHangul(value)) {
    return fallback;
  }
  return value;
}

// JSON-LD Security: Escape < characters to prevent XSS
export function escapeJsonLdForScript(json: string): string {
  return json.replace(/</g, '\\u003c');
}

// Helper: Parse price string to number
export function parseArtworkPrice(price: string): number | null {
  if (!price || price === '문의' || price.includes('문의')) return null;
  const numericStr = price.replace(/[^\d]/g, '');
  const num = parseInt(numericStr, 10);
  return isNaN(num) ? null : num;
}
