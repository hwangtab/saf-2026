import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

type ArtworkStatus = Database['public']['Enums']['artwork_status'];

function isMissingVoidedAtColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  const merged = `${candidate.message || ''} ${candidate.details || ''} ${candidate.hint || ''}`
    .toLowerCase()
    .trim();

  return candidate.code === '42703' && merged.includes('voided_at');
}

function normalizeArtworkStatus(status: ArtworkStatus | null): ArtworkStatus {
  return status ?? 'available';
}

/**
 * 활성(non-voided) 판매 기록 기반으로 artwork.status를 재계산하고 업데이트.
 * sold -> available, available -> sold 양방향 동기화.
 * reserved 상태는 관리자 수동 설정이므로 판매 완료가 아닌 한 유지.
 */
export async function deriveAndSyncArtworkStatus(
  supabase: SupabaseClient<Database>,
  artworkId: string
): Promise<ArtworkStatus> {
  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, status, sold_at, edition_type, edition_limit, manual_sold_override')
    .eq('id', artworkId)
    .single();

  if (!artwork) return 'available';

  if (artwork.manual_sold_override && artwork.status === 'sold') {
    if (!artwork.sold_at) {
      await supabase
        .from('artworks')
        .update({
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', artworkId);
    }
    return 'sold';
  }

  let { data: salesRows, error: salesError } = await supabase
    .from('artwork_sales')
    .select('quantity')
    .eq('artwork_id', artworkId)
    .is('voided_at', null);

  if (salesError && isMissingVoidedAtColumnError(salesError)) {
    ({ data: salesRows, error: salesError } = await supabase
      .from('artwork_sales')
      .select('quantity')
      .eq('artwork_id', artworkId));
  }
  if (salesError) return normalizeArtworkStatus(artwork.status);

  const soldQuantity = (salesRows || []).reduce(
    (sum, row) => sum + Math.max(1, typeof row.quantity === 'number' ? row.quantity : 1),
    0
  );

  const editionType = artwork.edition_type || 'unique';
  const isSold =
    editionType === 'unique'
      ? soldQuantity >= 1
      : editionType === 'limited' && !!artwork.edition_limit
        ? soldQuantity >= artwork.edition_limit
        : false;

  if (isSold && artwork.status !== 'sold') {
    await supabase
      .from('artworks')
      .update({
        status: 'sold',
        sold_at: artwork.sold_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', artworkId);
    return 'sold';
  }

  if (!isSold && artwork.status === 'sold') {
    await supabase
      .from('artworks')
      .update({
        status: 'available',
        sold_at: null,
        manual_sold_override: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', artworkId);
    return 'available';
  }

  return normalizeArtworkStatus(artwork.status);
}
