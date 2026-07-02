-- 작가 월별 정산 지급 기록. 행 존재 = 해당 (작가, 월) 지급 완료.
-- gross_amount/artist_share는 지급 시점 스냅샷(이후 매출 void에도 불변). email_logs RLS 패턴 미러.
create table if not exists public.artist_settlements (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.artists(id) on delete cascade,
  period_month  date not null,
  gross_amount  numeric not null,
  artist_share  numeric not null,
  paid_amount   numeric,
  paid_at       timestamptz not null default now(),
  note          text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create unique index if not exists artist_settlements_artist_month_uniq
  on public.artist_settlements (artist_id, period_month);
create index if not exists artist_settlements_period_idx
  on public.artist_settlements (period_month desc);

alter table public.artist_settlements enable row level security;

drop policy if exists "admins_can_view_artist_settlements" on public.artist_settlements;
create policy "admins_can_view_artist_settlements" on public.artist_settlements
  for select using (get_my_role() = 'admin');

comment on table public.artist_settlements is '작가 월별 정산 지급 기록(gross 50% 스냅샷 + 실지급액)';
