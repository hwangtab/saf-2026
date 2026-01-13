import { Artwork } from '@/types';
import { artworksBatch1 } from './artworks-batches/batch-001';
import { artworksBatch2 } from './artworks-batches/batch-002';
import { artworksBatch3 } from './artworks-batches/batch-003';
import { artworksBatch4 } from './artworks-batches/batch-004';
import { batch005 } from './artworks-batches/batch-005';
import { getArtworkWithArtistData } from '@/lib/artworkUtils';

// 모든 배치를 통합하여 export
export const artworks: Artwork[] = [
  ...artworksBatch1,
  ...artworksBatch2,
  ...artworksBatch3,
  ...artworksBatch4,
  ...batch005,
].map(getArtworkWithArtistData);

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find((artwork) => artwork.id === id);
}

export function getAllArtworks(): Artwork[] {
  return artworks;
}
