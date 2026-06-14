'use server';

import { artworks as fallbackArtworks } from '@/content/saf2026-artworks';
import { parsePrice } from '@/lib/parsePrice';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';
import type { Artwork, EditionType } from '@/types';
import type { Database } from '@/types/supabase';

export interface CartArtworkInfo {
  id: string;
  title: string;
  artistName: string;
  price: number;
  image: string | null;
  editionType: 'unique' | 'limited' | 'open' | null;
  isAvailable: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUPABASE_PLACEHOLDER_HOST = 'placeholder.supabase.co';
type ArtworkRow = Pick<
  Database['public']['Tables']['artworks']['Row'],
  'id' | 'title' | 'price' | 'images' | 'edition_type' | 'status'
> & {
  artists: { name_ko: string | null } | { name_ko: string | null }[] | null;
};

function normalizePrice(price: string | number | null | undefined) {
  const parsedPrice = parsePrice(price);
  return {
    price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : 0,
    hasValidPrice: Number.isFinite(parsedPrice) && parsedPrice > 0,
  };
}

function isFallbackArtworkAvailable(artwork: Artwork, hasValidPrice: boolean) {
  return hasValidPrice && artwork.sold !== true && artwork.reserved !== true;
}

function toCartArtworkInfoFromFallback(artwork: Artwork): CartArtworkInfo {
  const { price, hasValidPrice } = normalizePrice(artwork.price);

  return {
    id: artwork.id,
    title: artwork.title,
    artistName: artwork.artist,
    price,
    image: artwork.images[0] ?? null,
    editionType: artwork.edition_type ?? null,
    isAvailable: isFallbackArtworkAvailable(artwork, hasValidPrice),
  };
}

function getFallbackCartArtworks(validIds: string[]) {
  const fallbackById = new Map(fallbackArtworks.map((artwork) => [artwork.id, artwork]));

  return validIds.flatMap((id) => {
    const artwork = fallbackById.get(id);
    return artwork ? [toCartArtworkInfoFromFallback(artwork)] : [];
  });
}

function isStatusAvailable(status: Database['public']['Enums']['artwork_status'] | null) {
  return status === null || status === 'available';
}

function isPlaceholderSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return supabaseUrl.includes(SUPABASE_PLACEHOLDER_HOST);
}

export async function getCartArtworks(ids: string[]): Promise<CartArtworkInfo[]> {
  const valid = [...new Set(ids.filter((id) => UUID_RE.test(id)))].slice(0, 100);
  if (valid.length === 0) return [];

  const supabaseClient = supabase;
  if (!hasSupabaseConfig || !supabaseClient || isPlaceholderSupabaseConfig()) {
    return getFallbackCartArtworks(valid);
  }

  const { data: artworks, error } = await supabaseClient
    .from('artworks')
    .select('id, title, price, images, edition_type, status, artists(name_ko)')
    .in('id', valid)
    .eq('is_hidden', false);
  if (error || !artworks) {
    console.error('getCartArtworks query error:', error);
    return getFallbackCartArtworks(valid);
  }

  const infoById = new Map<string, CartArtworkInfo>();
  for (const a of artworks as ArtworkRow[]) {
    const { data: availResult, error: availabilityError } = await supabaseClient.rpc(
      'check_artwork_availability',
      {
        p_artwork_id: a.id,
      }
    );
    const isAvailable = availabilityError
      ? isStatusAvailable(a.status)
      : Array.isArray(availResult) && availResult[0]?.is_available === true;

    const artistRow = a.artists as { name_ko: string } | { name_ko: string }[] | null;
    const artistName = Array.isArray(artistRow)
      ? (artistRow[0]?.name_ko ?? '')
      : (artistRow?.name_ko ?? '');

    const images = Array.isArray(a.images) ? (a.images as string[]) : [];

    // parsePrice는 "확인 중"/"문의"/null 등 미가격을 Infinity로 반환 → 카트 UI가 "₩∞"를 렌더한다.
    // 미가격 작품은 결제 불가(createOrder가 거부)이므로 표시상으로도 unavailable + price 0으로 정규화.
    const { price, hasValidPrice } = normalizePrice(a.price);

    infoById.set(a.id, {
      id: a.id,
      title: a.title ?? '',
      artistName,
      price,
      image: images[0] ?? null,
      editionType: (a.edition_type as EditionType | null) ?? null,
      isAvailable: isAvailable && hasValidPrice,
    });
  }

  return valid.flatMap((id) => {
    const info = infoById.get(id);
    return info ? [info] : [];
  });
}
