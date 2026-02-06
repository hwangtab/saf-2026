-- Admin activity logs table
create table if not exists public.admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text, -- 'user', 'artwork', 'artist', 'content'
  target_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- Index for faster queries
create index if not exists idx_admin_logs_created_at on public.admin_logs(created_at desc);
create index if not exists idx_admin_logs_admin_id on public.admin_logs(admin_id);
create index if not exists idx_admin_logs_target_type on public.admin_logs(target_type);

-- Enable RLS
alter table public.admin_logs enable row level security;

-- Only admins can view logs
create policy "admins_can_view_logs" on public.admin_logs
  for select using (get_my_role() = 'admin');

-- Only admins can insert logs
create policy "admins_can_insert_logs" on public.admin_logs
  for insert with check (get_my_role() = 'admin');

-- Comment
comment on table public.admin_logs is 'Admin activity audit logs';
