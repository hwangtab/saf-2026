import { requireExhibitor } from '@/lib/auth/guards';
import { getSupabaseArtistsByOwner } from '@/lib/supabase-data';
import { supabase } from '@/lib/supabase';

export default async function ExhibitorDashboard() {
  const user = await requireExhibitor();
  const artists = await getSupabaseArtistsByOwner(user.id);

  let artworkCount = 0;
  if (artists.length > 0 && supabase) {
    const artistIds = artists.map((a: any) => a.id);
    const { count } = await supabase
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .in('artist_id', artistIds)
      .eq('is_hidden', false);

    artworkCount = count || 0;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-800 mb-8">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
            관리 중인 작가
          </h2>
          <p className="mt-2 text-4xl font-bold text-primary">{artists.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
            등록된 작품
          </h2>
          <p className="mt-2 text-4xl font-bold text-accent">{artworkCount}</p>
        </div>
      </div>
    </div>
  );
}
