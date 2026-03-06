ALTER TABLE public.artist_applications
  ADD COLUMN IF NOT EXISTS tos_version text,
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz;

ALTER TABLE public.exhibitor_applications
  ADD COLUMN IF NOT EXISTS tos_version text,
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz;
