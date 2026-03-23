import { ArtistData, Artwork, SortOption } from '@/types';
import { parsePrice } from '@/lib/parsePrice';

type SortableArtwork = Pick<Artwork, 'artist' | 'title' | 'price'>;

export function sortArtworks<T extends SortableArtwork>(
  artworks: T[],
  sortOption: SortOption
): T[] {
  const sorted = [...artworks];

  switch (sortOption) {
    case 'artist-asc':
      return sorted.sort((a, b) => a.artist.localeCompare(b.artist, 'ko-KR'));

    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko-KR'));

    case 'price-desc':
      return sorted.sort((a, b) => {
        const priceA = parsePrice(a.price);
        const priceB = parsePrice(b.price);

        // Infinity represents 'inquiry/check', so place it at the end
        if (priceA === Infinity && priceB === Infinity) return 0;
        if (priceA === Infinity) return 1;
        if (priceB === Infinity) return -1;
        return priceB - priceA;
      });

    case 'price-asc':
      return sorted.sort((a, b) => {
        const priceA = parsePrice(a.price);
        const priceB = parsePrice(b.price);

        // Infinity represents 'inquiry/check', so place it at the end
        if (priceA === Infinity && priceB === Infinity) return 0;
        if (priceA === Infinity) return 1;
        if (priceB === Infinity) return -1;
        return priceA - priceB;
      });

    default:
      return sorted;
  }
}

export interface ArtistName {
  ko: string;
  en: string;
}

export function extractUniqueArtists<T extends Pick<Artwork, 'artist' | 'artist_en'>>(
  artworks: T[]
): ArtistName[] {
  const seen = new Map<string, string>();
  const source = [...artworks].sort((a, b) => a.artist.localeCompare(b.artist, 'ko-KR'));

  for (const artwork of source) {
    if (!seen.has(artwork.artist)) {
      seen.set(artwork.artist, artwork.artist_en || artwork.artist);
    }
  }

  return Array.from(seen.entries()).map(([ko, en]) => ({ ko, en }));
}

export function getArtworkWithArtistData(
  artwork: Artwork,
  artistData: Record<string, ArtistData>
): Artwork & { profile: string; history: string } {
  const artistInfo = artistData[artwork.artist] || { profile: '', history: '' };
  return {
    ...artwork,
    profile: artwork.profile || artistInfo.profile || '',
    history: artwork.history || artistInfo.history || '',
    artist_en: artwork.artist_en || artistInfo.name_en || undefined,
    profile_en: artwork.profile_en || artistInfo.profile_en || undefined,
    history_en: artwork.history_en || artistInfo.history_en || undefined,
  };
}
