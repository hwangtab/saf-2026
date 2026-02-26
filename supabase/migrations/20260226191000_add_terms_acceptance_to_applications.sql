alter table public.artist_applications
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_accepted_ip text,
  add column if not exists terms_accepted_user_agent text;

alter table public.exhibitor_applications
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_accepted_ip text,
  add column if not exists terms_accepted_user_agent text;

comment on column public.artist_applications.terms_version is 'Accepted artist onboarding terms version';
comment on column public.artist_applications.terms_accepted_at is 'Timestamp when artist onboarding terms were accepted';
comment on column public.artist_applications.terms_accepted_ip is 'Client IP captured at artist terms acceptance';
comment on column public.artist_applications.terms_accepted_user_agent is 'User-Agent captured at artist terms acceptance';

comment on column public.exhibitor_applications.terms_version is 'Accepted exhibitor onboarding terms version';
comment on column public.exhibitor_applications.terms_accepted_at is 'Timestamp when exhibitor onboarding terms were accepted';
comment on column public.exhibitor_applications.terms_accepted_ip is 'Client IP captured at exhibitor terms acceptance';
comment on column public.exhibitor_applications.terms_accepted_user_agent is 'User-Agent captured at exhibitor terms acceptance';
