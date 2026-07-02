-- 트랜잭션 이메일 발송 로그 (실패 가시성·재발송 추적용). sms_logs와 대칭.
-- 배경: notifyEmail/sendBuyerEmail은 never-throw + console.error만이라 실패가 어디에도 안 남아
--   "어떤 이메일이 실패했는지" 모르고 재발송도 불가였음. 이 테이블이 그 공백을 메운다.
create table if not exists public.email_logs (
  id                  uuid primary key default gen_random_uuid(),
  order_no            text,
  to_email            text not null,
  type                text not null,           -- BuyerEmailType(payment_confirmed 등) 또는 'artist_approval'
  subject             text,
  provider            text not null default 'resend',
  provider_message_id text,
  status              text not null,           -- 'sent' | 'failed'
  error               text,
  created_at          timestamptz not null default now()
);

create index if not exists email_logs_order_no_idx on public.email_logs (order_no);
create index if not exists email_logs_created_at_idx on public.email_logs (created_at desc);
create index if not exists email_logs_status_idx on public.email_logs (status);

alter table public.email_logs enable row level security;

-- 관리자만 조회. 쓰기는 service-role(서버)만 — service-role은 RLS 우회하므로 insert 정책 불요.
create policy "admins_can_view_email_logs" on public.email_logs
  for select using (get_my_role() = 'admin');

comment on table public.email_logs is '트랜잭션 이메일 발송 로그(실패 가시성·재발송)';
