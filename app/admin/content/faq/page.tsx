import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { FaqManager } from './faq-manager';

export default async function FaqPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: faqs } = await supabase
    .from('faq')
    .select('*')
    .order('display_order', { ascending: true });

  return <FaqManager faqs={faqs || []} />;
}
