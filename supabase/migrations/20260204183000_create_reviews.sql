-- Create reviews table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  author text not null,
  role text,
  rating numeric not null,
  comment text not null,
  date date not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.reviews enable row level security;

-- Policies
DROP POLICY IF EXISTS "Public viewable reviews" ON public.reviews;
create policy "Public viewable reviews" on public.reviews for select using (true);

-- Grant permissions
grant select on table public.reviews to anon, authenticated;
