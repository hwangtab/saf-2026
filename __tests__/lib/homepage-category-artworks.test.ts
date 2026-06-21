import { composeHomepageCategoryArtworks } from '@/lib/homepage-category-artworks';
import type { Artwork } from '@/types';

function artwork(id: string, status: 'available' | 'reserved' | 'sold' = 'available'): Artwork {
  return {
    id,
    title: `작품 ${id}`,
    artist: `작가 ${id}`,
    size: '10x10cm',
    material: '캔버스에 아크릴',
    year: '2026',
    price: '₩100,000',
    images: [`/${id}.jpg`],
    sold: status === 'sold',
    reserved: status === 'reserved',
    category: '회화',
    sold_at: status === 'sold' ? '2026-06-01T00:00:00.000Z' : undefined,
  };
}

describe('composeHomepageCategoryArtworks', () => {
  it('inserts one sold artwork after three available artworks when enough available works exist', () => {
    const available = Array.from({ length: 8 }, (_, index) => artwork(`a${index + 1}`));
    const sold = [artwork('s1', 'sold'), artwork('s2', 'sold')];

    const result = composeHomepageCategoryArtworks({ available, sold, limit: 8 });

    expect(result).toHaveLength(8);
    expect(result.map((item) => item.id)).toEqual(['a1', 'a2', 'a3', 's1', 'a4', 'a5', 'a6', 'a7']);
    expect(result.filter((item) => item.sold)).toHaveLength(1);
  });

  it('does not insert sold artwork when fewer than three available works exist', () => {
    const available = [artwork('a1'), artwork('a2')];
    const sold = [artwork('s1', 'sold')];

    const result = composeHomepageCategoryArtworks({ available, sold, limit: 8 });

    expect(result.map((item) => item.id)).toEqual(['a1', 'a2']);
  });

  it('returns only available artworks when no sold artwork exists', () => {
    const available = Array.from({ length: 5 }, (_, index) => artwork(`a${index + 1}`));

    const result = composeHomepageCategoryArtworks({ available, sold: [], limit: 4 });

    expect(result.map((item) => item.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
  });
});
