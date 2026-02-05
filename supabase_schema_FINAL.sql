-- 기존 테이블 초기화 (선택사항: 데이터가 모두 지워집니다)
DROP TABLE IF EXISTS public.artworks CASCADE;
DROP TABLE IF EXISTS public.artists CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.faq CASCADE;
DROP TABLE IF EXISTS public.testimonials CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create Enums (이미 존재하면 에러가 날 수 있으니 exception 처리하거나 무시)
do $$ begin
    create type user_role as enum ('admin', 'artist', 'user');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type user_status as enum ('pending', 'approved', 'rejected');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type artwork_status as enum ('available', 'reserved', 'sold');
exception
    when duplicate_object then null;
end $$;

-- Create Profiles Table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  role user_role default 'user'::user_role,
  status user_status default 'pending'::user_status,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using ( true );
create policy "Users can update own profile" on public.profiles for update using ( auth.uid() = id );

-- Create Artists Table
create table public.artists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  name_ko text not null,
  name_en text,
  profile_image text,
  bio text,
  history text,
  contact_email text,
  instagram text,
  homepage text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.artists enable row level security;
create policy "Artists are viewable by everyone" on public.artists for select using ( true );
create policy "Admins can manage artists" on public.artists for all using ( exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin') );

-- Create Artworks Table
create table public.artworks (
  id uuid default gen_random_uuid() primary key,
  artist_id uuid references public.artists(id) on delete cascade not null,
  title text not null,
  description text,
  size text,
  material text,
  year text,
  edition text,
  price integer default 0,
  status artwork_status default 'available'::artwork_status,
  is_hidden boolean default false,
  images text[] default array[]::text[],
  shop_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.artworks enable row level security;
create policy "Visible artworks are viewable by everyone" on public.artworks for select using ( is_hidden = false );
create policy "Admins can manage all artworks" on public.artworks for all using ( exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin') );

-- Create Content Tables
create table public.news (
  id text primary key,
  title text not null,
  source text,
  date date,
  link text,
  thumbnail text,
  description text,
  created_at timestamptz default now()
);
alter table public.news enable row level security;
create policy "News viewable by everyone" on public.news for select using (true);
create policy "Admins manage news" on public.news for all using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create table public.faq (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  display_order integer default 0,
  created_at timestamptz default now()
);
alter table public.faq enable row level security;
create policy "FAQ viewable by everyone" on public.faq for select using (true);

create table public.testimonials (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  quote text not null,
  author text not null,
  context text,
  display_order integer default 0,
  created_at timestamptz default now()
);
alter table public.testimonials enable row level security;
create policy "Testimonials viewable by everyone" on public.testimonials for select using (true);

create table public.videos (
  id text primary key,
  title text not null,
  description text,
  youtube_id text not null,
  thumbnail text,
  transcript text,
  created_at timestamptz default now()
);
alter table public.videos enable row level security;
create policy "Videos viewable by everyone" on public.videos for select using (true);

-- Storage Buckets (이미 있으면 무시됨)
insert into storage.buckets (id, name, public) values ('artworks', 'artworks', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('profiles', 'profiles', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('assets', 'assets', true) on conflict (id) do nothing;

create policy "Public Access Artworks" on storage.objects for select using ( bucket_id = 'artworks' );
create policy "Auth Users Insert Artworks" on storage.objects for insert with check ( bucket_id = 'artworks' and auth.role() = 'authenticated' );
