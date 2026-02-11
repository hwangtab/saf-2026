'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';

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
  revenue: {
    totalRevenue: number;
    inventoryValue: number;
    soldCount: number;
    averagePrice: number;
  };
  materialDistribution: Array<{
    material: string;
    count: number;
  }>;
  trends: {
    dailyArtists: Array<{ date: string; count: number }>;
    dailyArtworks: Array<{ date: string; count: number }>;
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
  const supabase = await createSupabaseAdminOrServerClient();

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

  const { data: allArtworks } = await supabase
    .from('artworks')
    .select('price, status, material, created_at');

  const parsePrice = (price: string | null): number => {
    if (!price) return 0;
    return parseInt(price.replace(/[^\d]/g, ''), 10) || 0;
  };

  const soldArtworks = (allArtworks || []).filter((a) => a.status === 'sold');
  const availableArtworks = (allArtworks || []).filter(
    (a) => a.status === 'available' || a.status === 'reserved'
  );

  const totalRevenue = soldArtworks.reduce((sum, a) => sum + parsePrice(a.price), 0);
  const inventoryValue = availableArtworks.reduce((sum, a) => sum + parsePrice(a.price), 0);
  const averagePrice = soldArtworks.length > 0 ? Math.round(totalRevenue / soldArtworks.length) : 0;

  const materialMap = new Map<string, number>();
  (allArtworks || []).forEach((a) => {
    const material = a.material || '미분류';
    materialMap.set(material, (materialMap.get(material) || 0) + 1);
  });
  const materialDistribution = Array.from(materialMap.entries())
    .map(([material, count]) => ({ material, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const { data: recentProfiles } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', thirtyDaysAgoIso)
    .eq('role', 'artist');

  const recentArtworksForTrends = (allArtworks || []).filter(
    (a) => a.created_at >= thirtyDaysAgoIso
  );

  const groupByDate = (items: { created_at: string }[]) => {
    const dateMap = new Map<string, number>();

    // Initialize map with 0 for last 30 days
    for (let i = 0; i <= 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      if (dateStr <= todayStr) {
        dateMap.set(dateStr, 0);
      }
    }

    items.forEach((item) => {
      const date = item.created_at.split('T')[0];
      if (dateMap.has(date)) {
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    });

    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const dailyArtists = groupByDate(recentProfiles || []);
  const dailyArtworks = groupByDate(recentArtworksForTrends || []);

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
    revenue: {
      totalRevenue,
      inventoryValue,
      soldCount: soldArtworks.length,
      averagePrice,
    },
    materialDistribution,
    trends: {
      dailyArtists,
      dailyArtworks,
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
