import { ArtistData, Artwork, SortOption } from '@/types';
import { parsePrice } from '@/lib/parsePrice';

export function sortArtworks(artworks: Artwork[], sortOption: SortOption): Artwork[] {
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

export function extractUniqueArtists(artworks: Artwork[]): string[] {
  const seen = new Set<string>();
  const artists: string[] = [];
  const source = [...artworks].sort((a, b) => a.artist.localeCompare(b.artist, 'ko-KR'));

  for (const artwork of source) {
    if (!seen.has(artwork.artist)) {
      seen.add(artwork.artist);
      artists.push(artwork.artist);
    }
  }

  return artists;
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
  };
}
