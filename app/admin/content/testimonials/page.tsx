import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { TestimonialsManager } from './testimonials-manager';

export default async function TestimonialsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: testimonials } = await supabase
    .from('testimonials')
    .select('*')
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });

  return <TestimonialsManager testimonials={testimonials || []} />;
}
