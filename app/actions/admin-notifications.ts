'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';

export type AdminNotification = {
  id: string;
  category: 'purchase' | 'registration' | 'action_needed' | 'analytics';
  severity: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  detail?: string;
  href: string;
  createdAt: string; // ISO — unread 비교 + 정렬 기준
};

type SupabaseClient = Awaited<ReturnType<typeof requireAdminClient>>;
type RpcResult<T> = { data: T | null; error: unknown };

const RECENT_WINDOW_DAYS = 30; // 신규 등록·구매 알림에 포함할 최대 기간

// 운영 상태 알림은 당일 UTC 자정을 createdAt으로 써서 하루 단위 재-unread 방지.
function todayUtcIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

async function fetchPurchases(supabase: SupabaseClient): Promise<AdminNotification[]> {
  const sinceIso = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_no, buyer_name, total_amount, paid_at')
    .eq('status', 'paid')
    .not('paid_at', 'is', null)
    .gte('paid_at', sinceIso)
    .order('paid_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map((row) => ({
    id: `order:${row.id}`,
    category: 'purchase',
    severity: 'success',
    title: `구매 완료 — ${row.buyer_name ?? '구매자'}`,
    detail: `주문 #${row.order_no}${row.total_amount ? ` · ${formatKrw(row.total_amount)}` : ''}`,
    href: `/admin/orders/${row.id}`,
    createdAt: row.paid_at as string,
  }));
}

async function fetchRegistrations(supabase: SupabaseClient): Promise<AdminNotification[]> {
  const sinceIso = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString();
  const notifications: AdminNotification[] = [];

  const [artworksRes, artistsRes] = await Promise.all([
    supabase
      .from('artworks')
      .select('created_at', { count: 'exact' })
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('artists')
      .select('created_at', { count: 'exact' })
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const artworkCount = artworksRes.count ?? 0;
  if (artworkCount > 0 && artworksRes.data?.[0]?.created_at) {
    notifications.push({
      id: 'reg:artworks',
      category: 'registration',
      severity: 'info',
      title: `신규 작품 ${artworkCount}건 등록`,
      detail: `최근 ${RECENT_WINDOW_DAYS}일`,
      href: '/admin/artworks',
      createdAt: artworksRes.data[0].created_at,
    });
  }

  const artistCount = artistsRes.count ?? 0;
  if (artistCount > 0 && artistsRes.data?.[0]?.created_at) {
    notifications.push({
      id: 'reg:artists',
      category: 'registration',
      severity: 'info',
      title: `신규 작가 ${artistCount}명 등록`,
      detail: `최근 ${RECENT_WINDOW_DAYS}일`,
      href: '/admin/artists',
      createdAt: artistsRes.data[0].created_at,
    });
  }

  return notifications;
}

async function fetchActionNeeded(supabase: SupabaseClient): Promise<AdminNotification[]> {
  const SLA_THRESHOLD = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const today = todayUtcIso();

  const [slaRes, escalatedRes, refundRes, pendingAppsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'preparing'])
      .not('paid_at', 'is', null)
      .lt('paid_at', SLA_THRESHOLD),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .not('escalated_at', 'is', null)
      .not('status', 'in', '(completed,cancelled,refunded,refund_requested)'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'refund_requested'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin')
      .eq('status', 'pending'),
  ]);

  const notifications: AdminNotification[] = [];

  const slaCount = slaRes.count ?? 0;
  const escalatedCount = escalatedRes.count ?? 0;
  const refundCount = refundRes.count ?? 0;
  const pendingApps = pendingAppsRes.count ?? 0;

  if (escalatedCount > 0) {
    notifications.push({
      id: 'alert:escalated',
      category: 'action_needed',
      severity: 'danger',
      title: `에스컬레이션 주문 ${escalatedCount}건`,
      detail: '수동 에스컬레이션 마킹된 미해결 주문',
      href: '/admin/orders',
      createdAt: today,
    });
  }
  if (refundCount > 0) {
    notifications.push({
      id: 'alert:refund-requested',
      category: 'action_needed',
      severity: 'warning',
      title: `환불 요청 ${refundCount}건`,
      detail: '처리 대기 중인 환불 요청',
      href: '/admin/orders?status=refund_requested',
      createdAt: today,
    });
  }
  if (slaCount > 0) {
    notifications.push({
      id: 'alert:sla-overdue',
      category: 'action_needed',
      severity: 'warning',
      title: `SLA 초과 주문 ${slaCount}건`,
      detail: '72시간 이상 미처리 결제 완료 주문',
      href: '/admin/orders?status=paid',
      createdAt: today,
    });
  }
  if (pendingApps > 0) {
    notifications.push({
      id: 'alert:pending-applications',
      category: 'action_needed',
      severity: 'info',
      title: `승인 대기 신청 ${pendingApps}건`,
      detail: '검토가 필요한 작가·출품자 신청',
      href: '/admin/users?status=pending',
      createdAt: today,
    });
  }

  return notifications;
}

