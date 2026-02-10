'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';

export type DashboardStats = {
  artists: {
    total: number;
    pending: number;
    suspended: number;
  };
  artworks: {
    total: number;
    available: number;
    reserved: number;
    sold: number;
    hidden: number;
  };
  recentApplications: Array<{
    id: string;
    name: string;
    email: string;
    created_at: string;
    status: string;
  }>;
  recentArtworks: Array<{
    id: string;
    title: string;
    artist_name: string;
    created_at: string;
  }>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  // Artist stats - use COUNT queries for performance
  const [artistsResult, pendingResult, suspendedResult] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'artist'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
  ]);

  // Artwork stats - use COUNT queries for performance
  const [totalArtworksResult, availableResult, reservedResult, soldResult, hiddenResult] =
    await Promise.all([
      supabase.from('artworks').select('*', { count: 'exact', head: true }),
      supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')
        .eq('is_hidden', false),
      supabase
        .from('artworks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'reserved'),
      supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('artworks').select('*', { count: 'exact', head: true }).eq('is_hidden', true),
    ]);

  // Recent applications
  const { data: recentApps } = await supabase
    .from('profiles')
    .select('id, name, email, created_at, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  // Recent artworks
  const { data: recentArtworks } = await supabase
    .from('artworks')
    .select('id, title, created_at, artists(name_ko)')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    artists: {
      total: artistsResult.count || 0,
      pending: pendingResult.count || 0,
      suspended: suspendedResult.count || 0,
    },
    artworks: {
      total: totalArtworksResult.count || 0,
      available: availableResult.count || 0,
      reserved: reservedResult.count || 0,
      sold: soldResult.count || 0,
      hidden: hiddenResult.count || 0,
    },
    recentApplications: (recentApps || []).map((app) => ({
      id: app.id,
      name: app.name || '(이름 없음)',
      email: app.email || '',
      created_at: app.created_at,
      status: app.status,
    })),
    recentArtworks: (recentArtworks || []).map((artwork) => {
      const artistsArray = artwork.artists as unknown as { name_ko: string | null }[] | null;
      const artistName = artistsArray?.[0]?.name_ko || '알 수 없음';
      return {
        id: artwork.id,
        title: artwork.title,
        artist_name: artistName,
        created_at: artwork.created_at,
      };
    }),
  };
}
