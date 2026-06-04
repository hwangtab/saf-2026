/** @jest-environment node */

import { GET } from '@/app/api/search/route';
import { getSupabaseArtworks } from '@/lib/supabase-data';

jest.mock('@/lib/supabase-data', () => ({
  getSupabaseArtworks: jest.fn(),
}));

jest.mock('@/lib/search-utils', () => ({
  matchesAnySearch: jest.fn((query: string, values: Array<string | undefined>) =>
    values.some((value) => value?.toLowerCase().includes(query.toLowerCase()))
  ),
}));

const mockGetSupabaseArtworks = getSupabaseArtworks as jest.MockedFunction<
  typeof getSupabaseArtworks
>;

function makeArtwork(index: number) {
  return {
    id: `art-${index}`,
    title: `match artwork ${index}`,
    title_en: undefined,
    artist: `artist ${index}`,
    artist_en: undefined,
    description: 'match',
    price: '₩100,000',
    images: [`https://example.com/${index}.jpg`],
    sold: false,
    reserved: false,
    category: 'painting',
  };
}

async function search(limit: string) {
  const request = new Request(`https://www.saf2026.com/api/search?q=match&limit=${limit}`);
  const response = await GET(request);
  return response.json() as Promise<{ artworks: unknown[] }>;
}

describe('search API limit normalization', () => {
  beforeEach(() => {
    mockGetSupabaseArtworks.mockResolvedValue(Array.from({ length: 25 }, (_, i) => makeArtwork(i)));
  });

  it('uses the default limit when limit is negative', async () => {
    const body = await search('-1');

    expect(body.artworks).toHaveLength(8);
  });

  it('caps large limits at 20', async () => {
    const body = await search('999');

    expect(body.artworks).toHaveLength(20);
  });
});
