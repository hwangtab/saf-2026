-- Grant usage on schema public to roles
grant usage on schema public to anon, authenticated;

-- Grant select on all current tables to anon and authenticated
grant select on all tables in schema public to anon, authenticated;

-- Alter default privileges for future tables
alter default privileges in schema public grant select on tables to anon, authenticated;

-- Ensure RLS is enabled and policies exist for visibility
-- Artworks
do $$ begin
    alter table public.artworks enable row level security;
exception when others then null; end $$;
drop policy if exists "Public viewable artworks" on public.artworks;
create policy "Public viewable artworks" on public.artworks for select using (not is_hidden);

-- Artists
do $$ begin
    alter table public.artists enable row level security;
exception when others then null; end $$;
drop policy if exists "Public viewable artists" on public.artists;
create policy "Public viewable artists" on public.artists for select using (true);

-- FAQ
do $$ begin
    alter table public.faq enable row level security;
exception when others then null; end $$;
drop policy if exists "Public viewable faq" on public.faq;
create policy "Public viewable faq" on public.faq for select using (true);

-- Testimonials
do $$ begin
    alter table public.testimonials enable row level security;
exception when others then null; end $$;
drop policy if exists "Public viewable testimonials" on public.testimonials;
create policy "Public viewable testimonials" on public.testimonials for select using (true);

-- News
do $$ begin
    alter table public.news enable row level security;
exception when others then null; end $$;
drop policy if exists "Public viewable news" on public.news;
create policy "Public viewable news" on public.news for select using (true);

-- Videos
do $$ begin
    alter table public.videos enable row level security;
exception when others then null; end $$;
drop policy if exists "Public viewable videos" on public.videos;
create policy "Public viewable videos" on public.videos for select using (true);

-- Profiles
do $$ begin
    alter table public.profiles enable row level security;
exception when others then null; end $$;
drop policy if exists "Public viewable profiles" on public.profiles;
create policy "Public viewable profiles" on public.profiles for select using (true);

-- Add unique constraints for idempotency in migration
alter table public.artworks add constraint artworks_artist_id_title_key unique (artist_id, title);
alter table public.faq add constraint faq_question_key unique (question);
