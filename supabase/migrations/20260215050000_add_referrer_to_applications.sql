-- Add referrer field to artist_applications table
-- Optional field for tracking who referred the artist

ALTER TABLE public.artist_applications
ADD COLUMN IF NOT EXISTS referrer text;

COMMENT ON COLUMN public.artist_applications.referrer IS 'Optional: Name or contact info of the person who referred this artist';
