'use server';

import {
  buildExhibitionPurchaseAnalytics,
  type ExhibitionPurchaseAnalytics,
  type ExhibitionPurchaseSaleInput,
} from '@/lib/admin/exhibition-purchase-analytics';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';

type ExhibitionSaleRow = ExhibitionPurchaseSaleInput;

export async function getExhibitionPurchaseAnalytics(): Promise<ExhibitionPurchaseAnalytics> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const buildSalesQuery = (from: number, to: number, includeVoidedFilter: boolean) => {
    const query = supabase
      .from('artwork_sales')
      .select(
        `
          id,
          artwork_id,
          sale_price,
          quantity,
          sold_at,
          buyer_name,
          buyer_phone,
          exhibition_sale_details!inner(
            purchase_channel,
            delivery_status,
            shipping_required,
            paid_status,
            release_status
          )
        `
      )
      .not('buyer_name', 'is', null)
      .order('sold_at', { ascending: true })
      .range(from, to);

    return includeVoidedFilter ? query.is('voided_at', null) : query;
  };

  try {
    const result = await fetchAllInBatches<ExhibitionSaleRow>((from, to) =>
      buildSalesQuery(from, to, true)
    );
    return buildExhibitionPurchaseAnalytics(result.data);
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    const message = (err as { message?: string } | null)?.message;
    if (code === '42703' && message?.includes('voided_at')) {
      const result = await fetchAllInBatches<ExhibitionSaleRow>((from, to) =>
        buildSalesQuery(from, to, false)
      );
      return buildExhibitionPurchaseAnalytics(result.data);
    }
    throw err;
  }
}
