create table if not exists public.artist_applications (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  artist_name text not null,
  contact text not null,
  bio text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.artist_applications enable row level security;

drop policy if exists "Users manage own application" on public.artist_applications;
create policy "Users manage own application" on public.artist_applications
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Admins manage all applications" on public.artist_applications;
create policy "Admins manage all applications" on public.artist_applications
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant all on table public.artist_applications to authenticated;
