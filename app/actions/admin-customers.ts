'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import {
  buildCustomerRecords,
  type CustomerProfileInput,
  type CustomerRecord,
  type CustomerSaleInput,
} from '@/lib/admin/customer-records';

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  created_at: string | null;
};

type SaleRow = CustomerSaleInput;

export async function getCustomerRecords(): Promise<CustomerRecord[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const [{ data: profiles }, { data: sales }] = await Promise.all([
    fetchAllInBatches<ProfileRow>((from, to) =>
      supabase
        .from('profiles')
        .select('id, name, email, status, created_at')
        .eq('role', 'user')
        .range(from, to)
    ),
    fetchAllInBatches<SaleRow>(async (from, to) => {
      const result = await supabase
        .from('artwork_sales')
        .select(
          [
            'id',
            'artwork_id',
            'buyer_name',
            'buyer_phone',
            'sale_price',
            'quantity',
            'sold_at',
            'source',
            'source_detail',
            'artworks(title, artists(name_ko))',
            'exhibition_sale_details(purchase_channel, delivery_status, shipping_required)',
          ].join(', ')
        )
        .not('buyer_name', 'is', null)
        .is('voided_at', null)
        .order('sold_at', { ascending: false })
        .range(from, to);

      return result as unknown as { data: SaleRow[] | null; error: unknown; count?: number | null };
    }),
  ]);

  return buildCustomerRecords({
    profiles: (profiles || []) as CustomerProfileInput[],
    sales: (sales || []) as SaleRow[],
  });
}
