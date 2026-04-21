/**
 * 2026-04 privilege-escalation 취약점 감사 스크립트.
 *
 * 배경: supabase/migrations/20260421060319 이전에는 profiles 테이블 UPDATE RLS가
 * auth.uid() = id 만 검사하고 컬럼 단위 GRANT 제한/트리거도 없어서, 임의 사용자가
 * 자기 row 를 admin 으로 승격시킬 수 있었다.
 *
 * 이 스크립트는 admin / exhibitor 권한을 가진 profiles 를 감사 로그 및 승인
 * 기록과 대조해, 정식 승인 이력이 없는데 승격된 계정을 보고한다.
 *
 * 실행: npx tsx scripts/audit-profile-escalation.ts
 * 필요 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (또는 SERVICE_ROLE_KEY)
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SECRET_KEY(SERVICE_ROLE_KEY) 필요.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LogRow = {
  actor_id: string | null;
  target_id: string | null;
  action: string | null;
  created_at: string | null;
};

async function main() {
  // 1) 권한 있는 계정 전체
  const { data: privileged, error: privErr } = await supabase
    .from('profiles')
    .select('id, email, name, role, status, created_at, updated_at')
    .in('role', ['admin', 'exhibitor'])
    .order('updated_at', { ascending: false });

  if (privErr) {
    console.error('profiles 조회 실패:', privErr);
    process.exit(1);
  }

  const rows = (privileged || []) as Profile[];
  if (rows.length === 0) {
    console.log('권한 승격된 계정 없음.');
    return;
  }

  // 2) 승인/역할변경 관련 activity_logs (대상 ID 기준)
  const { data: logs, error: logErr } = await supabase
    .from('activity_logs')
    .select('actor_id, target_id, action, created_at')
    .in(
      'target_id',
      rows.map((r) => r.id)
    )
    .in('action', ['user_role_changed', 'exhibitor_approved', 'artist_approved', 'user_promoted']);

  if (logErr) {
    console.error('activity_logs 조회 실패:', logErr);
    process.exit(1);
  }

  const approvedIds = new Set<string>();
  for (const entry of (logs || []) as LogRow[]) {
    if (entry.target_id) approvedIds.add(entry.target_id);
  }

  // 3) 권한을 갖고 있으나 승인 이력이 없는 계정
  const suspicious = rows.filter((row) => row.role === 'admin' || !approvedIds.has(row.id));

  console.log(`총 권한 계정: ${rows.length}`);
  console.log(`승인 이력 누락 의심 계정: ${suspicious.length}`);
  console.log('');

  for (const row of suspicious) {
    const hasApprovalLog = approvedIds.has(row.id);
    console.log(
      [
        `id=${row.id}`,
        `role=${row.role}`,
        `status=${row.status}`,
        `email=${row.email ?? '-'}`,
        `name=${row.name ?? '-'}`,
        `updated_at=${row.updated_at ?? '-'}`,
        `approval_log=${hasApprovalLog ? 'yes' : 'MISSING'}`,
      ].join(' | ')
    );
  }

  console.log('');
  console.log('admin 계정 전체와 activity_logs 누락 목록을 사람이 1차 검토하세요.');
  console.log('정식 운영자는 승인 로그가 남지 않은 초기 시드일 수 있으므로 날짜/이메일 대조 필요.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
