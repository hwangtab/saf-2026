'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import { logAdminAction } from './activity-log-writer';
import {
  computeMonthlySettlements,
  kstMonthRange,
  soldAtToKstMonth,
  roundShare,
  type SaleRowLite,
  type PaidRow,
  type MonthlySettlements,
} from '@/lib/settlements/compute';

type RawSaleRow = {
  sale_price: number;
  quantity: number;
  sold_at: string;
  artworks: {
    artist_id: string | null;
    artists: { name_ko: string | null } | Array<{ name_ko: string | null }> | null;
  } | null;
};

function extractArtistName(
  artists: { name_ko: string | null } | Array<{ name_ko: string | null }> | null
): string | null {
  if (!artists) return null;
  const first = Array.isArray(artists) ? artists[0] : artists;
  return first?.name_ko ?? null;
}

export async function getMonthlySettlements(month?: string): Promise<MonthlySettlements> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  // 1) 전체 비-void 매출의 sold_at으로 availableMonths 산출.
  const { data: allSoldRows } = await fetchAllInBatches<{ sold_at: string }>((from, to) =>
    supabase
      .from('artwork_sales')
      .select('sold_at')
      .is('voided_at', null)
      .order('sold_at', { ascending: false })
      .range(from, to)
  );
  const monthSet = new Set<string>();
  for (const r of allSoldRows) monthSet.add(soldAtToKstMonth(r.sold_at));
  const availableMonths = Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1));

  const targetMonth = month && monthSet.has(month) ? month : (availableMonths[0] ?? month ?? '');
  if (!targetMonth) {
    return {
      month: '',
      availableMonths,
      rows: [],
      totals: { gross: 0, share: 0, paidCount: 0, artistCount: 0 },
    };
  }

  // 2) 해당 월 매출.
  const { startIso, endIso } = kstMonthRange(targetMonth);
  const { data: rawSales } = await fetchAllInBatches<RawSaleRow>((from, to) =>
    supabase
      .from('artwork_sales')
      .select('sale_price, quantity, sold_at, artworks(artist_id, artists(name_ko))')
      .is('voided_at', null)
      .gte('sold_at', startIso)
      .lt('sold_at', endIso)
      .order('sold_at', { ascending: true })
      .range(from, to)
  );
  const sales: SaleRowLite[] = rawSales.map((r) => ({
    sale_price: r.sale_price,
    quantity: r.quantity,
    sold_at: r.sold_at,
    artist_id: r.artworks?.artist_id ?? null,
    artist_name: extractArtistName(r.artworks?.artists ?? null),
  }));

  // 3) 해당 월 지급 완료 행.
  const periodMonth = `${targetMonth}-01`;
  const { data: paidRows } = await supabase
    .from('artist_settlements')
    .select('artist_id, period_month, gross_amount, artist_share, paid_amount, paid_at, note')
    .eq('period_month', periodMonth);

  const paid: PaidRow[] = (paidRows ?? []).map((p) => ({
    artist_id: p.artist_id,
    period_month: p.period_month,
    gross_amount: Number(p.gross_amount),
    artist_share: Number(p.artist_share),
    paid_amount: p.paid_amount == null ? null : Number(p.paid_amount),
    paid_at: p.paid_at,
    note: p.note,
  }));

  return computeMonthlySettlements(sales, paid, targetMonth, availableMonths);
}

/** 해당 월 매출을 재집계해 gross/share 스냅샷을 만든 뒤 지급 완료 upsert. */
export async function markSettlementPaid(
  artistId: string,
  month: string,
  paidAmount: number | null,
  note: string | null
): Promise<{ success: true } | { error: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { startIso, endIso } = kstMonthRange(month);
  const { data: rawSales } = await fetchAllInBatches<{
    sale_price: number;
    quantity: number;
    artworks: { artist_id: string | null } | null;
  }>((from, to) =>
    supabase
      .from('artwork_sales')
      .select('sale_price, quantity, artworks(artist_id)')
      .is('voided_at', null)
      .gte('sold_at', startIso)
      .lt('sold_at', endIso)
      .range(from, to)
  );
  const gross = rawSales
    .filter((r) => r.artworks?.artist_id === artistId)
    .reduce((sum, r) => sum + r.sale_price * r.quantity, 0);

  if (gross <= 0) {
    return { error: '해당 월에 이 작가의 매출이 없어 정산할 수 없습니다.' };
  }
  const share = roundShare(gross);
  const periodMonth = `${month}-01`;

  const { error } = await supabase.from('artist_settlements').upsert(
    {
      artist_id: artistId,
      period_month: periodMonth,
      gross_amount: gross,
      artist_share: share,
      paid_amount: paidAmount,
      note,
      created_by: admin.id,
    },
    { onConflict: 'artist_id,period_month' }
  );
  if (error) {
    console.error('[markSettlementPaid] upsert failed:', error.message);
    return { error: '정산 기록 저장에 실패했습니다.' };
  }

  await logAdminAction(
    'artist_settlement_paid',
    'artist',
    artistId,
    { period_month: periodMonth, gross, share, paid_amount: paidAmount },
    admin.id,
    { summary: `정산 지급 완료: ${month} (₩${share.toLocaleString('ko-KR')})`, reversible: true }
  );
  return { success: true };
}

export async function unmarkSettlementPaid(
  artistId: string,
  month: string
): Promise<{ success: true } | { error: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const periodMonth = `${month}-01`;

  const { error } = await supabase
    .from('artist_settlements')
    .delete()
    .eq('artist_id', artistId)
    .eq('period_month', periodMonth);
  if (error) {
    console.error('[unmarkSettlementPaid] delete failed:', error.message);
    return { error: '정산 기록 취소에 실패했습니다.' };
  }

  await logAdminAction(
    'artist_settlement_unpaid',
    'artist',
    artistId,
    { period_month: periodMonth },
    admin.id,
    { summary: `정산 지급 취소: ${month}`, reversible: true }
  );
  return { success: true };
}
