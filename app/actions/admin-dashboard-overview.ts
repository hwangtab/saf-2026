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

type PendingExhibitorApplicationRow = {
  user_id: string;
  representative_name: string | null;
  contact: string | null;
  created_at: string;
};

type RecentPendingProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string;
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
    pendingProfilesCountResult,
    recentPendingProfilesResult,
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
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin')
      .eq('status', 'pending'),
    supabase
      .from('profiles')
      .select('id, name, email, role, status, created_at')
      .neq('role', 'admin')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
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
      .lt('sold_at', monthBoundary.endIso)
      .is('voided_at', null),
  ]);

  const currentMonthSalesVoidColumnMissing =
    !!currentMonthSoldRowsResult.error &&
    currentMonthSoldRowsResult.error.message.includes('voided_at');

  const baseErrors = [
    totalArtistsResult.error,
    linkedArtistsResult.error,
    pendingProfilesCountResult.error,
    recentPendingProfilesResult.error,
    totalArtworksResult.error,
    soldArtworksResult.error,
    hiddenArtworksResult.error,
    recentArtworksResult.error,
    currentMonthSalesVoidColumnMissing ? null : currentMonthSoldRowsResult.error,
  ].filter((error): error is NonNullable<typeof error> => !!error);

  if (baseErrors.length > 0) {
    throw baseErrors[0];
  }

  const pendingApplicationsCount = pendingProfilesCountResult.count || 0;

  const recentPendingProfiles = (recentPendingProfilesResult.data ||
    []) as RecentPendingProfileRow[];
  const recentPendingProfileIds = recentPendingProfiles.map((profile) => profile.id);
  let recentPendingApplicationsRaw: PendingApplicationRow[] = [];
  let recentPendingExhibitorApplicationsRaw: PendingExhibitorApplicationRow[] = [];

  if (recentPendingProfileIds.length > 0) {
    const [pendingApplicationRowsResult, pendingExhibitorApplicationRowsResult] = await Promise.all(
      [
        supabase
          .from('artist_applications')
          .select('user_id, artist_name, contact, created_at')
          .in('user_id', recentPendingProfileIds),
        supabase
          .from('exhibitor_applications')
          .select('user_id, representative_name, contact, created_at')
          .in('user_id', recentPendingProfileIds),
      ]
    );

    if (pendingApplicationRowsResult.error) throw pendingApplicationRowsResult.error;
    if (pendingExhibitorApplicationRowsResult.error)
      throw pendingExhibitorApplicationRowsResult.error;

    recentPendingApplicationsRaw = (pendingApplicationRowsResult.data || []).map((item) => ({
      user_id: item.user_id,
      artist_name: item.artist_name,
      contact: item.contact,
      created_at: item.created_at,
    }));
    recentPendingExhibitorApplicationsRaw = (pendingExhibitorApplicationRowsResult.data || []).map(
      (item) => ({
        user_id: item.user_id,
        representative_name: item.representative_name,
        contact: item.contact,
        created_at: item.created_at,
      })
    );
  }

  const pendingArtistApplicationMap = new Map(
    recentPendingApplicationsRaw.map((application) => [application.user_id, application])
  );
  const pendingExhibitorApplicationMap = new Map(
    recentPendingExhibitorApplicationsRaw.map((application) => [application.user_id, application])
  );

  let currentMonthSalesRows = currentMonthSoldRowsResult.data || [];
  if (
    currentMonthSoldRowsResult.error &&
    currentMonthSoldRowsResult.error.message.includes('voided_at')
  ) {
    const fallback = await supabase
      .from('artwork_sales')
      .select('sale_price, quantity')
      .gte('sold_at', monthBoundary.startIso)
      .lt('sold_at', monthBoundary.endIso);
    if (fallback.error) throw fallback.error;
    currentMonthSalesRows = fallback.data || [];
  }
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
    recentApplications: recentPendingProfiles.map((profile) => {
      const artistApplication = pendingArtistApplicationMap.get(profile.id);
      const exhibitorApplication = pendingExhibitorApplicationMap.get(profile.id);
      const application =
        profile.role === 'exhibitor'
          ? exhibitorApplication || artistApplication
          : artistApplication || exhibitorApplication;
      const applicantName =
        application && 'representative_name' in application
          ? application.representative_name
          : application?.artist_name;

      return {
        id: profile.id,
        name: applicantName || profile.name || '(이름 없음)',
        email: profile.email || '',
        contact: application?.contact || '',
        created_at: application?.created_at || profile.created_at,
        status: profile.status || 'pending',
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
