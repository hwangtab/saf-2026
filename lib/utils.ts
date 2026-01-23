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
