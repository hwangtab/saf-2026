-- Stories (매거진) table for blog-style content
create table public.stories (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  title_en text,
  category text not null default 'artist-story'
    check (category in ('artist-story', 'buying-guide', 'art-knowledge')),
  excerpt text,
  excerpt_en text,
  body text not null default '',
  body_en text,
  thumbnail text,
  author text,
  published_at date not null default current_date,
  updated_at timestamptz default now(),
  is_published boolean default false,
  display_order integer default 0,
  tags text[] default array[]::text[],
  created_at timestamptz default now()
);

alter table public.stories enable row level security;

create policy "Published stories viewable by everyone"
  on public.stories for select
  using (is_published = true);

create policy "Admins manage stories"
  on public.stories for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

create index idx_stories_slug on public.stories(slug);
create index idx_stories_category on public.stories(category);
create index idx_stories_published_at on public.stories(published_at desc);
