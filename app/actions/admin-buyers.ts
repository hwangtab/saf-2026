'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';

export type BuyerRecord = {
  buyerName: string;
  buyerPhone: string | null;
  revenue: number;
  purchaseCount: number;
  artworkCount: number;
  channels: ('offline' | 'online')[];
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  saleIds: string[];
};

type SaleRow = {
  id: string;
  artwork_id: string;
  sale_price: number;
  quantity: number;
  sold_at: string;
  source: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
};

function mapChannel(source: string | null): 'offline' | 'online' {
  return source === 'toss' || source === 'cafe24' ? 'online' : 'offline';
}

export async function getAllBuyers(): Promise<BuyerRecord[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  // PostgREST db-max-rows=1000 한도 우회 — artwork_sales가 1000+로 누적되면 단발 select가
  // 잘려 buyer 집계가 부분 결과로 송출되는 문제 예방. batch fetch로 전부 받음.
  const buildSalesQuery = (from: number, to: number, includeVoidedFilter: boolean) => {
    const q = supabase
      .from('artwork_sales')
      .select('id, artwork_id, sale_price, quantity, sold_at, source, buyer_name, buyer_phone')
      .not('buyer_name', 'is', null)
      .order('sold_at', { ascending: true })
      .range(from, to);
    return includeVoidedFilter ? q.is('voided_at', null) : q;
  };

  let data: SaleRow[] = [];
  try {
    const result = await fetchAllInBatches<SaleRow>((from, to) => buildSalesQuery(from, to, true));
    data = result.data;
  } catch (err) {
    // voided_at 컬럼 없는 구형 스키마 fallback (42703 = undefined column)
    const code = (err as { code?: string } | null)?.code;
    const message = (err as { message?: string } | null)?.message;
    if (code === '42703' && message?.includes('voided_at')) {
      const result = await fetchAllInBatches<SaleRow>((from, to) =>
        buildSalesQuery(from, to, false)
      );
      data = result.data;
    } else {
      throw err;
    }
  }

  const buyerMap = new Map<
    string,
    {
      buyerName: string;
      buyerPhone: string | null;
      revenue: number;
      purchaseCount: number;
      artworkIds: Set<string>;
      channels: Set<'offline' | 'online'>;
      firstPurchaseDate: string;
      lastPurchaseDate: string;
      saleIds: string[];
    }
  >();

  for (const row of data) {
    const name = row.buyer_name?.trim();
    if (!name) continue;

    const price = row.sale_price * row.quantity;
    const channel = mapChannel(row.source);
    const soldAt = row.sold_at;
    const existing = buyerMap.get(name);

    if (existing) {
      existing.revenue += price;
      existing.purchaseCount += row.quantity;
      existing.artworkIds.add(row.artwork_id);
      existing.channels.add(channel);
      existing.saleIds.push(row.id);
      if (!existing.buyerPhone && row.buyer_phone?.trim()) {
        existing.buyerPhone = row.buyer_phone.trim();
      }
      if (soldAt > existing.lastPurchaseDate) {
        existing.lastPurchaseDate = soldAt;
      }
      if (soldAt < existing.firstPurchaseDate) {
        existing.firstPurchaseDate = soldAt;
      }
    } else {
      buyerMap.set(name, {
        buyerName: name,
        buyerPhone: row.buyer_phone?.trim() || null,
        revenue: price,
        purchaseCount: row.quantity,
        artworkIds: new Set([row.artwork_id]),
        channels: new Set([channel]),
        firstPurchaseDate: soldAt,
        lastPurchaseDate: soldAt,
        saleIds: [row.id],
      });
    }
  }

  return Array.from(buyerMap.values())
    .map((entry) => ({
      buyerName: entry.buyerName,
      buyerPhone: entry.buyerPhone,
      revenue: entry.revenue,
      purchaseCount: entry.purchaseCount,
      artworkCount: entry.artworkIds.size,
      channels: Array.from(entry.channels),
      firstPurchaseDate: entry.firstPurchaseDate,
      lastPurchaseDate: entry.lastPurchaseDate,
      saleIds: entry.saleIds,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function updateBuyerPhone(
  saleIds: string[],
  phone: string
): Promise<{ success: boolean }> {
  await requireAdmin();
  if (saleIds.length === 0) return { success: true };
  if (saleIds.length > 500) throw new Error('한 번에 처리할 수 있는 항목 수를 초과했습니다.');

  const supabase = await requireAdminClient();
  const trimmedPhone = phone.trim() || null;

  const { error } = await supabase
    .from('artwork_sales')
    .update({ buyer_phone: trimmedPhone })
    .in('id', saleIds);

  if (error) throw error;

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/admin/revenue');
  revalidatePath('/admin/buyers');

  return { success: true };
}
