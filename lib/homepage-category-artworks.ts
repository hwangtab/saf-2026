import type { Artwork } from '@/types';

const SOLD_INSERT_AFTER_AVAILABLE_COUNT = 3;

export function composeHomepageCategoryArtworks({
  available,
  sold,
  limit,
}: {
  available: Artwork[];
  sold: Artwork[];
  limit: number;
}): Artwork[] {
  const safeLimit = Math.max(0, limit);
  if (safeLimit === 0) return [];

  const availableOnly = available.filter((artwork) => !artwork.sold && !artwork.reserved);
  const soldOnly = sold.filter((artwork) => artwork.sold);

  if (availableOnly.length < SOLD_INSERT_AFTER_AVAILABLE_COUNT || soldOnly.length === 0) {
    return availableOnly.slice(0, safeLimit);
  }

  const insertIndex = Math.min(SOLD_INSERT_AFTER_AVAILABLE_COUNT, safeLimit - 1);
  const result = [
    ...availableOnly.slice(0, insertIndex),
    soldOnly[0],
    ...availableOnly.slice(insertIndex),
  ];

  return result.slice(0, safeLimit);
}
