'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import {
  buildCustomerRecords,
  type CustomerContactOverrideInput,
  type CustomerProfileInput,
  type CustomerRecord,
  type CustomerSaleInput,
} from '@/lib/admin/customer-records';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  created_at: string | null;
};

type SaleRow = CustomerSaleInput;

type ContactOverrideRow = CustomerContactOverrideInput;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getCustomerRecords(): Promise<CustomerRecord[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const [{ data: profiles }, { data: sales }, { data: contactOverrides }] = await Promise.all([
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
    fetchAllInBatches<ContactOverrideRow>((from, to) =>
      supabase
        .from('customer_contact_overrides')
        .select('customer_key, phone, email')
        .range(from, to)
    ),
  ]);

  return buildCustomerRecords({
    profiles: (profiles || []) as CustomerProfileInput[],
    sales: (sales || []) as SaleRow[],
    contactOverrides: (contactOverrides || []) as ContactOverrideRow[],
  });
}

export async function updateCustomerContact(input: {
  customerKey: string;
  customerName: string;
  phone: string;
  email: string;
}): Promise<{ success: boolean; phone: string | null; email: string | null }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const customerKey = input.customerKey.trim();
  const customerName = input.customerName.trim();
  const phone = input.phone.trim() || null;
  const email = input.email.trim().toLowerCase() || null;

  if (!customerKey || !customerName) {
    throw new Error('고객 정보가 올바르지 않습니다.');
  }

  if (email && !emailPattern.test(email)) {
    throw new Error('이메일 형식이 올바르지 않습니다.');
  }

  const { error } = await supabase.from('customer_contact_overrides').upsert(
    {
      customer_key: customerKey,
      customer_name: customerName,
      phone,
      email,
      updated_by: admin.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'customer_key' }
  );

  if (error) throw error;

  revalidatePath('/admin/users');

  return { success: true, phone, email };
}
