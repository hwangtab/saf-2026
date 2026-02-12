-- Force wipe public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Restore standard permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Enable necessary extensions
create extension if not exists "uuid-ossp" schema public;

-- Create Enums
create type public.user_role as enum ('admin', 'artist', 'user');
create type public.user_status as enum ('pending', 'active', 'suspended');
create type public.artwork_status as enum ('available', 'sold', 'reserved', 'hidden');

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  role public.user_role default 'user',
  status public.user_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Artists table
create table public.artists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  name_ko text not null,
  name_en text,
  bio text,
  history text, -- Exhibition history, awards, etc.
  profile_image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Artworks table
create table public.artworks (
  id uuid default gen_random_uuid() primary key,
  artist_id uuid references public.artists(id) on delete cascade not null,
  title text not null,
  description text,
  size text,
  material text,
  year text,
  edition text,
  price text default '₩0', -- Maintaining string format from local files
  status public.artwork_status default 'available',
  sold_at timestamptz,
  is_hidden boolean default false,
  images text[] default '{}',
  shop_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- News
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

-- FAQ
create table public.faq (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- Testimonials
create table public.testimonials (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  quote text not null,
  author text not null,
  context text,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- Videos
create table public.videos (
  id text primary key,
  title text not null,
  description text,
  youtube_id text not null,
  thumbnail text,
  transcript text,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.artworks enable row level security;
alter table public.news enable row level security;
alter table public.faq enable row level security;
alter table public.testimonials enable row level security;
alter table public.videos enable row level security;

-- Policies
create policy "Public viewable profiles" on public.profiles for select using (true);
create policy "Public viewable artists" on public.artists for select using (true);
create policy "Public viewable artworks" on public.artworks for select using (true);
create policy "Public viewable news" on public.news for select using (true);
create policy "Public viewable faq" on public.faq for select using (true);
create policy "Public viewable testimonials" on public.testimonials for select using (true);
create policy "Public viewable videos" on public.videos for select using (true);

-- Admin policies (Simplified)
create policy "Admins manage all news" on public.news for all using (true);
create policy "Admins manage all faq" on public.faq for all using (true);
create policy "Admins manage all testimonials" on public.testimonials for all using (true);
create policy "Admins manage all videos" on public.videos for all using (true);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper function for SQL execution (for admin tasks)
create or replace function public.execute_sql(sql text) returns void as $$
begin
  execute sql;
end;
$$ language plpgsql security definer;

-- Storage Buckets Setup
insert into storage.buckets (id, name, public) 
values ('artworks', 'artworks', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) 
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access Artworks" ON storage.objects;
create policy "Public Access Artworks" on storage.objects for select using ( bucket_id = 'artworks' );

DROP POLICY IF EXISTS "Auth Users Insert Artworks" ON storage.objects;
create policy "Auth Users Insert Artworks" on storage.objects for insert with check ( bucket_id = 'artworks' and auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Public Access Profiles" ON storage.objects;
create policy "Public Access Profiles" on storage.objects for select using ( bucket_id = 'profiles' );
