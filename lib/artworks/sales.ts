import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveAndSyncArtworkStatus } from '@/lib/artworks/status';
import type { Database } from '@/types/supabase';

export type ArtworkSalesClient = SupabaseClient<Database>;

type ArtworkSaleRow = {
  id: string;
  artwork_id: string;
  source?: string | null;
  sale_price?: number | null;
  quantity?: number | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  note?: string | null;
  sold_at?: string | null;
};

type ArtworkRow = {
  id: string;
  title: string | null;
  edition_type?: string | null;
  edition_limit?: number | null;
};

export type RecordManualArtworkSaleInput = {
  artworkId: string;
  salePrice: number;
  quantity: number;
  buyerName: string;
  buyerPhone: string;
  note: string;
  soldAt: string;
};

export type UpdateManualArtworkSaleInput = {
  saleId: string;
  artworkId: string;
  salePrice: number;
  quantity: number;
  buyerName: string;
  buyerPhone: string;
  note: string;
  soldAt: string;
};

export type VoidManualArtworkSaleInput = {
  saleId: string;
  reason: string;
  now: string;
};

export type ArtworkSaleMutationResult = {
  artworkId: string;
  artworkTitle: string | null;
};

export type UpdateArtworkSaleMutationResult = ArtworkSaleMutationResult & {
  existingSale: ArtworkSaleRow;
};

export type VoidArtworkSaleMutationResult = ArtworkSaleMutationResult & {
  existingSale: ArtworkSaleRow;
};

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

async function fetchArtwork(supabase: ArtworkSalesClient, artworkId: string): Promise<ArtworkRow> {
  const { data: artwork } = await supabase
    .from('artworks')
    .select('id, title, edition_type, edition_limit')
    .eq('id', artworkId)
    .single();

  if (!artwork) throw new Error('작품을 찾을 수 없습니다.');
  return artwork;
}

async function listActiveSaleQuantities(
  supabase: ArtworkSalesClient,
  artworkId: string,
  columns = 'quantity'
) {
  let { data: sales, error: salesError } = await supabase
    .from('artwork_sales')
    .select(columns)
    .eq('artwork_id', artworkId)
    .is('voided_at', null);

  if (salesError && isMissingVoidedAtColumnError(salesError)) {
    ({ data: sales, error: salesError } = await supabase
      .from('artwork_sales')
      .select(columns)
      .eq('artwork_id', artworkId));
  }
  if (salesError) throw salesError;
  return (sales ?? []) as unknown as ArtworkSaleRow[];
}

async function assertEditionCapacity(
  supabase: ArtworkSalesClient,
  artwork: ArtworkRow,
  quantity: number,
  options: { excludeSaleId?: string; actionLabel: string }
) {
  if (artwork.edition_type !== 'limited' || !artwork.edition_limit) return;

  const sales = await listActiveSaleQuantities(
    supabase,
    artwork.id,
    options.excludeSaleId ? 'id, quantity' : 'quantity'
  );
  const currentSold = sales
    .filter((sale) => sale.id !== options.excludeSaleId)
    .reduce((sum, sale) => sum + (sale.quantity || 1), 0);

  if (currentSold + quantity > artwork.edition_limit) {
    throw new Error(
      `에디션 수량을 초과할 수 없습니다. (현재: ${currentSold}, 제한: ${artwork.edition_limit}, ${options.actionLabel}: ${quantity})`
    );
  }
}

export async function listArtworkSales(supabase: ArtworkSalesClient, artworkId: string) {
  let { data, error } = await supabase
    .from('artwork_sales')
    .select('*')
    .eq('artwork_id', artworkId)
    .is('voided_at', null)
    .order('sold_at', { ascending: false });

  if (error && isMissingVoidedAtColumnError(error)) {
    ({ data, error } = await supabase
      .from('artwork_sales')
      .select('*')
      .eq('artwork_id', artworkId)
      .order('sold_at', { ascending: false }));
  }

  if (error) throw error;
  return data || [];
}

export async function recordManualArtworkSale(
  supabase: ArtworkSalesClient,
  input: RecordManualArtworkSaleInput
): Promise<ArtworkSaleMutationResult> {
  const artwork = await fetchArtwork(supabase, input.artworkId);
  await assertEditionCapacity(supabase, artwork, input.quantity, { actionLabel: '추가시도' });

  const { error } = await supabase.from('artwork_sales').insert({
    artwork_id: input.artworkId,
    sale_price: input.salePrice,
    quantity: input.quantity,
    buyer_name: input.buyerName,
    buyer_phone: input.buyerPhone || null,
    note: input.note,
    sold_at: input.soldAt,
  });

  if (error) throw error;

  await deriveAndSyncArtworkStatus(supabase, input.artworkId);

  return { artworkId: input.artworkId, artworkTitle: artwork.title };
}

export async function updateManualArtworkSale(
  supabase: ArtworkSalesClient,
  input: UpdateManualArtworkSaleInput
): Promise<UpdateArtworkSaleMutationResult> {
  const { data: existing } = await supabase
    .from('artwork_sales')
    .select('id, artwork_id, source, sale_price, quantity, buyer_name, buyer_phone, note, sold_at')
    .eq('id', input.saleId)
    .single();

  if (!existing) throw new Error('판매 기록을 찾을 수 없습니다.');
  if (existing.artwork_id !== input.artworkId) {
    throw new Error('판매 기록과 작품 정보가 일치하지 않습니다.');
  }
  if (existing.source === 'toss') {
    throw new Error('외부 동기화 판매 기록은 수정할 수 없습니다.');
  }

  const artwork = await fetchArtwork(supabase, input.artworkId);
  await assertEditionCapacity(supabase, artwork, input.quantity, {
    excludeSaleId: input.saleId,
    actionLabel: '수정시도',
  });

  const { error } = await supabase
    .from('artwork_sales')
    .update({
      sale_price: input.salePrice,
      quantity: input.quantity,
      buyer_name: input.buyerName || null,
      buyer_phone: input.buyerPhone || null,
      note: input.note || null,
      sold_at: input.soldAt || new Date().toISOString(),
    })
    .eq('id', input.saleId);

  if (error) throw error;

  await deriveAndSyncArtworkStatus(supabase, input.artworkId);

  return { artworkId: input.artworkId, artworkTitle: artwork.title, existingSale: existing };
}

export async function voidManualArtworkSale(
  supabase: ArtworkSalesClient,
  input: VoidManualArtworkSaleInput
): Promise<VoidArtworkSaleMutationResult> {
  const { data: existing } = await supabase
    .from('artwork_sales')
    .select('id, artwork_id, source, sale_price, quantity, buyer_name')
    .eq('id', input.saleId)
    .single();

  if (!existing) throw new Error('판매 기록을 찾을 수 없습니다.');

  const { error } = await supabase
    .from('artwork_sales')
    .update({ voided_at: input.now, void_reason: input.reason })
    .eq('id', input.saleId);

  if (error) throw error;

  const { data: artwork } = await supabase
    .from('artworks')
    .select('title')
    .eq('id', existing.artwork_id)
    .single();

  await deriveAndSyncArtworkStatus(supabase, existing.artwork_id);

  return {
    artworkId: existing.artwork_id,
    artworkTitle: artwork?.title ?? null,
    existingSale: existing,
  };
}
