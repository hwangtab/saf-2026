-- Update RLS policies to align with roles and ownership

-- Profiles: restrict access to self or admin
alter table public.profiles enable row level security;

drop policy if exists "Public viewable profiles" on public.profiles;
drop policy if exists "Profiles select own or admin" on public.profiles;
drop policy if exists "Profiles update own or admin" on public.profiles;

create policy "Profiles select own or admin" on public.profiles
  for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Profiles update own or admin" on public.profiles
  for update
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Artists: public read, owners/admin manage
alter table public.artists enable row level security;

drop policy if exists "Public viewable artists" on public.artists;
drop policy if exists "Artists insert own" on public.artists;
drop policy if exists "Artists update own" on public.artists;
drop policy if exists "Artists delete own" on public.artists;

create policy "Public viewable artists" on public.artists
  for select using (true);

create policy "Artists insert own" on public.artists
  for insert
  with check (
    (user_id = auth.uid() and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'artist'
    ))
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Artists update own" on public.artists
  for update
  using (
    (user_id = auth.uid() and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'artist'
    ))
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    (user_id = auth.uid() and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'artist'
    ))
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Artists delete own" on public.artists
  for delete
  using (
    (user_id = auth.uid() and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'artist'
    ))
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Artworks: public read (not hidden), owners/admin manage
alter table public.artworks enable row level security;

drop policy if exists "Public viewable artworks" on public.artworks;
drop policy if exists "Artists insert own artworks" on public.artworks;
drop policy if exists "Artists update own artworks" on public.artworks;
drop policy if exists "Artists delete own artworks" on public.artworks;

create policy "Public viewable artworks" on public.artworks
  for select using (not is_hidden);

create policy "Artists insert own artworks" on public.artworks
  for insert
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.user_id
      where a.id = artworks.artist_id
        and p.id = auth.uid()
        and p.role = 'artist'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Artists update own artworks" on public.artworks
  for update
  using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.user_id
      where a.id = artworks.artist_id
        and p.id = auth.uid()
        and p.role = 'artist'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.user_id
      where a.id = artworks.artist_id
        and p.id = auth.uid()
        and p.role = 'artist'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Artists delete own artworks" on public.artworks
  for delete
  using (
    exists (
      select 1
      from public.artists a
      join public.profiles p on p.id = a.user_id
      where a.id = artworks.artist_id
        and p.id = auth.uid()
        and p.role = 'artist'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Storage policies
-- Artworks bucket
DROP POLICY IF EXISTS "Public Access Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Insert Artworks" ON storage.objects;
DROP POLICY IF EXISTS "Artists insert artwork objects" ON storage.objects;
DROP POLICY IF EXISTS "Artists update artwork objects" ON storage.objects;
DROP POLICY IF EXISTS "Artists delete artwork objects" ON storage.objects;

create policy "Public Access Artworks" on storage.objects
  for select using (bucket_id = 'artworks');

create policy "Artists insert artwork objects" on storage.objects
  for insert
  with check (
    bucket_id = 'artworks' and (
      exists (
        select 1
        from public.artists a
        join public.profiles p on p.id = a.user_id
        where a.id::text = (storage.foldername(name))[1]
          and p.id = auth.uid()
          and p.role = 'artist'
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

create policy "Artists update artwork objects" on storage.objects
  for update
  using (
    bucket_id = 'artworks' and (
      exists (
        select 1
        from public.artists a
        join public.profiles p on p.id = a.user_id
        where a.id::text = (storage.foldername(name))[1]
          and p.id = auth.uid()
          and p.role = 'artist'
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  )
  with check (
    bucket_id = 'artworks' and (
      exists (
        select 1
        from public.artists a
        join public.profiles p on p.id = a.user_id
        where a.id::text = (storage.foldername(name))[1]
          and p.id = auth.uid()
          and p.role = 'artist'
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

create policy "Artists delete artwork objects" on storage.objects
  for delete
  using (
    bucket_id = 'artworks' and (
      exists (
        select 1
        from public.artists a
        join public.profiles p on p.id = a.user_id
        where a.id::text = (storage.foldername(name))[1]
          and p.id = auth.uid()
          and p.role = 'artist'
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

-- Profiles bucket
DROP POLICY IF EXISTS "Public Access Profiles" ON storage.objects;
DROP POLICY IF EXISTS "Users insert profile objects" ON storage.objects;
DROP POLICY IF EXISTS "Users update profile objects" ON storage.objects;
DROP POLICY IF EXISTS "Users delete profile objects" ON storage.objects;

create policy "Public Access Profiles" on storage.objects
  for select using (bucket_id = 'profiles');

create policy "Users insert profile objects" on storage.objects
  for insert
  with check (
    bucket_id = 'profiles' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

create policy "Users update profile objects" on storage.objects
  for update
  using (
    bucket_id = 'profiles' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  )
  with check (
    bucket_id = 'profiles' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

create policy "Users delete profile objects" on storage.objects
  for delete
  using (
    bucket_id = 'profiles' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );
