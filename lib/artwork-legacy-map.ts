import { artworks } from '@/content/saf2026-artworks';
import { artworksBatch1 } from '@/content/artworks-batches/batch-001';
import { artworksBatch2 } from '@/content/artworks-batches/batch-002';
import { artworksBatch3 } from '@/content/artworks-batches/batch-003';
import { artworksBatch4 } from '@/content/artworks-batches/batch-004';
import { batch005 } from '@/content/artworks-batches/batch-005';
import { batch006 } from '@/content/artworks-batches/batch-006';
import { batch007 } from '@/content/artworks-batches/batch-007';
import { batch008 } from '@/content/artworks-batches/batch-008';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_NUMERIC = /^\d+$/;

const buildLegacyToUuidMap = (): Map<string, string> => {
  const map = new Map<string, string>();
  const legacyBatches = [
    ...artworksBatch1,
    ...artworksBatch2,
    ...artworksBatch3,
    ...artworksBatch4,
    ...batch005,
    ...batch006,
    ...batch007,
    ...batch008,
  ];

  for (const legacy of legacyBatches) {
    if (!LEGACY_NUMERIC.test(legacy.id)) continue;
    const match = artworks.find(
      (a) => a.artist === legacy.artist && a.title === legacy.title && UUID_REGEX.test(a.id)
    );
    if (match) map.set(legacy.id, match.id);
  }

  return map;
};

const legacyToUuidMap = buildLegacyToUuidMap();

export function resolveLegacyArtworkId(id: string): string | null {
  if (!LEGACY_NUMERIC.test(id)) return null;
  return legacyToUuidMap.get(id) ?? null;
}

export function isLegacyNumericId(id: string): boolean {
  return LEGACY_NUMERIC.test(id);
}
