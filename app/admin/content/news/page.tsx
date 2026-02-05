import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { NewsManager } from './news-manager';

export default async function NewsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: news } = await supabase
    .from('news')
    .select('*')
    .order('date', { ascending: false });

  return <NewsManager news={news || []} />;
}
