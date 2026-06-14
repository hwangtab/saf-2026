'use server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { parsePrice } from '@/lib/parsePrice';

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

export async function getCartArtworks(ids: string[]): Promise<CartArtworkInfo[]> {
  const valid = [...new Set(ids.filter((id) => UUID_RE.test(id)))].slice(0, 100);
  if (valid.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, price, images, edition_type, artists(name_ko)')
    .in('id', valid)
    .eq('is_hidden', false);
  if (!artworks) return [];

  const results: CartArtworkInfo[] = [];
  for (const a of artworks) {
    const { data: availResult } = await supabase.rpc('check_artwork_availability', {
      p_artwork_id: a.id,
    });
    const isAvailable = Array.isArray(availResult) && availResult[0]?.is_available === true;

    const artistRow = a.artists as { name_ko: string } | { name_ko: string }[] | null;
    const artistName = Array.isArray(artistRow)
      ? (artistRow[0]?.name_ko ?? '')
      : (artistRow?.name_ko ?? '');

    const images = Array.isArray(a.images) ? (a.images as string[]) : [];

    // parsePrice는 "확인 중"/"문의"/null 등 미가격을 Infinity로 반환 → 카트 UI가 "₩∞"를 렌더한다.
    // 미가격 작품은 결제 불가(createOrder가 거부)이므로 표시상으로도 unavailable + price 0으로 정규화.
    const parsedPrice = parsePrice(a.price);
    const hasValidPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;

    results.push({
      id: a.id,
      title: a.title ?? '',
      artistName,
      price: hasValidPrice ? parsedPrice : 0,
      image: images[0] ?? null,
      editionType: (a.edition_type as CartArtworkInfo['editionType']) ?? null,
      isAvailable: isAvailable && hasValidPrice,
    });
  }
  return results;
}
