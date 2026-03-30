import { Artwork } from '@/types';
import { dbGeneratedArtworks } from './artworks-batches/batch-db-generated';
import { artworksBatch1 } from './artworks-batches/batch-001';
import { artworksBatch2 } from './artworks-batches/batch-002';
import { artworksBatch3 } from './artworks-batches/batch-003';
import { artworksBatch4 } from './artworks-batches/batch-004';
import { batch005 } from './artworks-batches/batch-005';
import { batch006 } from './artworks-batches/batch-006';
import { batch007 } from './artworks-batches/batch-007';
import { batch008 } from './artworks-batches/batch-008';
import { getArtworkWithArtistData } from '@/lib/artworkUtils';
import { ARTIST_DATA } from '@/content/artists-data';

// DB 생성 파일이 primary source. 기존 배치 파일은 보조 (DB 동기화 전 레거시 커버).
// title+artist 기준 중복 제거: DB 버전이 앞에 있으므로 DB 데이터 우선.
const allRaw = [
  ...dbGeneratedArtworks,
  ...artworksBatch1,
  ...artworksBatch2,
  ...artworksBatch3,
  ...artworksBatch4,
  ...batch005,
  ...batch006,
  ...batch007,
  ...batch008,
];

const seen = new Set<string>();

export const artworks: Artwork[] = allRaw
  .filter((artwork) => !artwork.hidden)
  .filter((artwork) => {
    const key = `${artwork.artist}::${artwork.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .map((artwork) => getArtworkWithArtistData(artwork, ARTIST_DATA));

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find((artwork) => artwork.id === id);
}

export function getAllArtworks(): Artwork[] {
  return artworks;
}
