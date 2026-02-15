'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';

const KST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
});

type PendingApplicationRow = {
  user_id: string;
  artist_name: string | null;
  contact: string | null;
  created_at: string;
};

type RecentApplicationProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
};

type RecentArtworkRow = {
  id: string;
  title: string;
  created_at: string;
  artists:
    | {
        name_ko: string | null;
      }
    | Array<{
        name_ko: string | null;
      }>
    | null;
};

export type DashboardOverviewStats = {
  artists: {
    totalRegistered: number;
    linkedAccounts: number;
    unlinkedAccounts: number;
    pendingApplications: number;
  };
  artworks: {
    total: number;
    sold: number;
    hidden: number;
  };
  revenue: {
    currentMonthLabel: string;
    currentMonthRevenue: number;
    currentMonthSoldCount: number;
  };
  recentApplications: Array<{
    id: string;
    name: string;
    email: string;
    contact: string;
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

function parsePrice(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return Math.max(0, Math.round(price));
  }

  if (typeof price === 'string') {
    const numeric = Number(price.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.round(numeric));
    }
  }

  return 0;
}

function getKstYearMonthParts(date: Date): { year: number; month: number } {
  const parts = KST_PARTS_FORMATTER.formatToParts(date);
  const yearPart = parts.find((part) => part.type === 'year')?.value;
  const monthPart = parts.find((part) => part.type === 'month')?.value;

  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new Error('KST 기준 연월을 계산할 수 없습니다.');
  }

  return { year, month };
}

function getKstMonthBoundaryIso(now: Date) {
  const { year, month } = getKstYearMonthParts(now);
  const monthStartUtc = new Date(Date.UTC(year, month - 1, 1, -9, 0, 0, 0));
  const nextMonthStartUtc = new Date(Date.UTC(year, month, 1, -9, 0, 0, 0));

  return {
    currentMonthLabel: `${year}년 ${month}월`,
    startIso: monthStartUtc.toISOString(),
    endIso: nextMonthStartUtc.toISOString(),
  };
}

export async function getDashboardOverviewStats(): Promise<DashboardOverviewStats> {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const now = new Date();
  const monthBoundary = getKstMonthBoundaryIso(now);

  const [
    totalArtistsResult,
    linkedArtistsResult,
    pendingProfilesResult,
    totalArtworksResult,
    soldArtworksResult,
    hiddenArtworksResult,
    recentArtworksResult,
    currentMonthSoldRowsResult,
  ] = await Promise.all([
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase
      .from('artists')
      .select('id', { count: 'exact', head: true })
      .not('user_id', 'is', null),
    supabase.from('profiles').select('id').eq('role', 'artist').eq('status', 'pending'),
    supabase.from('artworks').select('id', { count: 'exact', head: true }),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('is_hidden', true),
    supabase
      .from('artworks')
      .select('id, title, created_at, artists(name_ko)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('artwork_sales')
      .select('sale_price, quantity')
      .gte('sold_at', monthBoundary.startIso)
      .lt('sold_at', monthBoundary.endIso),
  ]);

  const baseErrors = [
    totalArtistsResult.error,
    linkedArtistsResult.error,
    pendingProfilesResult.error,
    totalArtworksResult.error,
    soldArtworksResult.error,
    hiddenArtworksResult.error,
    recentArtworksResult.error,
    currentMonthSoldRowsResult.error,
  ].filter((error): error is NonNullable<typeof error> => !!error);

  if (baseErrors.length > 0) {
    throw baseErrors[0];
  }

  const pendingProfileIds = (pendingProfilesResult.data || [])
    .map((profile) => profile.id)
    .filter((id): id is string => typeof id === 'string');

  let pendingApplicationsCount = 0;
  let recentPendingApplicationsRaw: PendingApplicationRow[] = [];

  if (pendingProfileIds.length > 0) {
    const [pendingApplicationCountResult, recentPendingApplicationsResult] = await Promise.all([
      supabase
        .from('artist_applications')
        .select('user_id', { count: 'exact', head: true })
        .in('user_id', pendingProfileIds),
      supabase
        .from('artist_applications')
        .select('user_id, artist_name, contact, created_at')
        .in('user_id', pendingProfileIds)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (pendingApplicationCountResult.error) throw pendingApplicationCountResult.error;
    if (recentPendingApplicationsResult.error) throw recentPendingApplicationsResult.error;

    pendingApplicationsCount = pendingApplicationCountResult.count || 0;
    recentPendingApplicationsRaw = (recentPendingApplicationsResult.data || []).map((item) => ({
      user_id: item.user_id,
      artist_name: item.artist_name,
      contact: item.contact,
      created_at: item.created_at,
    }));
  }

  const recentApplicationUserIds = recentPendingApplicationsRaw.map((item) => item.user_id);
  let recentApplicationProfiles: RecentApplicationProfileRow[] = [];

  if (recentApplicationUserIds.length > 0) {
    const { data: profileRows, error: profileRowsError } = await supabase
      .from('profiles')
      .select('id, name, email, status')
      .in('id', recentApplicationUserIds);

    if (profileRowsError) throw profileRowsError;
    recentApplicationProfiles = profileRows || [];
  }

  const profileMap = new Map(recentApplicationProfiles.map((profile) => [profile.id, profile]));

  const currentMonthSalesRows = currentMonthSoldRowsResult.data || [];
  const currentMonthRevenue = currentMonthSalesRows.reduce(
    (sum, row) => sum + parsePrice(row.sale_price) * (row.quantity || 1),
    0
  );
  const currentMonthSoldCount = currentMonthSalesRows.reduce(
    (sum, row) => sum + (row.quantity || 1),
    0
  );

  return {
    artists: {
      totalRegistered: totalArtistsResult.count || 0,
      linkedAccounts: linkedArtistsResult.count || 0,
      unlinkedAccounts: Math.max(
        0,
        (totalArtistsResult.count || 0) - (linkedArtistsResult.count || 0)
      ),
      pendingApplications: pendingApplicationsCount,
    },
    artworks: {
      total: totalArtworksResult.count || 0,
      sold: soldArtworksResult.count || 0,
      hidden: hiddenArtworksResult.count || 0,
    },
    revenue: {
      currentMonthLabel: monthBoundary.currentMonthLabel,
      currentMonthRevenue,
      currentMonthSoldCount,
    },
    recentApplications: recentPendingApplicationsRaw.map((application) => {
      const profile = profileMap.get(application.user_id);
      return {
        id: application.user_id,
        name: application.artist_name || profile?.name || '(이름 없음)',
        email: profile?.email || '',
        contact: application.contact || '',
        created_at: application.created_at,
        status: profile?.status || 'pending',
      };
    }),
    recentArtworks: ((recentArtworksResult.data || []) as RecentArtworkRow[]).map((artwork) => {
      const artistsValue = artwork.artists;
      const artistName = Array.isArray(artistsValue)
        ? artistsValue[0]?.name_ko || '알 수 없음'
        : artistsValue?.name_ko || '알 수 없음';

      return {
        id: artwork.id,
        title: artwork.title,
        artist_name: artistName,
        created_at: artwork.created_at,
      };
    }),
  };
}
