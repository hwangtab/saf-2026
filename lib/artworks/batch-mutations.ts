import type { SupabaseClient } from '@supabase/supabase-js';

import { hasActiveOrdersForArtworks } from '@/lib/orders/active-order-guard';
import type { Database } from '@/types/supabase';

export type ArtworkBatchMutationClient = SupabaseClient<Database>;

export type BatchArtworkMutationResult = {
  success: boolean;
  partial: boolean;
  count: number;
  succeededIds: string[];
  failedIds: string[];
  errors: string[];
};

export type BatchArtworkVisibilityRow = {
  id: string;
  title: string | null;
  is_hidden: boolean | null;
  updated_at: string | null;
};

export type BatchArtworkDeleteSnapshot = {
  id: string;
  title: string | null;
  description?: string | null;
  size?: string | null;
  material?: string | null;
  year?: string | null;
  edition?: string | null;
  edition_type?: string | null;
  edition_limit?: number | null;
  price?: string | null;
  status?: string | null;
  sold_at?: string | null;
  is_hidden?: boolean | null;
  images?: unknown;
  shop_url?: string | null;
  artist_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BatchToggleArtworkHiddenInput = {
  ids: string[];
  isHidden: boolean;
  now: string;
};

export type BatchToggleArtworkHiddenMutationResult = {
  beforeArtworks: BatchArtworkVisibilityRow[];
  afterArtworks: BatchArtworkVisibilityRow[];
};

export type BatchDeleteArtworksInput = {
  ids: string[];
};

export type BatchDeleteArtworksMutationResult = {
  artworks: BatchArtworkDeleteSnapshot[];
  foundIds: string[];
  missingIds: string[];
  batchResult: BatchArtworkMutationResult;
};

export type DeleteArtworkMutationResult = {
  artwork: BatchArtworkDeleteSnapshot;
  artistName: string | null;
};

const ARTWORK_DELETE_SNAPSHOT_COLUMNS =
  'id, title, description, size, material, year, edition, edition_type, edition_limit, price, status, sold_at, is_hidden, images, shop_url, artist_id, created_at, updated_at';

function translateDeleteError(error: unknown, message: string) {
  if ((error as { code?: string }).code === '23503') {
    throw new Error(message);
  }
  throw error;
}

export async function deleteArtworkMutation(
  supabase: ArtworkBatchMutationClient,
  { id }: { id: string }
): Promise<DeleteArtworkMutationResult> {
  const { data: artwork, error: artworkFetchError } = await supabase
    .from('artworks')
    .select(ARTWORK_DELETE_SNAPSHOT_COLUMNS)
    .eq('id', id)
    .single();

  if (artworkFetchError) {
    if ((artworkFetchError as { code?: string }).code === 'PGRST116') {
      throw new Error('작품을 찾을 수 없습니다.');
    }
    throw artworkFetchError;
  }
  if (!artwork) {
    throw new Error('작품을 찾을 수 없습니다.');
  }

  if (await hasActiveOrdersForArtworks(supabase, [id])) {
    throw new Error('진행 중인 주문이 있어 삭제할 수 없습니다.');
  }

  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) {
    translateDeleteError(
      error,
      '주문·판매 이력이 연결돼 있어 삭제할 수 없습니다. 작품을 "숨김" 처리해 목록에서 가려주세요.'
    );
  }

  let artistName: string | null = null;
  if (artwork.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artwork.artist_id)
      .single();
    artistName = artist?.name_ko ?? null;
  }

  return {
    artwork: artwork as BatchArtworkDeleteSnapshot,
    artistName,
  };
}

export async function batchToggleArtworkHiddenMutation(
  supabase: ArtworkBatchMutationClient,
  { ids, isHidden, now }: BatchToggleArtworkHiddenInput
): Promise<BatchToggleArtworkHiddenMutationResult> {
  const { data: beforeArtworks } = await supabase
    .from('artworks')
    .select('id, title, is_hidden, updated_at')
    .in('id', ids);

  const { error } = await supabase
    .from('artworks')
    .update({ is_hidden: isHidden, updated_at: now })
    .in('id', ids);

  if (error) throw error;

  const { data: afterArtworks } = await supabase
    .from('artworks')
    .select('id, title, is_hidden, updated_at')
    .in('id', ids);

  return {
    beforeArtworks: (beforeArtworks || []) as BatchArtworkVisibilityRow[],
    afterArtworks: (afterArtworks || []) as BatchArtworkVisibilityRow[],
  };
}

export async function batchDeleteArtworksMutation(
  supabase: ArtworkBatchMutationClient,
  { ids }: BatchDeleteArtworksInput
): Promise<BatchDeleteArtworksMutationResult> {
  const { data: artworks, error: artworkFetchError } = await supabase
    .from('artworks')
    .select(ARTWORK_DELETE_SNAPSHOT_COLUMNS)
    .in('id', ids);
  if (artworkFetchError) throw artworkFetchError;

  const snapshotRows = (artworks || []) as BatchArtworkDeleteSnapshot[];
  const foundIds = snapshotRows
    .map((artwork) => artwork.id)
    .filter((id): id is string => typeof id === 'string');
  const foundSet = new Set(foundIds);
  const missingIds = ids.filter((id) => !foundSet.has(id));

  if (foundIds.length === 0) {
    throw new Error('선택한 작품을 찾을 수 없습니다.');
  }

  if (await hasActiveOrdersForArtworks(supabase, ids)) {
    throw new Error('진행 중인 주문이 있는 작품이 포함되어 삭제할 수 없습니다.');
  }

  const { error } = await supabase.from('artworks').delete().in('id', foundIds);
  if (error) {
    translateDeleteError(
      error,
      '선택한 작품 중 주문·판매 이력이 연결된 작품이 있어 삭제할 수 없습니다. 해당 작품은 "숨김" 처리해 주세요.'
    );
  }

  return {
    artworks: snapshotRows,
    foundIds,
    missingIds,
    batchResult: {
      success: true,
      partial: missingIds.length > 0,
      count: foundIds.length,
      succeededIds: foundIds,
      failedIds: missingIds,
      errors: missingIds.map((id) => `${id}: 작품을 찾을 수 없습니다.`),
    },
  };
}
