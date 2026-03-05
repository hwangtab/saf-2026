alter table public.artist_applications
  add column if not exists privacy_version text,
  add column if not exists privacy_accepted_at timestamptz;

alter table public.exhibitor_applications
  add column if not exists privacy_version text,
  add column if not exists privacy_accepted_at timestamptz;

comment on column public.artist_applications.privacy_version is 'Accepted privacy policy version';
comment on column public.artist_applications.privacy_accepted_at is 'Timestamp when privacy policy was accepted';
comment on column public.exhibitor_applications.privacy_version is 'Accepted privacy policy version';
comment on column public.exhibitor_applications.privacy_accepted_at is 'Timestamp when privacy policy was accepted';
