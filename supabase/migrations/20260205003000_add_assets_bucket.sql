-- Assets bucket for news thumbnails and misc static assets
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Public read for assets
drop policy if exists "Public Access Assets" on storage.objects;
create policy "Public Access Assets" on storage.objects
  for select using (bucket_id = 'assets');

-- Admin-only write for assets
drop policy if exists "Admins manage assets" on storage.objects;
create policy "Admins manage assets" on storage.objects
  for all
  using (
    bucket_id = 'assets' and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    bucket_id = 'assets' and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Reload cache
NOTIFY pgrst, 'reload';
