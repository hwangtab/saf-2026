-- Create exhibitor_applications table for exhibitor onboarding
-- Similar structure to artist_applications

create table if not exists public.exhibitor_applications (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  representative_name text not null,  -- 대표명 (개인명 또는 단체명)
  contact text not null,              -- 연락처
  bio text not null,                  -- 자기소개/단체 소개
  referrer text,                      -- 추천인 (선택)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.exhibitor_applications enable row level security;

-- Policy: Users can manage their own application
drop policy if exists "Users manage own exhibitor application" on public.exhibitor_applications;
create policy "Users manage own exhibitor application" on public.exhibitor_applications
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Policy: Admins can manage all applications
drop policy if exists "Admins manage all exhibitor applications" on public.exhibitor_applications;
create policy "Admins manage all exhibitor applications" on public.exhibitor_applications
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Grant permissions
grant all on table public.exhibitor_applications to authenticated;

comment on table public.exhibitor_applications is 'Exhibitor onboarding applications (galleries, curators, collectors, etc.)';
comment on column public.exhibitor_applications.representative_name is 'Representative name (individual name or organization name)';
comment on column public.exhibitor_applications.referrer is 'Optional: Name or contact info of the person who referred this exhibitor';
