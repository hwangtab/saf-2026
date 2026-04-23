'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';

export type ArtistSalesRecord = {
  artistId: string | null;
  artistName: string;
  revenue: number;
  soldCount: number;
  artworkCount: number;
  totalArtworkCount: number;
  avgPrice: number;
  channels: ('offline' | 'online')[];
  firstSaleDate: string;
  lastSaleDate: string;
};

type SaleRow = {
  sale_price: number;
  quantity: number;
  sold_at: string;
  source: string | null;
  artwork_id: string;
  artworks: {
    artist_id: string | null;
    artists: { name_ko: string | null } | Array<{ name_ko: string | null }> | null;
  } | null;
};

function mapChannel(source: string | null): 'offline' | 'online' {
  return source === 'toss' || source === 'cafe24' ? 'online' : 'offline';
}

function isMissingVoidedAtColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string; details?: string; hint?: string };
  const merged = `${candidate.message || ''} ${candidate.details || ''} ${candidate.hint || ''}`;
  return candidate.code === '42703' && /voided_at/i.test(merged);
}

export async function getAllArtistSales(): Promise<ArtistSalesRecord[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  // Fetch sales with artwork → artist join
  let { data, error } = await supabase
    .from('artwork_sales')
    .select(
      'sale_price, quantity, sold_at, source, artwork_id, artworks(artist_id, artists(name_ko))'
    )
    .is('voided_at', null)
    .order('sold_at', { ascending: true });

  if (error && isMissingVoidedAtColumnError(error)) {
    ({ data, error } = await supabase
      .from('artwork_sales')
      .select(
        'sale_price, quantity, sold_at, source, artwork_id, artworks(artist_id, artists(name_ko))'
      )
      .order('sold_at', { ascending: true }));
  }

  if (error) throw error;

  // Fetch total artwork counts per artist
  const { data: artworkCounts } = await supabase.from('artworks').select('artist_id');

  const totalArtworksByArtist = new Map<string, number>();
  for (const row of artworkCounts || []) {
    if (row.artist_id) {
      totalArtworksByArtist.set(row.artist_id, (totalArtworksByArtist.get(row.artist_id) || 0) + 1);
    }
  }

  // Aggregate by artist
  const artistMap = new Map<
    string,
    {
      artistId: string | null;
      artistName: string;
      revenue: number;
      soldCount: number;
      artworkIds: Set<string>;
      channels: Set<'offline' | 'online'>;
      firstSaleDate: string;
      lastSaleDate: string;
    }
  >();

  for (const row of (data || []) as unknown as SaleRow[]) {
    if (!row.artworks) continue;

    const artistValue = row.artworks.artists;
    const artistName = Array.isArray(artistValue)
      ? artistValue[0]?.name_ko || '알 수 없음'
      : artistValue?.name_ko || '알 수 없음';
    const artistId = row.artworks.artist_id;
    const artistKey = artistId || `unknown:${artistName}`;

    const price = row.sale_price * row.quantity;
    const channel = mapChannel(row.source);
    const soldAt = row.sold_at;

    const existing = artistMap.get(artistKey);

    if (existing) {
      existing.revenue += price;
      existing.soldCount += row.quantity;
      existing.artworkIds.add(row.artwork_id);
      existing.channels.add(channel);
      if (soldAt > existing.lastSaleDate) existing.lastSaleDate = soldAt;
      if (soldAt < existing.firstSaleDate) existing.firstSaleDate = soldAt;
    } else {
      artistMap.set(artistKey, {
        artistId,
        artistName,
        revenue: price,
        soldCount: row.quantity,
        artworkIds: new Set([row.artwork_id]),
        channels: new Set([channel]),
        firstSaleDate: soldAt,
        lastSaleDate: soldAt,
      });
    }
  }

  return Array.from(artistMap.values())
    .map((entry) => ({
      artistId: entry.artistId,
      artistName: entry.artistName,
      revenue: entry.revenue,
      soldCount: entry.soldCount,
      artworkCount: entry.artworkIds.size,
      totalArtworkCount: entry.artistId
        ? totalArtworksByArtist.get(entry.artistId) || entry.artworkIds.size
        : entry.artworkIds.size,
      avgPrice: entry.soldCount > 0 ? Math.round(entry.revenue / entry.soldCount) : 0,
      channels: Array.from(entry.channels),
      firstSaleDate: entry.firstSaleDate,
      lastSaleDate: entry.lastSaleDate,
    }))
    .sort((a, b) => b.soldCount - a.soldCount);
}
