-- cron_runs: internal cron 실행 이력 기록.
-- 목적: "cron이 아예 안 도는 상태"(CRON_SECRET 회전 실수·vercel.json 배포 사고 등)를 감지.
--   과거 사고: 2026-05-11 잘못된 헤더 검증으로 7일+ 동안 모든 cron이 조용히 실패.
--   각 스케줄 cron이 실행 완료 시 1행 insert → 알림벨 fetchSystemHealth가
--   "N분 이상 미실행"(row 부재) 또는 "최근 실행 실패"(ok=false)를 danger로 surfacing.
-- 접근: service_role 클라이언트만 write/read. RLS 활성 + 정책 없음 = anon/authenticated deny.

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  ok boolean not null default false,
  status integer,
  summary jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists cron_runs_name_started_idx
  on public.cron_runs (name, started_at desc);

alter table public.cron_runs enable row level security;
