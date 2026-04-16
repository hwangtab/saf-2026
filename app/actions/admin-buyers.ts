'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';

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
  return source === 'toss' ? 'online' : 'offline';
}

export async function getAllBuyers(): Promise<BuyerRecord[]> {
  await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  let { data, error } = await supabase
    .from('artwork_sales')
    .select('id, artwork_id, sale_price, quantity, sold_at, source, buyer_name, buyer_phone')
    .not('buyer_name', 'is', null)
    .is('voided_at', null)
    .order('sold_at', { ascending: true });

  if (error && error.code === '42703' && error.message?.includes('voided_at')) {
    ({ data, error } = await supabase
      .from('artwork_sales')
      .select('id, artwork_id, sale_price, quantity, sold_at, source, buyer_name, buyer_phone')
      .not('buyer_name', 'is', null)
      .order('sold_at', { ascending: true }));
  }

  if (error) throw error;

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

  for (const row of (data || []) as SaleRow[]) {
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

  const supabase = await createSupabaseAdminClient();
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