async function fetchAnalytics(supabase: SupabaseClient): Promise<AdminNotification[]> {
  const notifications: AdminNotification[] = [];

  const untypedRpc = supabase.rpc.bind(supabase) as unknown as <T>(
    name: string,
    args?: Record<string, unknown>
  ) => Promise<RpcResult<T>>;

  type GscSyncStatusRow = {
    latest_date: string | null;
    total_rows: number;
    last_fetched: string | null;
  };
  type GscDailyRow = { day: string; impressions: number; clicks: number };

  // GSC has ~2-day lag — request 16 days back to guarantee ≥14 rows for 7-vs-7 comparison.
  const since16d = new Date(Date.now() - 16 * 86_400_000).toISOString().slice(0, 10);

  const [wvRes, syncRes, dailyRes] = await Promise.all([
    untypedRpc<number>('get_web_vitals_regression_count', {
      since_ts: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      min_sample_size: 10,
    }),
    untypedRpc<GscSyncStatusRow[]>('get_gsc_sync_status', {}),
    untypedRpc<GscDailyRow[]>('get_gsc_daily_trend', { since_date: since16d }),
  ]);

  // Web Vitals 회귀
  const regressionCount = !wvRes.error && typeof wvRes.data === 'number' ? wvRes.data : 0;
  if (regressionCount > 0) {
    notifications.push({
      id: 'alert:web-vitals-regression',
      category: 'analytics',
      severity: 'danger',
      title: `Web Vitals 회귀 ${regressionCount}건`,
      detail: '7일 이내 poor 임계값 초과 페이지',
      href: '/admin/analytics',
      createdAt: todayUtcIso(),
    });
  }

  // GSC 동기화 중단 (4일 초과)
  // 기준이 > 3이었으나 GSC publish lag가 주말·공휴일 끼면 3~4일까지 정상 — 2026-05-29
  // false-positive 사고(last_fetched 정상, latest_date=5/26) 후 4일로 완화.
  // 실제 동기화 장애(cron 실패·OAuth 만료)는 last_fetched도 함께 stale해져 별도 신호.
  if (!syncRes.error && syncRes.data?.length) {
    const status = syncRes.data[0];
    if (status.latest_date) {
      const latestDate = new Date(status.latest_date);
      const staleDays = (Date.now() - latestDate.getTime()) / 86_400_000;
      if (staleDays > 4) {
        notifications.push({
          id: 'alert:gsc-sync-stale',
          category: 'analytics',
          severity: 'danger',
          title: 'GSC 데이터 동기화 중단',
          detail: `마지막 수집: ${status.latest_date} (${Math.floor(staleDays)}일 전)`,
          href: '/admin/analytics',
          createdAt: todayUtcIso(),
        });
      }
    }
  }

  // GSC 트래픽 급락 (최근 7일 vs 직전 7일, -30% 초과)
  // 14일치 데이터가 있어야 7일 vs 7일 공평한 비교 가능.
  if (!dailyRes.error && (dailyRes.data?.length ?? 0) >= 14) {
    const rows = [...(dailyRes.data ?? [])].sort((a, b) => a.day.localeCompare(b.day));
    const recent = rows.slice(-7);
    const prior = rows.slice(rows.length - 14, rows.length - 7);
    const recentClicks = recent.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const priorClicks = prior.reduce((s, r) => s + (r.clicks ?? 0), 0);
    if (priorClicks > 10 && recentClicks / priorClicks < 0.7) {
      const drop = Math.round((1 - recentClicks / priorClicks) * 100);
      const latestDay = recent[recent.length - 1]?.day ?? since16d;
      notifications.push({
        id: 'alert:gsc-traffic-drop',
        category: 'analytics',
        severity: 'warning',
        title: `GSC 클릭 ${drop}% 감소`,
        detail: '최근 7일 vs 직전 7일 비교',
        href: '/admin/analytics',
        createdAt: `${latestDay}T00:00:00.000Z`,
      });
    }
  }

  return notifications;
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const [purchasesResult, registrationsResult, actionNeededResult, analyticsResult] =
    await Promise.allSettled([
      fetchPurchases(supabase),
      fetchRegistrations(supabase),
      fetchActionNeeded(supabase),
      fetchAnalytics(supabase),
    ]);

  const all: AdminNotification[] = [
    ...(purchasesResult.status === 'fulfilled' ? purchasesResult.value : []),
    ...(registrationsResult.status === 'fulfilled' ? registrationsResult.value : []),
    ...(actionNeededResult.status === 'fulfilled' ? actionNeededResult.value : []),
    ...(analyticsResult.status === 'fulfilled' ? analyticsResult.value : []),
  ];

  all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all.slice(0, 30);
}
