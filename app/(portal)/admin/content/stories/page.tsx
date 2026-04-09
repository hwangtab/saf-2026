import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { StoriesManager } from './stories-manager';

export default async function StoriesAdminPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: stories } = await supabase
    .from('stories')
    .select(
      'id, slug, title, title_en, category, excerpt, excerpt_en, body, body_en, thumbnail, author, published_at, is_published, display_order, tags'
    )
    .order('published_at', { ascending: false });

  return <StoriesManager stories={stories || []} />;
}
