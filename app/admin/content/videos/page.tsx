import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { VideosManager } from './videos-manager';

export default async function VideosPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false });

  return <VideosManager videos={videos || []} />;
}
