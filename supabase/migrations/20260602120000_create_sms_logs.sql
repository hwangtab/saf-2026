-- 구매자 트랜잭션 SMS 발송 로그 (건당 과금·민원 추적용)
create table if not exists public.sms_logs (
  id                  uuid primary key default gen_random_uuid(),
  order_no            text,
  to_phone            text not null,
  type                text not null,           -- BuyerSmsType (payment_confirmed 등)
  provider            text not null default 'solapi',
  provider_message_id text,
  status              text not null,           -- 'sent' | 'failed'
  segment             text,                    -- 'SMS' | 'LMS' | 'MMS'
  error               text,
  created_at          timestamptz not null default now()
);

create index if not exists sms_logs_order_no_idx on public.sms_logs (order_no);
create index if not exists sms_logs_created_at_idx on public.sms_logs (created_at desc);

alter table public.sms_logs enable row level security;

-- 관리자만 조회. 쓰기는 service-role(서버)만 — service-role은 RLS 우회하므로 insert 정책 불요.
create policy "admins_can_view_sms_logs" on public.sms_logs
  for select using (get_my_role() = 'admin');

comment on table public.sms_logs is '구매자 트랜잭션 SMS 발송 로그';
