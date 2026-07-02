import { logAdminAction } from '@/app/actions/activity-log-writer';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { csvSafeCell } from '@/lib/utils/csv';
import { getMonthlySettlements } from '@/app/actions/admin-settlements';

function getKstDateToken() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function GET(request: Request) {
  if (request.headers.get('next-router-prefetch') === '1') {
    return new Response(null, { status: 204 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return new Response('Unauthorized', { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return new Response('Failed to verify role', { status: 500 });
  if (!profile || profile.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? undefined;
  const data = await getMonthlySettlements(month);

  const header = [
    '작가',
    '판매건수',
    '판매액',
    '정산예정액(50%)',
    '지급상태',
    '실지급액',
    '지급일',
    '메모',
  ];
  const rows = data.rows.map((r) => [
    r.artistName,
    r.soldCount,
    r.gross,
    r.share,
    r.status === 'paid' ? '지급완료' : '미지급',
    r.paidAmount ?? '',
    r.paidAt ? r.paidAt.slice(0, 10) : '',
    r.note ?? '',
  ]);

  const csvBody =
    '\uFEFF' +
    [header, ...rows].map((row) => row.map((cell) => csvSafeCell(cell)).join(',')).join('\r\n');

  try {
    await logAdminAction(
      'artist_settlements_exported',
      'artist',
      'all',
      { month: data.month, total_count: rows.length },
      user.id,
      { summary: `정산 리포트 다운로드 ${data.month} (${rows.length}건)`, reversible: false }
    );
  } catch (error) {
    console.error('Failed to log settlements export:', error);
  }

  const fileName = `settlements-${data.month || 'none'}-${getKstDateToken()}.csv`;
  return new Response(csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
