import { ArtistData, Artwork, SortOption } from '@/types';
import { parsePrice } from '@/lib/parsePrice';
import { getPrimaryStorySlug } from '@/lib/artist-story-map';
import { area, parseSizeText } from '@/lib/artwork-size';

type SortableArtwork = Pick<
  Artwork,
  'artist' | 'title' | 'price' | 'size' | 'width_cm' | 'height_cm'
>;

// 면적(cm²) — DB 컬럼 우선, 없으면 size 텍스트 파싱. 미상은 -1(정렬 시 끝으로).
function sizeAreaOf(a: SortableArtwork): number {
  if (a.width_cm != null && a.height_cm != null) return a.width_cm * a.height_cm;
  const d = parseSizeText(a.size);
  return d ? area(d) : -1;
}

export function sortArtworks<T extends SortableArtwork>(
  artworks: T[],
  sortOption: SortOption
): T[] {
  const sorted = [...artworks];

  switch (sortOption) {
    case 'artist-asc':
      // 정전 작가(ARTIST_PRIMARY_STORY 등재 26명) 우선화 + ko-KR 사전순.
      // /artworks 메인의 기본 정렬 'artist-asc'에서 거장 작가 작품이 fold 위 결정론 노출.
      // Sprint 60+61+62 정전 작가 시그널 시리즈와 일관 적용.
      return sorted.sort((a, b) => {
        const pa = getPrimaryStorySlug(a.artist) ? 0 : 1;
        const pb = getPrimaryStorySlug(b.artist) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return a.artist.localeCompare(b.artist, 'ko-KR');
      });

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

    case 'size-desc':
      return sorted.sort((a, b) => {
        const aa = sizeAreaOf(a);
        const bb = sizeAreaOf(b);
        // 미상(-1)은 항상 끝으로
        if (aa < 0 && bb < 0) return 0;
        if (aa < 0) return 1;
        if (bb < 0) return -1;
        return bb - aa;
      });

    case 'size-asc':
      return sorted.sort((a, b) => {
        const aa = sizeAreaOf(a);
        const bb = sizeAreaOf(b);
        if (aa < 0 && bb < 0) return 0;
        if (aa < 0) return 1;
        if (bb < 0) return -1;
        return aa - bb;
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
