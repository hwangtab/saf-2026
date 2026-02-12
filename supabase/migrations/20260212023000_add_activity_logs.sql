create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('admin', 'artist', 'system')),
  actor_name text,
  actor_email text,

  action text not null,
  target_type text not null,
  target_id text not null,

  summary text,
  metadata jsonb,
  before_snapshot jsonb,
  after_snapshot jsonb,

  request_id text,
  reversible boolean not null default false,
  reverted_by uuid,
  reverted_at timestamptz,
  revert_reason text,
  reverted_log_id uuid,

  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);
create index if not exists idx_activity_logs_actor on public.activity_logs(actor_role, actor_id, created_at desc);
create index if not exists idx_activity_logs_action on public.activity_logs(action, created_at desc);
create index if not exists idx_activity_logs_target on public.activity_logs(target_type, target_id, created_at desc);
create index if not exists idx_activity_logs_reversible on public.activity_logs(reversible, created_at desc);
create index if not exists idx_activity_logs_metadata_gin on public.activity_logs using gin(metadata);

alter table public.activity_logs enable row level security;

drop policy if exists "admins_can_view_activity_logs" on public.activity_logs;
create policy "admins_can_view_activity_logs" on public.activity_logs
  for select using (get_my_role() = 'admin');

drop policy if exists "admins_can_insert_activity_logs" on public.activity_logs;
create policy "admins_can_insert_activity_logs" on public.activity_logs
  for insert with check (get_my_role() = 'admin');

drop policy if exists "artists_can_insert_own_activity_logs" on public.activity_logs;
create policy "artists_can_insert_own_activity_logs" on public.activity_logs
  for insert with check (
    get_my_role() = 'artist'
    and actor_role = 'artist'
    and actor_id = auth.uid()
  );

grant select, insert, update on table public.activity_logs to authenticated;

comment on table public.activity_logs is 'Unified audit logs for admin/artist activity with rollback metadata';
