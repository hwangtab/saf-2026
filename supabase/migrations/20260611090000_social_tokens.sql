-- 소셜 미디어(Instagram/Threads) 장기 액세스 토큰 저장.
-- cron이 주기적으로 갱신(60일 만료 방지)하고, 어댑터는 DB 토큰을 우선 사용(없으면 env fallback).
-- cafe24_tokens 패턴 미러 — service_role만 접근(토큰은 시크릿이라 admin select 정책 없음).
create table if not exists public.social_tokens (
  platform     text primary key check (platform in ('instagram', 'threads')),
  access_token text not null,
  token_type   text,
  expires_at   timestamptz,
  refreshed_at timestamptz not null default now(),
  raw_response jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.social_tokens enable row level security;

-- service_role는 RLS 우회하지만 명시적 grant로 동작을 예측 가능하게(cafe24_tokens와 동일).
grant select, insert, update, delete on public.social_tokens to service_role;

comment on table public.social_tokens is '소셜 미디어 장기 액세스 토큰 — cron 자동 갱신(60일 만료 방지), 어댑터 DB-first 조회';
